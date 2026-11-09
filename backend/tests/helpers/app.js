/**
 * Test harness: the real route modules on a bare express app (no listen), the
 * real Postgres from DB_* env (backend/.env locally, CI service in Actions),
 * demo data from scripts/seed-demo.js, and tokens backed by real session rows.
 *
 * Seeding only deletes/creates rows tagged as demo data, never anything else.
 */
process.env.NODE_ENV = 'test';
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret';
process.env.SESSION_CACHE_TTL_MS = '0';

const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { pgPool } = require('../../src/config/database.pg');
const { createSession } = require('../../src/services/session.service');
const { seedDemo } = require('../../scripts/seed-demo');

/** Stand-in for socket.io's server: records every emit so tests can assert on it. */
const makeFakeIo = () => {
  const emitted = [];
  const chain = (rooms) => ({
    to: (room) => chain([...rooms, room]),
    emit: (event, payload) => emitted.push({ rooms, event, payload }),
  });
  return { emitted, to: (room) => chain([room]) };
};

const buildApp = (io = makeFakeIo()) => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  const mount = (p, file) => app.use(p, require(`../../src/routes/${file}`));
  mount('/api/tasks', 'task.routes');
  mount('/api/projects', 'project.routes');
  mount('/api/chat', 'chat.routes');
  mount('/api/platform-metrics', 'analytics.routes');
  mount('/api/action-logs', 'audit.routes');
  mount('/api/documents', 'document.routes');
  mount('/api/timesheets', 'timesheet.routes');
  mount('/api/invoices', 'invoice.routes');
  mount('/api/notifications', 'notifications.routes');
  mount('/api/budget', 'budget.routes');
  mount('/api/kpis', 'kpis.routes');
  mount('/api/client-portal', 'client_portal.routes');
  mount('/api/learning', 'learning.routes');
  mount('/api/strategy', 'strategy.routes');
  mount('/api/team-members', 'team_rate.routes');
  mount('/api/search', 'search.routes');
  mount('/api/assistant', 'assistant.routes');
  mount('/uploads', 'uploads.routes');
  app.set('io', io);
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  });
  return { app, io };
};

/** Seed demo data and return { ctx, as(userKey), app, io, pool, close }. */
const setup = async () => {
  const ctx = await seedDemo(pgPool, { password: 'unused-in-tests' });
  const { app, io } = buildApp();
  const tokens = {};

  const token = async (key) => {
    if (tokens[key]) return tokens[key];
    const id = ctx.users[key];
    if (!id) throw new Error(`unknown demo user ${key}`);
    const { rows } = await pgPool.query('SELECT email, access_level, venture_id FROM users WHERE id = $1', [id]);
    const t = jwt.sign({ id, email: rows[0].email, accessLevel: rows[0].access_level, ventureId: rows[0].venture_id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await createSession(id, t, new Date(Date.now() + 3600 * 1000));
    return (tokens[key] = t);
  };

  /** Authenticated supertest helpers for a demo user. */
  const as = async (key) => {
    const auth = `Bearer ${await token(key)}`;
    const wrap = (method) => (url) => request(app)[method](url).set('Authorization', auth);
    return { get: wrap('get'), post: wrap('post'), put: wrap('put'), patch: wrap('patch'), delete: wrap('delete'), token: tokens[key], id: ctx.users[key] };
  };

  return { ctx, app, io, as, token, pool: pgPool, close: () => pgPool.end() };
};

module.exports = { setup, buildApp, makeFakeIo };
