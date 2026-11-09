/**
 * Handle on the Socket.IO server for code that has no request (services).
 * socket.js registers the server once at boot; revokeAllSessionsForUser() calls
 * disconnectUser() so a revoked, deactivated, moved or password-changed account
 * loses its open sockets immediately instead of at the next reconnect.
 */
let io = null;

const userRoom = (userId) => `user_${userId}`;
const tokenRoom = (tokenHash) => `tok_${tokenHash}`;
const setIo = (server) => { io = server; };

const disconnectUser = (userId) => {
  if (io) io.in(userRoom(userId)).disconnectSockets(true);
};

const disconnectToken = (tokenHash) => {
  if (io) io.in(tokenRoom(tokenHash)).disconnectSockets(true);
};

module.exports = { tokenRoom, disconnectToken, setIo, userRoom, disconnectUser };
