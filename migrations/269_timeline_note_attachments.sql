-- v27.571: photos / documents on the PO, shipment and sample timelines (admin + supplier portal).
-- supplier_notes already had attachment_id; shipment_notes and sample_notes get the same nullable pointer into
-- planner.portal_attachments (files are stored there with category 'timeline', po = the timeline's ref). Additive, re-runnable.
ALTER TABLE planner.shipment_notes ADD COLUMN IF NOT EXISTS attachment_id bigint;
ALTER TABLE planner.sample_notes   ADD COLUMN IF NOT EXISTS attachment_id bigint;
