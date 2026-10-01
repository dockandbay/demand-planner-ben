-- 249_filter_rules.sql — reusable, saveable "filter rules" (SKU selectors) for the demand plan + later Complex Rules.
-- See Claude Analyses/SPEC_FILTER_RULES_ENGINE.md. Deliberately jsonb-first: the whole rule body (match_mode,
-- show_subcats, conditions[]) lives in `definition`, so new condition types / operators need NO schema change.
-- Mirrors planner.buy_complex_rules (name + injected global + GET/POST/delete endpoints). Global (no owner) for now.
BEGIN;

CREATE TABLE IF NOT EXISTS planner.filter_rules (
  id          bigserial   PRIMARY KEY,
  name        text        NOT NULL,
  enabled     boolean     NOT NULL DEFAULT true,
  definition  jsonb       NOT NULL DEFAULT '{}'::jsonb,   -- { match_mode:'and', show_subcats:bool, conditions:[{field,op,value,severity?}] }
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMIT;
