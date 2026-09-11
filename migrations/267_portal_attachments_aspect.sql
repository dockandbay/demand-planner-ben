-- v27.569: a product-sample upload can belong to one sampled component ("aspect") so the batch review page and the
-- Samples tab can list the files under the component's feedback box (by name), not only in the sample's photo strip.
-- Nullable; existing rows and portal uploads stay unassigned (strip only). Additive, safe to re-run.
ALTER TABLE planner.portal_attachments ADD COLUMN IF NOT EXISTS aspect text;
COMMENT ON COLUMN planner.portal_attachments.aspect IS 'product_sample uploads: sampled component key (legacy dimension or c<component id>) the file was attached to; null = whole sample';
