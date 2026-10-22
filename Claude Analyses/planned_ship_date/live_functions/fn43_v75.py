def order_import(order_data):
    AU_GST_RATES = [
        (0.10, "AU 10% GST - Income"),
        (0.00, "AU No GST - Income"),
    ]
    TAX_CODE_BY_RATE_NAME = {
        "AU 10% GST - Income": "1",
    }
    RATE_TOLERANCE = 0.015

    def match_au_tax_name(rate):
        for target_rate, name in AU_GST_RATES:
            if abs(rate - target_rate) <= RATE_TOLERANCE:
                return name
        return None

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
                    continue
                rate = float(amount) / base
            else:
                rate = float(rate)
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