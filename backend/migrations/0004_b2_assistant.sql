-- "Ask InternalX" assistant: conversations are private to their owner.
-- assistant_usage is separate from the messages so deleting a conversation
-- never resets a user's daily cap.
CREATE TABLE IF NOT EXISTS assistant_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assistant_conv_user ON assistant_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS assistant_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  -- Anthropic content blocks, replayed verbatim on the next turn.
  content JSONB NOT NULL,
  -- Plain text shown in the UI (NULL for tool_result turns).
  text TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assistant_msg_conv ON assistant_messages(conversation_id, id);

CREATE TABLE IF NOT EXISTS assistant_usage (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  messages INTEGER NOT NULL DEFAULT 0,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
