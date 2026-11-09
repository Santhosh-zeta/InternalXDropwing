const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pgPool } = require('../../src/config/database.pg');
const { createSession } = require('../../src/services/session.service');

const PASSWORD = 'Str0ng-Test-Pass!9';

/** Empties every user-owned table (ventures and access_levels keep their seed rows). */
const resetUsers = async () => {
  await pgPool.query('TRUNCATE users RESTART IDENTITY CASCADE');
};

let counter = 0;
const createUser = async ({ level = 8, ventureId = null, email, active = true, password = PASSWORD, name } = {}) => {
  counter += 1;
  const mail = email || `user${counter}-l${level}@dropwing.in`;
  const hash = await bcrypt.hash(password, 4); // low cost: tests only
  const { rows } = await pgPool.query(
    `INSERT INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, is_verified, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7) RETURNING id, email, access_level, venture_id`,
    [`T-${counter}-${Date.now() % 100000}`, name || `Test L${level}`, mail, hash, level, ventureId, active]
  );
  return { ...rows[0], password };
};

/** A signed JWT with a live session row, exactly as auth.controller issues them. */
const tokenFor = async (user) => {
  const token = jwt.sign(
    { id: user.id, email: user.email, accessLevel: user.access_level, ventureId: user.venture_id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  const { exp } = jwt.decode(token);
  await createSession(user.id, token, new Date(exp * 1000), null);
  return token;
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const close = async () => { await pgPool.end(); };

module.exports = { PASSWORD, pgPool, resetUsers, createUser, tokenFor, auth, close };
