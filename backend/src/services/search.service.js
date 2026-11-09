/**
 * Full-text search over everything the caller may already see.
 *
 * Every entity query ANDs the shared predicate from utils/scope.js
 * (projectWhere / taskWhere / documentWhere); users, announcements and chat
 * messages have no predicate there, so theirs are defined below and mirror the
 * existing list endpoints (staff directory, analytics announcements,
 * services/chat.service.js listMessages). Nothing is filtered in JS.
 *
 * Index expressions are in migrations/0003_b2_search.sql and must match.
 */
const { pool } = require('../config/database');
const { projectWhere, taskWhere, documentWhere } = require('../utils/scope');

const MAX_Q = 100;
const MAX_TERMS = 6;

/** "red lo" -> "red:* & lo:*" (letters/digits only, so nothing can inject tsquery syntax). */
const toTsQuery = (raw) => {
  const terms = String(raw || '').slice(0, MAX_Q).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  if (terms.length === 0) return null;
  return terms.slice(0, MAX_TERMS).map((t) => `${t}:*`).join(' & ');
};

const vec = (expr) => `to_tsvector('simple', ${expr})`;
const VEC = {
  tasks: vec(`coalesce(t.title, '') || ' ' || coalesce(t.description, '')`),
  projects: vec(`coalesce(p.name, '') || ' ' || coalesce(p.description, '') || ' ' || coalesce(p.client_name, '')`),
  // file names: split on punctuation so "q3-report_final.pdf" matches "report"
  documents: vec(`regexp_replace(coalesce(d.original_name, ''), '[^[:alnum:]]+', ' ', 'g')`),
  announcements: vec(`coalesce(a.title, '') || ' ' || coalesce(a.content, '')`),
  users: vec(`coalesce(u.full_name, '') || ' ' || coalesce(u.designation, '') || ' ' || coalesce(u.department, '')`),
  messages: vec('m.content'),
};

/** Staff directory rule: internal only, own venture only (global sees everyone). */
const userWhere = (scope, a, params) => {
  if (scope.isClient) return 'FALSE';
  const base = `${a}.is_active = TRUE AND ${a}.access_level <> 9`;
  if (scope.global) return base;
  if (scope.ventureId == null) return 'FALSE';
  params.push(scope.ventureId);
  return `${base} AND ${a}.venture_id = $${params.length}`;
};

/** Company-wide announcements plus the caller's venture's. Clients get none. */
const announcementWhere = (scope, a, params) => {
  if (scope.isClient) return 'FALSE';
  if (scope.global) return 'TRUE';
  if (scope.ventureId == null) return `${a}.venture_id IS NULL`;
  params.push(scope.ventureId);
  return `(${a}.venture_id IS NULL OR ${a}.venture_id = $${params.length})`;
};

/** Channels the caller may read: own DMs, the global channel, own venture (every venture for global users). */
const messageWhere = (scope, a, params) => {
  if (scope.isClient) return 'FALSE';
  params.push(scope.userId);
  const me = `$${params.length}`;
  const dm = `(${a}.receiver_id IS NOT NULL AND (${a}.sender_id = ${me} OR ${a}.receiver_id = ${me}))`;
  const globalChannel = `(${a}.venture_id IS NULL AND ${a}.receiver_id IS NULL)`;
  let venture;
  if (scope.global) venture = `(${a}.venture_id IS NOT NULL AND ${a}.receiver_id IS NULL)`;
  else if (scope.ventureId == null) venture = 'FALSE';
  else {
    params.push(scope.ventureId);
    venture = `(${a}.venture_id = $${params.length} AND ${a}.receiver_id IS NULL)`;
  }
  return `(${dm} OR ${globalChannel} OR ${venture})`;
};

