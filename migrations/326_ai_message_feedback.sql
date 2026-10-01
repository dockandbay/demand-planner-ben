-- 326_ai_message_feedback.sql  (v28.139, Ben) — 👍 / 👎 on Ask Claude answers, for feedback analysis of the feature.
-- One row per rated assistant message (re-rating updates it; clearing the thumb deletes it). The question + answer are
-- SNAPSHOTTED here and there is deliberately NO foreign key to ai_messages / ai_conversations, so a user deleting a
-- conversation does not erase the feedback history. Additive only (new table). Safe to re-run.
CREATE TABLE IF NOT EXISTS planner.ai_message_feedback (
  message_id      bigint PRIMARY KEY,                     -- planner.ai_messages.id of the rated ASSISTANT message
  conversation_id bigint,
  user_email      text NOT NULL,
  rating          smallint NOT NULL CHECK (rating IN (-1, 1)),   -- 1 = thumbs up, -1 = thumbs down
  comment         text,                                   -- optional "what was wrong / what was good"
  reason          text,                                   -- 👎 quick reason: wrong_numbers | not_answered | missing_info | unclear | other
  question        text,                                   -- the user message it answered (snapshot, trimmed)
  answer          text,                                   -- the assistant answer (snapshot, trimmed)
  model           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_message_feedback_created_idx ON planner.ai_message_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_message_feedback_rating_idx ON planner.ai_message_feedback (rating, created_at DESC);
-- v28.141: reason column (for environments that created the table before it was added)
ALTER TABLE planner.ai_message_feedback ADD COLUMN IF NOT EXISTS reason text;
