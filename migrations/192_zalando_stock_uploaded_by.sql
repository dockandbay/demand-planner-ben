-- Track who uploaded the Zalando stock-on-hand snapshot (shown in the BUY & MOVE ▸ Zalando upload status).
ALTER TABLE planner.zalando_stock ADD COLUMN IF NOT EXISTS uploaded_by text;
