-- v28.431 (Ben 21-Oct-26: custom / co-brand orders count in weekly B2B demand "if they have the agency tag in Fulfil"). Additive only.
-- agent_code: the order's Fulfil agent code (metafield agent_code, else an agent_* Shopify tag on the order); read for custom orders only.
-- agent_checked: whether that read has been done since the line last changed.
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS agent_code text;
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS agent_checked boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS order_lines_custom_unchecked_idx ON planner.order_lines (sale_id) WHERE is_custom AND NOT agent_checked;
