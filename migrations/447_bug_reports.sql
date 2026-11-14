-- 447_bug_reports.sql (v28.819, Ben 14-Nov-26)
-- Bug reports live in the Suggestion Box table (planner.suggestions) with kind = 'bug' and their own
-- BUG-0001 numbering. A bug carries up to 3 screenshots (private Supabase Storage paths, never bytes) and the
-- context the browser captured when it was raised: page, open popup, filters, version, user, browser, recent
-- errors and failed API calls, and the records shown in the popup.
-- Safe to re-run.

alter table planner.suggestions add column if not exists kind        text not null default 'suggestion';   -- suggestion | bug
alter table planner.suggestions add column if not exists severity    text;                                  -- bug only: blocking | annoying | cosmetic
alter table planner.suggestions add column if not exists expected    text;                                  -- bug only: what they expected to happen
alter table planner.suggestions add column if not exists screenshots jsonb not null default '[]'::jsonb;    -- [{path, w, h, bytes}]
alter table planner.suggestions add column if not exists context     jsonb;                                 -- captured page context (see above)

create sequence if not exists planner.bugs_ref_seq;

create index if not exists suggestions_kind_idx on planner.suggestions (kind);
