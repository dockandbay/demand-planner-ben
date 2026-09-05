-- 126_suggestions.sql — Suggestion Box
-- A lightweight, app-wide suggestion list. Users submit from the top-bar "💡 Suggestion box";
-- admins triage in CONFIG ▸ Suggestions. Each suggestion gets a stable human reference (SUG-0001)
-- so it can be quoted in chat to push for implementation.
--
-- Status workflow: new (default on submit) → complete | future | deferred.

create sequence if not exists planner.suggestions_ref_seq;

create table if not exists planner.suggestions (
  id          bigint generated always as identity primary key,
  ref         text unique not null default 'SUG-'||lpad(nextval('planner.suggestions_ref_seq')::text, 4, '0'),
  body        text not null,
  area        text,                                   -- optional: which part of the app it relates to
  created_by  text,                                   -- submitter email (from window.ME.email)
  created_at  timestamptz not null default now(),
  status      text not null default 'new',            -- new | complete | future | deferred
  status_by   text,                                   -- who last changed the status
  status_at   timestamptz
);

create index if not exists suggestions_status_idx on planner.suggestions (status);
create index if not exists suggestions_created_idx on planner.suggestions (created_at desc);
