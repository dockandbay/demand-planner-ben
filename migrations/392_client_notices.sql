-- 392_client_notices.sql (v28.506, Ben 27-Oct-26, idea from Liam): a notice board on the client portal Home page, so we can tell clients about
-- major developments ("SS27 imagery available 01-Dec-26", "4 weeks to the preorder deadline") instead of them asking sales@ / Mads.
-- Staff post in CLIENT > Notices; each post can be narrowed to markets / client types / named clients and optionally emailed. Additive.
CREATE TABLE IF NOT EXISTS planner.client_notices (
  id            bigserial PRIMARY KEY,
  title         text NOT NULL,
  body          text,
  link_url      text,
  link_label    text,
  key_date      date,                                   -- optional date the notice is about (deadline, availability)
  pinned        boolean NOT NULL DEFAULT false,
  audience      jsonb NOT NULL DEFAULT '{}'::jsonb,     -- {markets:[], types:[], client_ids:[]}; empty = every client; client_ids set = only those
  publish_at    timestamptz NOT NULL DEFAULT now(),
  expires_on    date,                                   -- hidden from clients after this day
  archived      boolean NOT NULL DEFAULT false,
  emailed_at    timestamptz,
  emailed_count integer,
  emailed_by    text,
  created_by    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_notices_live_ix ON planner.client_notices (archived, publish_at DESC);
-- one row per portal user per notice they have seen (drives the NEW tag and the Home badge)
CREATE TABLE IF NOT EXISTS planner.client_notice_reads (
  notice_id bigint  NOT NULL REFERENCES planner.client_notices(id) ON DELETE CASCADE,
  user_id   integer NOT NULL REFERENCES planner.client_users(id) ON DELETE CASCADE,
  read_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notice_id, user_id)
);
REVOKE ALL ON planner.client_notices FROM anon, authenticated;
REVOKE ALL ON planner.client_notice_reads FROM anon, authenticated;
