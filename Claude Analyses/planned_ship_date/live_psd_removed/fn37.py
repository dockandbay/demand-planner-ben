def order_import(order_data):
    # Faire already imports via the Faire channel. Shopify sends source_name "Faire"
    # into channel_segment - ignore so no lines/party/reservation get created.
    if (order_data.get("channel_segment") or "").strip().lower() == "faire":
        order_data["status"] = "ignored"
        order_data["comment"] = "Faire order - imported through the Faire channel, not Shopify"
        return order_data

    NET_TERM_NAMES = {"30": "Net 30", "60": "Net 60", "90": "Net 90"}

    def split_tags(raw):
        if not raw:
            return []
        text = raw if isinstance(raw, str) else str(raw)
        result = []
        for segment in text.split(","):
            one_tag = segment.strip()
            if one_tag != "":
                result.append(one_tag)
        return result

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

    # Future Ship Date: prefer the order metafield (global.future_ship_date - covers 47/47
    # orders in the last 90 days), fall back to the flattened note-attribute key (covers
    # the remaining 0 metafield-less orders as a safety net). Both are DD/MM/YYYY, EU
    # store, sometimes with a trailing newline. Must convert to ISO by hand - Fulfil's own
    # dateutil-based parser reads DD/MM as MM/DD and gets it wrong.
    channel_metafields = metadata.get("metafields") or {}
    raw_value = channel_metafields.get("global.future_ship_date") or metadata.get("Future Ship Date")
    ship_date_iso = None
    if raw_value:
        raw_value = str(raw_value).strip()
        parts = raw_value.split("/")
        if len(parts) == 3:
            day_part = parts[0]
            month_part = parts[1]
            year_part = parts[2]
            ship_date_iso = year_part + "-" + month_part.zfill(2) + "-" + day_part.zfill(2)

    if ship_date_iso:
        order_data["shipping_start_date"] = ship_date_iso
        for line in order_data.get("sale_lines", []):
            line["shipping_date"] = ship_date_iso

    return order_data