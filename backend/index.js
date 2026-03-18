require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// ─── Security & Middleware ─────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api/users', require('./src/routes/users'));
app.use('/api/ventures', require('./src/routes/companies'));
app.use('/api/companies', require('./src/routes/companies'));
app.use('/api/teams', require('./src/routes/teams'));
app.use('/api/announcements', require('./src/routes/announcements'));
app.use('/api/tasks', require('./src/routes/tasks'));
app.use('/api/projects', require('./src/routes/projects'));
app.use('/api/leave', require('./src/routes/leave'));
app.use('/api/setup', require('./src/routes/setup'));
app.use('/api/marketing', require('./src/routes/marketingRoutes'));

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        project: 'Dropwing Groups Internal Portal',
        supabase: process.env.SUPABASE_URL,
    });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ─── Start Server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n🚀 Dropwing Groups API running on http://localhost:${PORT}`);
    console.log(`   Supabase: ${process.env.SUPABASE_URL}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
