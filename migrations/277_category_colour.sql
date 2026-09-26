-- 277: per-category display colour for the PRODUCT module (Ben 16-Sep-2026).
-- Auto-assigned by the server from a fixed bright palette (server.mjs CAT_PALETTE / ensureCategoryColours) the first
-- time a category is read without one; editable in PRODUCT ▸ Config ▸ Categories. Additive, idempotent, no backfill
-- needed (the server fills nulls on first read, so n8n-added categories get a colour automatically).
ALTER TABLE planner.categories ADD COLUMN IF NOT EXISTS colour_hex text;
