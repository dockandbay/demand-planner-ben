def order_import(order_data):
    # --- Tax mapping: channel tax description -> Fulfil tax (same logic as function 42) ---
    #   "2" -> tax 3  UK 20% (VAT on Income)
    #   "1" -> tax 1  5% UK VAT on income
    TAX_CODE_BY_DESCRIPTION = {
        "uk 20% (vat on income)": "2",
        "5% uk vat on income": "1",
        "gb - tax": "2",
        "shippingtax": "2",
        "giftwraptax": "2",
        "tax": "2",
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
    RATE_TOLERANCE = 0.015

    def match_uk_tax_name(rate):
        for target_rate, name in UK_VAT_RATES:
            if abs(rate - target_rate) <= RATE_TOLERANCE:
                return name
        return None

    def resolve_tax_code(name_key, rate):
        code = TAX_CODE_BY_DESCRIPTION.get(name_key)
        if code is None:
            return None
        if name_key == "tax":
            # Amazon's generic "Tax" is 20% on most lines, 5% on a few.
            if rate is None:
                return code
            if abs(rate - 0.05) <= RATE_TOLERANCE:
                return "1"
            if abs(rate - 0.20) <= RATE_TOLERANCE:
                return "2"
            return None
        return code

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
            tax_line['code'] = TAX_CODE_BY_RATE_NAME.get(matched_name)

    exceptions = order_data.setdefault('exceptions', [])

    for line in order_data.get('sale_lines', []) or []:
        apply_uk_tax(line, exceptions, f"line {line.get('sku') or line.get('channel_identifier') or '?'}")

    for line in order_data.get('shipping_lines', []) or []:
        apply_uk_tax(line, exceptions, "shipping line")

    return order_data