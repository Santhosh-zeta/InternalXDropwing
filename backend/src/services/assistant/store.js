/**
 * Conversation storage. Every query is keyed on the owner's user id taken from
 * the authenticated scope, so a conversation id from the client can never reach
 * another user's rows.
 */
const { pool } = require('../../config/database');
const { pgPool } = require('../../config/database.pg');
const { toId } = require('../../utils/scope');

const listConversations = async (userId) => {
  const [rows] = await pool.query(
    `SELECT id, title, updated_at FROM assistant_conversations WHERE user_id = $1 ORDER BY updated_at DESC, id DESC LIMIT 50`,
    [userId]
  );
  return rows;
};

/** Own conversation row or null. */
const getConversation = async (userId, id) => {
  const cid = toId(id);
  if (!cid) return null;
  const [rows] = await pool.query(
    'SELECT id, title, updated_at FROM assistant_conversations WHERE id = $1 AND user_id = $2',
    [cid, userId]
  );
  return rows[0] || null;
};

const createConversation = async (userId, title) => {
  // The pool wrapper returns an insert header (insertId = RETURNING id) for non-SELECTs.
  const [header] = await pool.query(
    'INSERT INTO assistant_conversations (user_id, title) VALUES ($1, $2) RETURNING id',
    [userId, String(title || 'New conversation').slice(0, 80)]
  );
  const [conv] = await pool.query('SELECT id, title, updated_at FROM assistant_conversations WHERE id = $1', [header.insertId]);
  return conv[0];
};

const deleteConversation = async (userId, id) => {
  const cid = toId(id);
  if (!cid) return false;
  const [res] = await pool.query('DELETE FROM assistant_conversations WHERE id = $1 AND user_id = $2', [cid, userId]);
  return res.affectedRows > 0;
};

/** What the UI shows: text turns, plus the tools each assistant turn looked up. */
const uiMessages = async (conversationId) => {
  const [rows] = await pool.query(
    'SELECT id, role, content, text, created_at FROM assistant_messages WHERE conversation_id = $1 ORDER BY id',
    [conversationId]
  );
  return rows
    .map((r) => ({
      id: r.id,
      role: r.role,
      text: r.text || '',
      tools: r.role === 'assistant' && Array.isArray(r.content)
        ? r.content.filter((b) => b && b.type === 'tool_use').map((b) => b.name)
        : [],
      created_at: r.created_at,
    }))
    .filter((m) => m.text || m.tools.length);
};

/**
 * Append rows [{ role, content, text, inputTokens, outputTokens }] atomically
 * (an assistant tool_use turn and its tool_result turn are saved together, so
 * an aborted request can never leave a dangling tool_use behind).
 */
const append = async (conversationId, rows) => {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    for (const r of rows) {
      await client.query(
        `INSERT INTO assistant_messages (conversation_id, role, content, text, input_tokens, output_tokens)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6)`,
        [conversationId, r.role, JSON.stringify(r.content), r.text || null, r.inputTokens || 0, r.outputTokens || 0]
      );
    }
    await client.query('UPDATE assistant_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [conversationId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const isUserText = (row) =>
  row.role === 'user' && Array.isArray(row.content) && row.content.some((b) => b && b.type === 'text');

/**
 * Model-ready history: the last `limit` rows, starting at a user text turn,
 * without thinking blocks from earlier turns (only the turn in flight replays
 * its own), and without a dangling trailing tool_use.
 */
const loadHistory = async (conversationId, limit) => {
  const [rows] = await pool.query(
    `SELECT role, content FROM (
       SELECT id, role, content FROM assistant_messages WHERE conversation_id = $1 ORDER BY id DESC LIMIT ${Math.max(2, limit | 0)}
     ) recent ORDER BY id`,
    [conversationId]
  );
  const start = rows.findIndex(isUserText);
  if (start === -1) return [];
  let out = rows.slice(start).map((r) => ({
    role: r.role,
    content: r.role === 'assistant'
      ? r.content.filter((b) => b && b.type !== 'thinking' && b.type !== 'redacted_thinking')
      : r.content,
  })).filter((m) => m.content.length > 0);
  // A tool_use must be answered by the next message; drop an unanswered tail.
  const last = out[out.length - 1];
  if (last && last.role === 'assistant' && last.content.some((b) => b.type === 'tool_use')) out = out.slice(0, -1);
  return out;
};

module.exports = { listConversations, getConversation, createConversation, deleteConversation, uiMessages, append, loadHistory };
