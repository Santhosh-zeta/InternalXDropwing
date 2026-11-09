/** Per-user daily message and token caps (table assistant_usage, survives conversation deletion). */
const { pool } = require('../../config/database');
const { config } = require('./client');

const today = async (userId) => {
  const [rows] = await pool.query(
    'SELECT messages, input_tokens, output_tokens FROM assistant_usage WHERE user_id = $1 AND day = CURRENT_DATE',
    [userId]
  );
  const r = rows[0] || { messages: 0, input_tokens: 0, output_tokens: 0 };
  return { messages: Number(r.messages), tokens: Number(r.input_tokens) + Number(r.output_tokens) };
};

/** { ok, reason, used, remainingTokens } — checked before a chat request opens. */
const checkCaps = async (userId) => {
  const cfg = config();
  const used = await today(userId);
  if (used.messages >= cfg.dailyMessageCap) {
    return { ok: false, reason: `Daily message limit reached (${cfg.dailyMessageCap}). It resets tomorrow.`, used };
  }
  if (used.tokens >= cfg.dailyTokenCap) {
    return { ok: false, reason: 'Daily usage limit reached. It resets tomorrow.', used };
  }
  return { ok: true, used, remainingTokens: cfg.dailyTokenCap - used.tokens };
};

const record = async (userId, { messages = 0, input = 0, output = 0 }) => {
  await pool.query(
    `INSERT INTO assistant_usage (user_id, day, messages, input_tokens, output_tokens)
     VALUES ($1, CURRENT_DATE, $2, $3, $4)
     ON CONFLICT (user_id, day) DO UPDATE SET messages = assistant_usage.messages + EXCLUDED.messages,
       input_tokens = assistant_usage.input_tokens + EXCLUDED.input_tokens,
       output_tokens = assistant_usage.output_tokens + EXCLUDED.output_tokens`,
    [userId, messages, input, output]
  );
};

module.exports = { checkCaps, record, today };
