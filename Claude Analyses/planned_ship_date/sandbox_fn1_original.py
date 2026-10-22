def order_import(order_data):
    # Shopify line-item property (lower-cased key) -> Fulfil product option code
    # Dock & Bay has exactly one: "Personalisation".
    # NOTE: the value on the right must match the option's CODE in Fulfil
    # (Product Options), which may be a slug rather than the display name.
    # Change "personalisation" below if Fulfil's code differs.
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

    return order_data