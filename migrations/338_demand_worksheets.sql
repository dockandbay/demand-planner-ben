-- 338_demand_worksheets.sql  (v28.216, Ben): saved worksheets for DEMAND ▸ Cross Market view (worksheet mode).
-- A worksheet is a named DRAFT of forecast edits (SKU x country x channel totals for a month range, plus sub-category
-- edits and the view filters). Nothing in it touches the forecast until someone applies it month by month.
-- Shared: every planner can open, update or delete any worksheet (Ben 08-Oct-26). Additive + idempotent; until applied
-- the worksheet routes return 503 and the rest of the view works.
CREATE TABLE IF NOT EXISTS planner.demand_worksheets (
  id          bigserial PRIMARY KEY,
  view        text        NOT NULL DEFAULT 'crossmarket',
  name        text        NOT NULL,
  payload     jsonb       NOT NULL DEFAULT '{}'::jsonb,   -- {from,to,cat,chips,follow,sku:{"SKU|CO|CH":units},sub:{"SUB|CO|CH":units}}
  n_changes   integer     NOT NULL DEFAULT 0,
  created_by  text,
  updated_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS demand_worksheets_view_upd_idx ON planner.demand_worksheets (view, updated_at DESC);
COMMENT ON TABLE planner.demand_worksheets IS 'DEMAND Cross Market view saved worksheets (shared drafts of forecast edits). v28.216';
