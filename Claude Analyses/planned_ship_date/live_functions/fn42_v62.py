def order_import(order_data):
    # --- Personalisation (Shopify line-item property -> Fulfil product option) ---
    PROPERTY_TO_OPTION = {
        "personalisation": "personalisation",
    }

    for line in order_data.get("sale_lines", []):
        metadata = line.get("metadata") or {}
        if not metadata:
            continue

        options = line.get("product_options") or []
        existing_codes = {o.get("code") for o in options}

        for key, value in metadata.items():
            code = PROPERTY_TO_OPTION.get(str(key).strip().lower())
            if not code or code in existing_codes or value in (None, ""):
                continue
            options.append({"code": code, "value": str(value)})
            existing_codes.add(code)

        if options:
            line["product_options"] = options

    # --- UK VAT tax mapping ---
    UK_VAT_RATES = [
        (0.20, "UK 20% (VAT on Income)"),
        (0.05, "5% UK VAT on income"),
        (0.00, "Zero Rated Income UK"),
    ]
    RATE_TOLERANCE = 0.015

    def match_uk_tax_name(rate):
        for target_rate, name in UK_VAT_RATES:
            if abs(rate - target_rate) <= RATE_TOLERANCE:
                return name
        return None

    def apply_uk_tax(line, exceptions, line_label):
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
                    continue
                rate = float(amount) / base
            else:
                rate = float(rate)
            matched_name = match_uk_tax_name(rate)
            if matched_name is None:
                exceptions.append({
                    'message': (
                        f"Could not match UK VAT rate for {line_label}: "
                        f"computed rate {rate:.4f} did not match 20%, 5%, or 0%. "
                        f"Tax left unmapped for manual review."
                    )
                })
                continue
            tax_line['name'] = matched_name
            tax_line['code'] = None

    exceptions = order_data.setdefault('exceptions', [])

    for line in order_data.get('sale_lines', []) or []:
        apply_uk_tax(line, exceptions, f"line {line.get('sku') or line.get('channel_identifier') or '?'}")

    for line in order_data.get('shipping_lines', []) or []:
        apply_uk_tax(line, exceptions, "shipping line")

    return order_data

