-- 160_quality_docs.sql
-- Quality Control documents: test reports, GRS transaction/scope certificates, inspection reports, etc.
-- Files are stored IN the database (bytea, like portal_attachments), uploaded by the supplier portal AND
-- by D&B admin. A doc maps flexibly to any of production no. / batch no. / PO — GRS certs typically span POs
-- (mapped to a batch), test reports usually to a PO. Surfaced in SUPPLY ▸ Quality Control.
CREATE TABLE IF NOT EXISTS planner.quality_docs (
  id            bigserial PRIMARY KEY,
  doc_type      text NOT NULL,        -- 'Test report' | 'GRS transaction certificate' | 'GRS scope certificate' | 'Inspection report' | 'Compliance certificate' | 'Material certificate' | 'Packaging spec' | 'Other'
  filename      text NOT NULL,
  mime          text,
  byte_size     integer,
  data          bytea NOT NULL,
  prod_no       text,
  batch_id      text,
  po            text,
  supplier_name text,
  uploaded_by   text,
  uploader_kind text,                 -- 'admin' | 'supplier'
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quality_docs_po_idx    ON planner.quality_docs (po);
CREATE INDEX IF NOT EXISTS quality_docs_prod_idx  ON planner.quality_docs (prod_no);
CREATE INDEX IF NOT EXISTS quality_docs_batch_idx ON planner.quality_docs (batch_id);
CREATE INDEX IF NOT EXISTS quality_docs_sup_idx   ON planner.quality_docs (lower(supplier_name));
CREATE INDEX IF NOT EXISTS quality_docs_created_idx ON planner.quality_docs (created_at DESC);
