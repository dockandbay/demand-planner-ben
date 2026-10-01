-- v27.570: a Customise-barcodes project can be linked to one or more purchase orders. The supplier of a linked PO
-- gets a "Download custom barcodes" button on that PO in the portal; the download prints ONLY the project's
-- custom numbers (per SKU, per ticked barcode type), for the PO's SKUs. Additive, safe to re-run.
ALTER TABLE planner.barcode_projects ADD COLUMN IF NOT EXISTS pos text[] NOT NULL DEFAULT '{}'::text[];
COMMENT ON COLUMN planner.barcode_projects.pos IS 'purchase order refs this override project applies to (portal: Download custom barcodes on those POs)';
CREATE INDEX IF NOT EXISTS barcode_projects_pos_gin ON planner.barcode_projects USING gin (pos);
