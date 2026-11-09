/**
 * Socket.IO wiring. The server is the only thing that emits chat messages
 * (services/chat.service.js); sockets only authenticate, join rooms the scope
 * allows, relay "typing" and (for the mobile client) forward send_message into
 * the same validated path REST uses.
 */
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { isSessionActive } = require('./services/session.service');
const { scopeFor, canJoinRoom, canUseVentureChannel, canDirectMessage, ventureRoom, dmRoom, toId } = require('./utils/scope');
const chat = require('./services/chat.service');

/**
 * JWT authentication middleware for Socket.IO.
 *
 * Three ways a caller can prove who they are, tried in order:
 *   1. `auth.token` on the handshake (mobile app).
 *   2. An `Authorization: Bearer` header.
 *   3. The `internalx_token` httpOnly cookie sent with the WebSocket upgrade (web client).
 * Same revocation check as REST authenticate(): a logged-out token cannot keep
 * a chat connection alive. The caller's scope is re-read from the database.
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token ||
                  socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                  cookie.parse(socket.handshake.headers?.cookie || '').internalx_token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    try {
      if (!(await isSessionActive(token))) return next(new Error('Invalid token'));
    } catch (err) {
      if (err.code !== '42P01') return next(new Error('Invalid token'));
      console.error('sessions table is missing - session revocation is NOT in effect for sockets.');
    }

    const scope = await scopeFor(decoded);
    if (!scope) return next(new Error('Invalid token'));
    socket.user = decoded;
    socket.userId = scope.userId;
    // Rooms the server puts this socket in. Resolved here, before the connection
    // is announced, so handlers (registered synchronously on connect) never race it.
    socket.autoRooms = [];
    if (!scope.isClient) {
      const channels = await chat.listChannels(scope);
      socket.autoRooms.push(dmRoom(scope.userId), ...(channels.global ? ['global'] : []), ...channels.ventures.map((v) => ventureRoom(v.id)));
    }
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
};

const ack = (cb, payload) => { if (typeof cb === 'function') cb(payload); };

module.exports = (io) => {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    // Always fetch scope fresh: the account may have been demoted since connect.
    const currentScope = () => scopeFor({ id: socket.userId });

    socket.join(socket.autoRooms); // clients: connected, but in no rooms and no chat

    socket.on('join_channel', async (arg, cb) => {
      try {
        const room = typeof arg === 'string' ? arg : arg && arg.channelId;
        const scope = await currentScope();
        if (!scope || !canJoinRoom(scope, room)) return ack(cb, { ok: false, message: 'Not allowed' });
        socket.join(room);
        ack(cb, { ok: true });
      } catch (err) { ack(cb, { ok: false }); }
    });

    socket.on('leave_channel', (arg) => {
      const room = typeof arg === 'string' ? arg : arg && arg.channelId;
      if (typeof room === 'string') socket.leave(room);
    });

    // Kept for the mobile client. Same validation, persistence and broadcast as REST.
    socket.on('send_message', async (data, cb) => {
      try {
        const scope = await currentScope();
        if (!scope) return ack(cb, { success: false, message: 'Not allowed' });
        const message = await chat.sendMessage(io, scope, {
          content: data && data.content, ventureId: data && data.ventureId, receiverId: data && data.receiverId,
        });
        ack(cb, { success: true, data: message });
      } catch (err) {
        if (!(err instanceof chat.ChatError)) console.error('socket send_message failed:', err.message);
        ack(cb, { success: false, message: err instanceof chat.ChatError ? err.message : 'Server error' });
      }
    });

    // Typing indicator: { ventureId } | { receiverId }, validated like a message, at most ~1/s.
    let lastTyping = 0;
    socket.on('typing', async (data) => {
      try {
        const now = Date.now();
        if (now - lastTyping < 1000) return;
        lastTyping = now;
        const scope = await currentScope();
        if (!scope || scope.isClient || !data || typeof data !== 'object') return;
        if (data.receiverId != null) {
          const other = toId(data.receiverId);
          if (other && await canDirectMessage(scope, other)) {
            io.to(dmRoom(other)).emit('user_typing', { userId: scope.userId, receiverId: other });
          }
        } else if (data.ventureId != null && canUseVentureChannel(scope, data.ventureId)) {
          socket.to(ventureRoom(data.ventureId)).emit('user_typing', { userId: scope.userId, ventureId: data.ventureId });
        }
      } catch (err) { /* typing is best-effort */ }
    });
  });
};
