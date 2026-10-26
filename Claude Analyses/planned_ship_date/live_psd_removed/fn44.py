def order_import(order_data):
    # Faire already imports via the Faire channel. Shopify sends source_name "Faire"
    # into channel_segment - ignore so no lines/party/reservation get created.
    if (order_data.get("channel_segment") or "").strip().lower() == "faire":
        order_data["status"] = "ignored"
        order_data["comment"] = "Faire order - imported through the Faire channel, not Shopify"
        return order_data

    # ---------- Wholesale tags: agent code, payment terms, future ship date ----------
    NET_TERM_NAMES = {"30": "Net 30", "60": "Net 60", "90": "Net 90"}

    def split_tags(raw):
        if not raw:
            return []
        text = raw if isinstance(raw, str) else str(raw)
        return [t.strip() for t in text.split(",") if t.strip() != ""]

    metadata = order_data.get("metadata") or {}
    customer = order_data.get("customer") or {}

    order_tags = split_tags(metadata.get("tags"))
    customer_tags = split_tags(customer.get("tags") if isinstance(customer, dict) else None)

    agent_code = None
    term_name = None
    for tag in order_tags:
        lowered = tag.lower()
        if lowered.startswith("agent_") and agent_code is None:
            agent_code = tag[len("agent_"):].strip()
        elif lowered.startswith("net") and tag[len("net"):].isdigit():
            term_name = NET_TERM_NAMES.get(tag[len("net"):])

    if agent_code is None:
        for tag in customer_tags:
            if tag.lower().startswith("agent_"):
                agent_code = tag[len("agent_"):].strip()
                break

    if agent_code:
        metafields = list(order_data.get("metafields") or [])
        metafields.append({"code": "agent_code", "value": agent_code})
        order_data["metafields"] = metafields

    if term_name:
        order_data["payment_term"] = term_name

    # Future Ship Date arrives as DD/MM/YYYY. Convert to ISO by hand: Fulfil's own
    # parser reads DD/MM as MM/DD and gets it wrong.
    channel_metafields = metadata.get("metafields") or {}
    raw_value = channel_metafields.get("global.future_ship_date") or metadata.get("Future Ship Date")
    ship_date_iso = None
    if raw_value:
        parts = str(raw_value).strip().split("/")
        if len(parts) == 3:
            day_part = parts[0]
            month_part = parts[1]
            year_part = parts[2]
            ship_date_iso = year_part + "-" + month_part.zfill(2) + "-" + day_part.zfill(2)

    if ship_date_iso:
        order_data["shipping_start_date"] = ship_date_iso
        for line in order_data.get("sale_lines") or []:
            line["shipping_date"] = ship_date_iso

    # ---------- Tax mapping: channel tax description -> Fulfil tax (same logic as function 42) ----------
    #   "2" -> tax 3  UK 20% (VAT on Income)
    #   "1" -> tax 1  5% UK VAT on income
    TAX_CODE_BY_DESCRIPTION = {
        "uk 20% (vat on income)": "2",
        "gb vat": "2",
    }
    UK_VAT_RATES = [
        (0.20, "UK 20% (VAT on Income)"),
        (0.05, "5% UK VAT on income"),
        (0.00, "Zero Rated Income UK"),
    ]
    TAX_CODE_BY_RATE_NAME = {
        "UK 20% (VAT on Income)": "2",
        "5% UK VAT on income": "1",
        "Zero Rated Income UK": "4",
    }
    RATE_TOLERANCE = 0.015  # absorbs rounding on small-value lines

    def match_uk_tax_name(rate):
        for target_rate, name in UK_VAT_RATES:
            if abs(rate - target_rate) <= RATE_TOLERANCE:
                return name
        return None

    def apply_uk_tax(line, exceptions, line_label):
        tax_lines = line.get("tax_lines") or []
        if not tax_lines:
            return
        if line.get("unit_price") is not None and line.get("quantity") is not None:
            base = float(line["unit_price"]) * float(line["quantity"])
        else:
            base = float(line.get("amount") or 0)
        for tax_line in tax_lines:
            if tax_line.get("remitter") == "channel":
                continue
            rate = tax_line.get("rate")
            if rate is None:
                amount = tax_line.get("amount")
                if not amount or base <= 0:
                    rate = None
                else:
                    rate = float(amount) / base
            else:
                rate = float(rate)
            name_key = (tax_line.get("name") or "").strip().lower()
            code = TAX_CODE_BY_DESCRIPTION.get(name_key)
            if code:
                # Attach the Fulfil tax and keep the channel's description.
                tax_line["code"] = code
                continue
            if rate is None:
                continue
            matched_name = match_uk_tax_name(rate)
            if matched_name is None:
                exceptions.append({
                    "message": (
                        f"Could not match UK VAT rate for {line_label}: "
                        f"computed rate {rate:.4f} did not match 20%, 5%, or 0%. "
                        f"Tax left unmapped for manual review."
                    )
                })
                continue
            tax_line["name"] = matched_name
            tax_line["code"] = TAX_CODE_BY_RATE_NAME.get(matched_name)

    exceptions = order_data.setdefault("exceptions", [])

    for line in order_data.get("sale_lines") or []:
        apply_uk_tax(line, exceptions, f"line {line.get('sku') or line.get('channel_identifier') or '?'}")

    for line in order_data.get("shipping_lines") or []:
        apply_uk_tax(line, exceptions, "shipping line")

    return order_data