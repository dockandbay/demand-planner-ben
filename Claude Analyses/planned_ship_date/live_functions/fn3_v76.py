def order_import(order_data):
    # Shopify line-item property (lower-cased key) -> Fulfil product option code
    # Dock & Bay has exactly one: "Personalisation".
    # NOTE: the value on the right must match the option's CODE in Fulfil
    # (Product Options), which may be a slug rather than the display name.
    # Change "personalisation" below if Fulfil's code differs.
    PROPERTY_TO_OPTION = {
        "personalisation": "personalisation",
    }

    # Sale lines with a personalization option route to the embroidery warehouse.
    EMBROIDERY_WAREHOUSE_ID = 157

    for line in order_data.get("sale_lines", []):
        metadata = line.get("metadata") or {}
        if not metadata:
            continue

        options = line.get("product_options") or []
        existing_codes = {o.get("code") for o in options}
        has_option = bool(existing_codes & set(PROPERTY_TO_OPTION.values()))

        for key, value in metadata.items():
            code = PROPERTY_TO_OPTION.get(str(key).strip().lower())
            if not code or code in existing_codes or value in (None, ""):
                continue
            options.append({"code": code, "value": str(value)})
            existing_codes.add(code)
            has_option = True

        if options:
            line["product_options"] = options

        if has_option:
            line["warehouse"] = EMBROIDERY_WAREHOUSE_ID

    # --- Tax mapping: channel tax description -> Fulfil tax (same logic as function 42) ---
    #   "1" -> tax 2  AU 10% GST - Income   (AU company)
    TAX_CODE_BY_DESCRIPTION = {
        "au 10% gst - income": "1",
        "gst": "1",
    }
    AU_GST_RATES = [
        (0.10, "AU 10% GST - Income"),
        (0.00, "AU No GST - Income"),
    ]
    RATE_TOLERANCE = 0.015

    # Attach the Fulfil tax code when the rate fallback renames the tax,
    # instead of leaving the code empty and relying on name lookup only.
    TAX_CODE_BY_RATE_NAME = {
        "AU 10% GST - Income": "1",
    }

    def match_au_tax_name(rate):
        for target_rate, name in AU_GST_RATES:
            if abs(rate - target_rate) <= RATE_TOLERANCE:
                return name
        return None

    def resolve_tax_code(name_key, rate):
        code = TAX_CODE_BY_DESCRIPTION.get(name_key)
        if code is None:
            return None
        if rate is not None and rate <= RATE_TOLERANCE:
            # Zero-rated line - let the rate fallback name it
            # "AU No GST - Income" instead of attaching 10% GST.
            return None
        return code

    def apply_au_tax(line, exceptions, line_label):
        tax_lines = line.get('tax_lines') or []
        if not tax_lines:
            return
        if line.get('unit_price') is not None and line.get('quantity') is not None:
            base = float(line['unit_price']) * float(line['quantity'])
        else:
            base = float(line.get('amount') or 0)
        for tax_line in tax_lines:
            if tax_line.get('remitter') == 'channel':
                continue
            rate = tax_line.get('rate')
            if rate is None:
                amount = tax_line.get('amount')
                if not amount or base <= 0:
                    rate = None
                else:
                    rate = float(amount) / base
            else:
                rate = float(rate)
            name_key = (tax_line.get('name') or '').strip().lower()
            code = resolve_tax_code(name_key, rate)
            if code:
                # Attach the Fulfil tax and keep the channel's description.
                tax_line['code'] = code
                continue
            if rate is None:
                continue
            matched_name = match_au_tax_name(rate)
            if matched_name is None:
                exceptions.append({
                    'message': (
                        f"Could not match AU GST rate for {line_label}: "
                        f"computed rate {rate:.4f} did not match 10% or 0%. "
                        f"Tax left unmapped for manual review."
                    )
                })
                continue
            tax_line['name'] = matched_name
            tax_line['code'] = TAX_CODE_BY_RATE_NAME.get(matched_name)

    exceptions = order_data.setdefault('exceptions', [])

    for line in order_data.get('sale_lines', []) or []:
        apply_au_tax(line, exceptions, f"line {line.get('sku') or line.get('channel_identifier') or '?'}")

    for line in order_data.get('shipping_lines', []) or []:
        apply_au_tax(line, exceptions, "shipping line")

    return order_data