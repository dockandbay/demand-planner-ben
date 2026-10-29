-- 401_user_todos.sql (v28.580, Ben 29-Oct-26): a personal To do list per HORIZON user (top bar To do drawer + HOME). Each row belongs to
-- one signed-in email; only that person reads or changes it (the API scopes every query to the caller). Done items keep done_at and show
-- in the drawer's Done list until deleted. Additive.
CREATE TABLE IF NOT EXISTS planner.user_todos (
  id          bigserial PRIMARY KEY,
  email       text        NOT NULL,                -- owner, lower-case
  title       text        NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
  notes       text        CHECK (notes IS NULL OR length(notes) <= 2000),
  due_date    date,
  done_at     timestamptz,                         -- NULL = open
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_todos_email_idx ON planner.user_todos (email, done_at);
REVOKE ALL ON planner.user_todos FROM anon, authenticated;
