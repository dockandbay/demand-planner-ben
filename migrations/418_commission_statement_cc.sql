-- migration 418
-- v28.707 (Ben 05-Nov-26): commission statement email CC per agent (CLIENT > Clients > agent > Commission > Statement CC).
-- Comma separated addresses, copied on every statement email (draft and final) next to "Statement to".
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS statement_cc text;
