-- 448_bug_notify.sql (Ben 14-Nov-26)
-- "i want you to trigger when a bug is input not on schedule": when a bug (planner.suggestions kind='bug') is inserted,
-- Postgres sends NOTIFY hz_bug '<BUG-nnnn>'. Ben's Claude Code session LISTENs on it (read-only role planner_ro over the
-- session pooler) and picks the bug up straight away. The read-only role also gets SELECT on planner.suggestions so the
-- listener can read the bug and catch any that arrived while it was not connected.
-- Safe to re-run. No data changes.

create or replace function planner.suggestions_bug_notify() returns trigger language plpgsql as $$
begin
  if new.kind = 'bug' and new.ref is not null then
    perform pg_notify('hz_bug', new.ref);
  end if;
  return new;
end $$;

drop trigger if exists suggestions_bug_notify on planner.suggestions;
create trigger suggestions_bug_notify after insert on planner.suggestions
  for each row execute function planner.suggestions_bug_notify();

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'planner_ro') then
    execute 'grant usage on schema planner to planner_ro';
    execute 'grant select on planner.suggestions to planner_ro';
  end if;
end $$;
