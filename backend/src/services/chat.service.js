/**
 * Chat: the one code path that authorises, persists and broadcasts messages.
 *
 * REST (routes/chat.routes.js) and the socket `send_message` handler (kept for
 * the mobile client) both call sendMessage(), so a message is validated and
 * stored exactly once, sender_id / sender_name always come from the database
 * row of the authenticated user, and only the server ever emits to a room.
 *
 * Channels:
 *   venture  { ventureId: <n> }        members of that venture + global users
 *   global   { ventureId: 'global' }   all internal staff (not clients)
 *   dm       { receiverId: <n> }       internal <-> internal, same venture or one side global
 * Clients (L9) have no internal chat at all.
 */
const { pool } = require('../config/database');
const { toId, canUseVentureChannel, canDirectMessage, ventureRoom, dmRoom } = require('../utils/scope');

const MAX_LENGTH = 4000;

class ChatError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Turn untrusted { ventureId | receiverId } into a validated channel.
 * Throws ChatError (400/403). Returns { kind, ventureId?, receiverId? }.
 */
const resolveChannel = async (scope, { ventureId, receiverId }) => {
  if (scope.isClient) throw new ChatError(403, 'Chat is not available for client accounts');
  const hasVenture = ventureId !== undefined && ventureId !== null && ventureId !== '';
  const hasReceiver = receiverId !== undefined && receiverId !== null && receiverId !== '';
  if (hasVenture === hasReceiver) throw new ChatError(400, 'Provide exactly one of ventureId or receiverId');

  if (hasVenture) {
    if (!canUseVentureChannel(scope, ventureId)) throw new ChatError(403, 'You cannot use this channel');
    return ventureId === 'global' ? { kind: 'global' } : { kind: 'venture', ventureId: toId(ventureId) };
  }
  const other = toId(receiverId);
  if (!other || !(await canDirectMessage(scope, other))) throw new ChatError(403, 'You cannot message this user');
  return { kind: 'dm', receiverId: other };
};

const MESSAGE_SELECT = `
  SELECT m.id, m.sender_id, m.receiver_id, m.venture_id, m.content, m.created_at,
         u.full_name AS sender_name, v.name AS venture_name
  FROM messages m
  JOIN users u ON m.sender_id = u.id
  LEFT JOIN ventures v ON m.venture_id = v.id`;

/** Wire format shared by REST and sockets: `ventureId` is the channel key the clients route on. */
const toWire = (row) => ({
  ...row,
  ...(row.receiver_id == null ? { ventureId: row.venture_id == null ? 'global' : row.venture_id } : {}),
});

/** Messages of a channel, oldest first, newest 100. */
const listMessages = async (scope, query) => {
  const ch = await resolveChannel(scope, query);
  const params = [];
  let where;
  if (ch.kind === 'dm') {
    params.push(scope.userId, ch.receiverId);
    where = 'm.receiver_id IS NOT NULL AND ((m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1))';
  } else if (ch.kind === 'global') {
    where = 'm.venture_id IS NULL AND m.receiver_id IS NULL';
  } else {
    params.push(ch.ventureId);
    where = 'm.venture_id = $1 AND m.receiver_id IS NULL';
  }
  const [rows] = await pool.query(
    `SELECT * FROM (${MESSAGE_SELECT} WHERE ${where} ORDER BY m.created_at DESC, m.id DESC LIMIT 100) recent ORDER BY created_at ASC, id ASC`,
    params
  );
  return rows.map(toWire);
};

/** Validate, persist once, broadcast from the server. Returns the stored message. */
const sendMessage = async (io, scope, { content, ventureId, receiverId }) => {
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text) throw new ChatError(400, 'Content required');
  if (text.length > MAX_LENGTH) throw new ChatError(400, `Message is too long (max ${MAX_LENGTH} characters)`);
  const ch = await resolveChannel(scope, { ventureId, receiverId });

  const [result] = await pool.query(
    'INSERT INTO messages (sender_id, receiver_id, venture_id, content) VALUES (?, ?, ?, ?) RETURNING id',
    [scope.userId, ch.kind === 'dm' ? ch.receiverId : null, ch.kind === 'venture' ? ch.ventureId : null, text]
  );
  const [rows] = await pool.query(`${MESSAGE_SELECT} WHERE m.id = $1`, [result.insertId]);
  const message = toWire(rows[0]);

  if (io) {
    if (ch.kind === 'dm') io.to(dmRoom(ch.receiverId)).to(dmRoom(scope.userId)).emit('receive_message', message);
    else io.to(ventureRoom(ch.kind === 'global' ? 'global' : ch.ventureId)).emit('receive_message', message);
  }
  return message;
};

/** Channels the caller may open (drives the sidebar and the socket auto-join). */
const listChannels = async (scope) => {
  if (scope.isClient) return { global: false, ventures: [] };
  const params = [];
  const [ventures] = await pool.query(
    `SELECT id, name, slug, primary_color AS color FROM ventures v
     WHERE v.is_active = TRUE AND ${scope.global ? 'TRUE' : `v.id = $${params.push(scope.ventureId == null ? 0 : scope.ventureId)}`}
     ORDER BY v.id`,
    params
  );
  return { global: true, ventures };
};

module.exports = { ChatError, resolveChannel, listMessages, sendMessage, listChannels, toWire };
