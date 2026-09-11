-- 212: persist the last 3PL stock-report import per market (INVENTORY ▸ Manage 3PL).
-- Stores who/when + the parsed report (sku → on-hand/available) so the panel shows the last import
-- ("X days old, last imported ben@ on dd-mmm-yy hh:mm") and re-compares against live products on view.
CREATE TABLE IF NOT EXISTS planner.inventory_3pl_imports (
  market      text PRIMARY KEY,          -- US | UK | AU | EU
  imported_by text,
  imported_at timestamptz DEFAULT now(),
  report      jsonb                       -- { "<sku>": [on_hand, available], ... }
);
