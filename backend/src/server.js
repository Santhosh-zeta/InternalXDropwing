require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const taskRoutes = require('./routes/task.routes');
const { testConnection } = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const { startSessionCleanup } = require('./services/session.service');

const app = express();

// Security & Middleware
app.set('trust proxy', 1);

/**
 * Content-Security-Policy for the Next.js static export served from
 * public/frontend-build.
 *
 * This is NOT a nonce-based policy. A nonce has to be minted per request and
 * stamped onto every <script>/<style> tag by the server rendering the page;
 * this server only serves a pre-built, static `out/` export via
 * express.static, so there is no per-request template to inject a nonce into
 * without changing how the frontend builds (out of scope here — see
 * frontend/**). Given that constraint, this is the strictest policy that
 * still lets the shipped bundle run:
 *
 *   - script-src needs 'unsafe-inline': Next's App Router streams page data
 *     into the HTML as inline `<script>self.__next_f.push(...)</script>`
 *     blocks (verified in frontend/out/index.html) — hydration fails without
 *     them, and there is no build-time hash list stable enough to allowlist
 *     instead, since the payload differs per page and per rebuild.
 *   - script-src also allows https://accounts.google.com: @react-oauth/google
 *     (used for the "Continue with Google" button) injects a
 *     <script src="https://accounts.google.com/gsi/client"> tag at runtime
 *     (frontend/node_modules/@react-oauth/google/dist/index.js).
 *   - style-src needs 'unsafe-inline' for the same reason plus inline
 *     `style="..."` attributes React/framer-motion render directly onto
 *     elements — those are set at runtime (motion animates style properties
 *     every frame) so no static hash can cover them.
 *   - img-src allows https://*.googleusercontent.com: Google login stores the
 *     account's photo URL as-is (backend/src/controllers/auth.controller.js,
 *     googleLogin) and the client paints it directly, not through our own
 *     /uploads path.
 *   - connect-src/frame-src allow https://accounts.google.com: the GSI script
 *     calls out to Google and renders its prompt in an iframe.
 *
 * What this still buys over `contentSecurityPolicy: false` (the prior state):
 * no inline event handlers (onclick=...) execute, no <object>/<embed> plugin
 * content, the page cannot be framed by another origin, forms cannot submit
 * to another origin, a <base> tag cannot be planted to redirect relative
 * URLs, and — the big one given script-src is loose — an XSS payload cannot
 * exfiltrate data or load a payload from any host we have not explicitly
 * named here, because connect-src/script-src/img-src are not '*'.
 */
const scriptSrc = ["'self'", "'unsafe-inline'", 'https://accounts.google.com'];
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc,
  scriptSrcAttr: ["'none'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https://*.googleusercontent.com'],
  fontSrc: ["'self'"],
  connectSrc: ["'self'", 'https://accounts.google.com'],
  frameSrc: ['https://accounts.google.com'],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'self'"],
};
if (process.env.NODE_ENV === 'production') {
  cspDirectives.upgradeInsecureRequests = [];
}

app.use(helmet({
  contentSecurityPolicy: {
    // helmet merges provided directives into its own default set unless told
    // not to — with useDefaults left on, style-src and font-src silently
    // gained a bare "https:" (any HTTPS host at all) from helmet's defaults,
    // which is far looser than anything documented above. useDefaults:false
    // makes cspDirectives the whole policy, exactly as written.
    useDefaults: false,
    directives: cspDirectives,
  },
}));
app.use(morgan('dev'));
app.use(cookieParser());

// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.hostname}${req.url}`);
  }
  next();
});

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
// /api/auth keeps its own dedicated limiters (rateLimit.middleware.js) sized
// for anonymous credential/OTP endpoints, so it is mounted before the global
// one below rather than stacking two limiters on the same unauthenticated
// requests.
app.use('/api/auth', authRoutes);

/**
 * Global limiter for the rest of the authenticated API surface, so an
 * endpoint that never got its own specific limiter (there are ~20 route
 * files) is still bounded. Keyed per-user where possible — see
 * rateLimit.middleware.js for why IP-only keying would lock out a shared
 * office connection.
 */
