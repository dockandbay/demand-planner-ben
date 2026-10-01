-- v28.011 (Ben): "Ask Claude" global assistant — per-user conversations, messages and files.
-- Privacy: every row is keyed by user_email; the API only ever reads/writes the caller's own rows.
-- Additive only.

CREATE TABLE IF NOT EXISTS planner.ai_conversations (
  id           bigserial PRIMARY KEY,
  user_email   text NOT NULL,
  title        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_conversations_user_idx ON planner.ai_conversations (user_email, updated_at DESC);

CREATE TABLE IF NOT EXISTS planner.ai_messages (
  id              bigserial PRIMARY KEY,
  conversation_id bigint NOT NULL REFERENCES planner.ai_conversations(id) ON DELETE CASCADE,
  role            text NOT NULL,                       -- 'user' | 'assistant'
  content         text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_messages_conv_idx ON planner.ai_messages (conversation_id, id);

CREATE TABLE IF NOT EXISTS planner.ai_files (
  id              bigserial PRIMARY KEY,
  conversation_id bigint NOT NULL REFERENCES planner.ai_conversations(id) ON DELETE CASCADE,
  message_id      bigint REFERENCES planner.ai_messages(id) ON DELETE CASCADE,
  direction       text NOT NULL,                       -- 'in' (uploaded by user) | 'out' (returned by Claude)
  filename        text NOT NULL,
  mime            text,
  size            integer,
  content         bytea,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_files_conv_idx ON planner.ai_files (conversation_id, id);
