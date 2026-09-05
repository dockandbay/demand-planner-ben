-- 244_edi_projects.sql
-- Persist EDI-label uploads as named "projects" so users can come back to them.
-- edi_projects        = one named project (Dillards/EZY COM run).
-- edi_project_files   = the uploaded files (ASN CSV + SSCC label PDFs) stored as bytea, with uploader + timestamp.
-- Files cascade-delete with the project. Read/serve mirrors planner.quality_docs (bytea `data`).

CREATE TABLE IF NOT EXISTS planner.edi_projects (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner.edi_project_files (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id   bigint NOT NULL REFERENCES planner.edi_projects(id) ON DELETE CASCADE,
  kind         text NOT NULL,            -- 'csv' | 'pdf'
  filename     text NOT NULL,
  mime         text,
  byte_size    integer,
  data         bytea NOT NULL,
  uploaded_by  text,
  uploaded_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edi_project_files_project_idx ON planner.edi_project_files (project_id);