const snippet = (s, n = 140) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** One SELECT per entity. The tsquery is $1; scope predicates push their own parameters after it. */
const buildQueries = (scope, tsq, limit) => {
  const q = [];
  const add = (type, build) => {
    const params = [tsq];
    q.push({ type, ...build(params), params });
  };

  add('project', (params) => {
    const where = projectWhere(scope, 'p', params);
    return { sql: `SELECT p.id, p.name AS title, p.status::text AS subtitle, ts_rank(${VEC.projects}, query) AS rank
      FROM projects p, to_tsquery('simple', $1) query
      WHERE ${VEC.projects} @@ query AND ${where} ORDER BY rank DESC, p.id DESC LIMIT ${limit}` };
  });
  add('task', (params) => {
    const where = taskWhere(scope, 't', params);
    return { sql: `SELECT t.id, t.title, t.status::text AS subtitle, ts_rank(${VEC.tasks}, query) AS rank
      FROM tasks t, to_tsquery('simple', $1) query
      WHERE ${VEC.tasks} @@ query AND ${where} ORDER BY rank DESC, t.id DESC LIMIT ${limit}` };
  });
  add('document', (params) => {
    const where = documentWhere(scope, 'd', params);
    return { sql: `SELECT d.id, d.original_name AS title, d.mime_type AS subtitle, ts_rank(${VEC.documents}, query) AS rank
      FROM documents d, to_tsquery('simple', $1) query
      WHERE ${VEC.documents} @@ query AND ${where} ORDER BY rank DESC, d.id DESC LIMIT ${limit}` };
  });
  add('announcement', (params) => {
    const where = announcementWhere(scope, 'a', params);
    return { sql: `SELECT a.id, a.title, a.type AS subtitle, ts_rank(${VEC.announcements}, query) AS rank
      FROM announcements a, to_tsquery('simple', $1) query
      WHERE ${VEC.announcements} @@ query AND ${where} ORDER BY rank DESC, a.id DESC LIMIT ${limit}` };
  });
  add('user', (params) => {
    const where = userWhere(scope, 'u', params);
    return { sql: `SELECT u.id, u.full_name AS title, concat_ws(' · ', u.designation, u.department) AS subtitle, ts_rank(${VEC.users}, query) AS rank
      FROM users u, to_tsquery('simple', $1) query
      WHERE ${VEC.users} @@ query AND ${where} ORDER BY rank DESC, u.full_name LIMIT ${limit}` };
  });
  add('message', (params) => {
    const where = messageWhere(scope, 'm', params);
    return { sql: `SELECT m.id, m.content AS title,
        CASE WHEN m.receiver_id IS NOT NULL THEN 'Direct message' WHEN m.venture_id IS NULL THEN 'Global channel' ELSE 'Venture channel' END AS subtitle,
        ts_rank(${VEC.messages}, query) AS rank
      FROM messages m, to_tsquery('simple', $1) query
      WHERE ${VEC.messages} @@ query AND ${where} ORDER BY rank DESC, m.id DESC LIMIT ${limit}` };
  });
  return q;
};

const LINKS = {
  project: '/dashboard/projects',
  task: '/dashboard/tasks',
  document: '/dashboard/documents',
  announcement: '/dashboard',
  user: '/dashboard/team',
  message: '/dashboard/chat',
};

/** Returns { groups: { project: [...], ... } } with at most `limit` hits per type. */
const search = async (scope, rawQuery, { limit = 5 } = {}) => {
  const tsq = toTsQuery(rawQuery);
  const lim = Math.max(1, Math.min(parseInt(limit, 10) || 5, 10));
  const groups = {};
  if (!tsq) return { groups };
  const queries = buildQueries(scope, tsq, lim);
  const results = await Promise.all(queries.map((x) => pool.query(x.sql, x.params)));
  queries.forEach((x, i) => {
    const rows = results[i][0];
    if (!rows.length) return;
    groups[x.type] = rows.map((r) => ({
      type: x.type,
      id: r.id,
      title: x.type === 'message' ? snippet(r.title) : r.title,
      subtitle: r.subtitle || '',
      link: LINKS[x.type],
    }));
  });
  return { groups };
};

module.exports = { search, toTsQuery, userWhere, announcementWhere, messageWhere };
