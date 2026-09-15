-- 208: store the raw uploaded XLSX for the Xero Compare snapshot so it can be re-downloaded from the report.
-- The snapshot previously kept only the parsed rows; this adds the original file bytes (base64 text).
ALTER TABLE planner.xero_compare_snapshot ADD COLUMN IF NOT EXISTS file_b64 text;