app.use('/api', apiLimiter);

app.use('/api/team-members', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', require('./routes/project.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/platform-metrics', require('./routes/analytics.routes'));
app.use('/api/action-logs', require('./routes/audit.routes'));
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/timesheets', require('./routes/timesheet.routes'));
app.use('/api/invoices', require('./routes/invoice.routes'));
app.use('/api/access-control', require('./routes/access_control.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/budget', require('./routes/budget.routes'));
app.use('/api/kpis', require('./routes/kpis.routes'));
app.use('/api/client-portal', require('./routes/client_portal.routes'));
app.use('/api/learning', require('./routes/learning.routes'));
app.use('/api/database', require('./routes/database.routes'));
app.use('/api/strategy', require('./routes/strategy.routes'));
app.use('/api/role-management', require('./routes/role_management.routes'));

// Serve uploads directory
const path = require('path');

/**
 * Uploaded documents are no longer served by a bare express.static mount —
 * that let anyone with (or guessing) a URL read any company document with no
 * login at all. routes/uploads.routes.js requires a session and re-applies
 * the same venture-visibility check as GET /api/documents, on the same
 * /uploads/<name> URL shape the web client already builds, so this is not a
 * breaking change for clients that were already using the documents feature —
 * only anonymous/direct access is what stops working.
 *
 * Mounted before the avatars static handler below so a request for
 * /uploads/avatars/<name> still falls through to it (this router 404s on
 * filenames it has no `documents` row for, rather than swallowing the path).
 */
app.use('/uploads', require('./routes/uploads.routes'));

/**
 * Avatars stay publicly readable, deliberately, and unauthenticated:
 *   - they are rendered directly (as CSS background-image / <img>-equivalent)
 *     in the web client without ever attaching an Authorization header, so
 *     gating them would require a frontend change to fetch-and-blob every
 *     avatar — out of scope here (frontend/** is owned by another agent) and
 *     would break avatar rendering today if done unilaterally on this side;
 *   - a profile photo is materially lower sensitivity than the documents in
 *     the vault, and Google-login avatars already point at a public
 *     https://*.googleusercontent.com URL, so uploaded avatars are not
 *     protecting anything the account doesn't already expose;
 *   - the stored filename is unguessable (16 random bytes, see
 *     middleware/upload.middleware.js), so this is "public if you already
 *     have the exact URL", not "public and enumerable".
 */
app.use('/uploads/avatars', express.static(path.join(__dirname, '../uploads/avatars')));

// Serve frontend build
app.use(express.static(path.join(__dirname, '../public/frontend-build'), { extensions: ['html'] }));

// Redirect /index.html to / to prevent Next.js router from rendering a blank page
app.get('/index.html', (req, res) => res.redirect(301, '/'));

/**
 * Health check.
 *
 * Used to unconditionally report "ok", which is exactly the failure mode a
 * health check exists to prevent: an orchestrator or uptime monitor would
 * see green while the database was completely unreachable and every
 * DB-backed request was 500ing. It now actually asks Postgres, so a real
 * outage shows up here as 503 instead of hiding behind a healthy-looking API
 * process.
 */
app.get('/api/health', async (req, res) => {
  try {
    await pgPool.query('SELECT 1');
    res.json({ status: 'ok', message: 'InternalX API is running', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', message: 'API is running but the database is unreachable', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// SPA Fallback for frontend
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return next();
  }
  
  const fs = require('fs');
  const indexPath = path.join(__dirname, '../public/frontend-build/index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send(`
      <html>
        <head><title>Service Unavailable</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>Frontend is currently building or not deployed yet.</h1>
          <p>Please try again later. If you are the administrator, ensure the frontend build is located in <code>public/frontend-build</code>.</p>
        </body>
      </html>
    `);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;

const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);

const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { pgPool } = require('./config/database.pg');
const { isSessionActive } = require('./services/session.service');

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }
});

/**
 * JWT authentication middleware for Socket.IO.
 *
 * Three ways a caller can prove who they are, tried in order:
 *   1. `auth.token` on the handshake — what the mobile app sends, since it
 *      holds the JWT itself in flutter_secure_storage.
 *   2. An `Authorization: Bearer` header — the same shape the REST API
 *      accepts, kept for any non-browser client.
 *   3. The `internalx_token` cookie on the raw handshake request — what the
 *      web client relies on. The web app never holds the JWT in JS at all
 *      (see frontend/src/lib/api.ts): it's an `httpOnly` cookie the browser
 *      sends automatically, on the WebSocket upgrade request exactly as it
 *      would on any other same-origin request, which the `cookie` header
 *      here is parsed out of the same way `authenticate()` does for REST.
 */
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token ||
                  socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                  cookie.parse(socket.handshake.headers?.cookie || '').internalx_token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Same revocation check as the REST authenticate() middleware, so a
    // logged-out token cannot keep an open chat connection alive — see
    // middleware/auth.middleware.js for the reasoning and the fail-open
    // behaviour if the sessions table itself is unreachable.
    try {
      const active = await isSessionActive(token);
      if (!active) return next(new Error('Invalid token'));
    } catch (err) {
      if (err.code !== '42P01') return next(new Error('Invalid token'));
      console.error('sessions table is missing — session revocation is NOT in effect for sockets.');
    }

    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
  });

  socket.on('send_message', async (data) => {
    const senderId = socket.user.id;
    const payload = { ...data, sender_id: senderId };

    // If it's a venture message, send to the venture room
    if (data.ventureId) {
      const room = data.ventureId === 'global' ? 'global' : `venture_${data.ventureId}`;
      io.to(room).emit('receive_message', payload);
    }
    // If it's a DM, send to both the sender and receiver's rooms
    else if (data.receiverId) {
      io.to(`dm_${data.receiverId}`).emit('receive_message', payload);
      io.to(`dm_${senderId}`).emit('receive_message', payload);
    }

    // Persist message to database
    try {
      await pgPool.query(
        'INSERT INTO messages (sender_id, content, venture_id, receiver_id, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
        [senderId, data.content, data.ventureId || null, data.receiverId || null]
      );
    } catch (dbErr) {
      console.error('Failed to persist message:', dbErr.message);
    }
  });

  socket.on('disconnect', () => {});
});

/**
 * A promise that rejects with nothing listening for it, or a synchronous
 * throw nothing catches, used to just crash the process silently or with a
 * bare, unhelpful stack trace — the worst possible outcome for something
 * running unattended. Log it plainly and exit non-zero so whatever is
 * supervising the process (systemd, Docker, pm2) knows to restart it and
 * an operator has something to grep for.
 */
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection — exiting:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception — exiting:', err);
  process.exit(1);
});

/**
 * Graceful shutdown on SIGTERM/SIGINT (the signals a container orchestrator,
 * `systemctl stop`, or Ctrl-C send). Without this, the process is killed
 * mid-request — connections dropped, in-flight writes cut off — the moment
 * a deploy or restart is requested, rather than finishing what it was doing
 * first.
 */
let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — shutting down gracefully...`);

  // Stop accepting new connections and requests; existing ones finish first.
  io.close();
  server.close(async (err) => {
    if (err) console.error('Error while closing the HTTP server:', err.message);
    try {
      await pgPool.end();
      console.log('Database pool closed. Goodbye.');
      process.exit(err ? 1 : 0);
    } catch (poolErr) {
      console.error('Error while closing the database pool:', poolErr.message);
      process.exit(1);
    }
  });

  // A stuck connection or a slow client should not hang a deploy forever.
  setTimeout(() => {
    console.error('Graceful shutdown timed out after 10s — forcing exit.');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

const startServer = async () => {
  await testConnection();

  // Sweeps rows past their expires_at hourly — see session.service.js. Timer
  // is unref()'d there so it never blocks process shutdown.
  startSessionCleanup();

  server.listen(PORT, () => {
    console.log(`\n🚀 InternalX Backend running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  });
};

startServer();