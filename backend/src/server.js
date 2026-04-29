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
app.use(helmet());
app.use(morgan('dev'));
app.use(cookieParser());

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
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', require('./routes/project.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/audit', require('./routes/audit.routes'));
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/timesheets', require('./routes/timesheet.routes'));
app.use('/api/invoices', require('./routes/invoice.routes'));
app.use('/api/access-control', require('./routes/access_control.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/budget', require('./routes/budget.routes'));
app.use('/api/kpis', require('./routes/kpis.routes'));
app.use('/api/client-portal', require('./routes/client_portal.routes'));
app.use('/api/learning', require('./routes/learning.routes'));

// Serve uploads directory
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'InternalX API is running', timestamp: new Date().toISOString() });
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

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }
});

io.on('connection', (socket) => {
  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
  });

  socket.on('send_message', (data) => {
    // broadcast to everyone in the channel
    const channel = data.ventureId ? (data.ventureId === 'global' ? 'global' : `venture_${data.ventureId}`) : `dm_${data.receiverId}`;
    io.to(channel).emit('receive_message', data);
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
