-- 337_fulfil_sales_agent_code.sql  (v28.204, Ben): the rep group an order belongs to.
-- Fulfil sales orders carry a metafield "Agent Code" (metafield.field code 'agent_code' on sale.sale), e.g. appelman,
-- harpergroup, ideco, patrick, TJ, roadrunners, harpers (135 orders on 07-Oct-26). The sales import copies it here so a
-- client portal rep group (CLIENT ▸ Clients & agents ▸ Access & visibility ▸ Agent Code) sees, and is paid commission on,
-- every order with its code. Additive + idempotent; until applied the import skips the column and the Agent Code mode
-- matches nothing.
ALTER TABLE planner.fulfil_sales ADD COLUMN IF NOT EXISTS agent_code text;
COMMENT ON COLUMN planner.fulfil_sales.agent_code IS 'Fulfil sale.sale metafield agent_code (rep group), as imported. v28.204';
CREATE INDEX IF NOT EXISTS fulfil_sales_agent_code_idx ON planner.fulfil_sales (lower(agent_code));
