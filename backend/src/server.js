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

const app = express();

// Security & Middleware
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
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
app.use('/api/auth', authRoutes);
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
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve frontend build
app.use(express.static(path.join(__dirname, '../public/frontend-build'), { extensions: ['html'] }));

// Redirect /index.html to / to prevent Next.js router from rendering a blank page
app.get('/index.html', (req, res) => res.redirect(301, '/'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'InternalX API is running', timestamp: new Date().toISOString() });
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
const { pgPool } = require('./config/database.pg');

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }
});

// JWT authentication middleware for Socket.IO
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token ||
                  socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

const startServer = async () => {
  await testConnection();
  
  server.listen(PORT, () => {
    console.log(`\n🚀 InternalX Backend running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  });
};

startServer();