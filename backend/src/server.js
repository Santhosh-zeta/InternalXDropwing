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
const { bootstrapAdmin } = require('./services/bootstrap');
const { assertConfig } = require('./config/env');

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
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/budget', require('./routes/budget.routes'));
app.use('/api/kpis', require('./routes/kpis.routes'));
app.use('/api/client-portal', require('./routes/client_portal.routes'));
app.use('/api/learning', require('./routes/learning.routes'));
app.use('/api/strategy', require('./routes/strategy.routes'));
app.use('/api/search', require('./routes/search.routes'));
app.use('/api/team-members', require('./routes/team_rate.routes')); // PUT /:id/rate

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
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err.stack);
  // Never echo internal error text (SQL, paths) to clients; 4xx messages from
  // body parsing and similar are safe and useful.
  res.status(status).json({
    success: false,
    message: status >= 500
      ? 'Internal server error'
      : (err.type === 'entity.parse.failed' ? 'Invalid request body' : (err.message || 'Bad request')),
  });
});

const PORT = process.env.PORT || 5000;

const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);

const { pgPool } = require('./config/database.pg');

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }
});

// Socket auth, room joins and typing live in socket.js; messages are only ever
// emitted by services/chat.service.js (REST POST /api/chat/messages) via app.get('io').
require('./socket')(io);
app.set('io', io);

/**
 * A promise that rejects with nothing listening for it, or a synchronous
 * throw nothing catches, used to just crash the process silently or with a
 * bare, unhelpful stack trace — the worst possible outcome for something
 * running unattended. Log it plainly and exit non-zero so whatever is
 * supervising the process (systemd, Docker, pm2) knows to restart it and
 * an operator has something to grep for.
 */
if (require.main === module) {
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection — exiting:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception — exiting:', err);
    process.exit(1);
  });
}

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

if (require.main === module) {
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

const startServer = async () => {
  try {
    assertConfig();
  } catch (err) {
    console.error(`\n${err.message}\n`);
    process.exit(1);
  }

  await testConnection();

  // Creates the first Super Admin from BOOTSTRAP_ADMIN_* if none exists. Logs
  // instead of throwing on misconfiguration so the server still comes up.
  try {
    await bootstrapAdmin();
  } catch (err) {
    console.error('[bootstrap] failed:', err.message);
  }

  // Sweeps rows past their expires_at hourly — see session.service.js. Timer
  // is unref()'d there so it never blocks process shutdown.
  startSessionCleanup();

  server.listen(PORT, () => {
    console.log(`\n🚀 InternalX Backend running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  });
};

// Tests import { app } and drive it with supertest; only a direct `node` run listens.
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io, startServer };