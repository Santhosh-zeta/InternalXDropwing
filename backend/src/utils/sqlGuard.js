/**
 * Guard for the Level 1 SQL console (`POST /api/database/query`).
 *
 * The endpoint used to hand whatever arrived in `req.body.query` straight to
 * the driver, with a comment saying "we trust Level 1". Trusting the role is
 * not the same as trusting the request: a single XSS or CSRF against one admin
 * session, or one stolen L1 token, turned into `DROP TABLE users` with no audit
 * trail. The point of the controls below is that a compromised admin session is
 * limited to reading, is capped, is timed out, and is recorded.
 *
 * Defence in depth, three layers:
 *   1. this parser, which rejects anything that is not a single SELECT;
 *   2. a READ ONLY transaction, so the database itself refuses writes and DDL
 *      even if the parser is wrong;
 *   3. a statement timeout and a row cap, so a legal-but-ruinous query cannot
 *      take the instance down.
 */

/**
 * Statements that write, change structure, change permissions, touch the
 * filesystem, or run something else. Matched as whole words against the query
 * with all string literals, identifiers and comments blanked out, so a row that
 * merely contains the text 'delete' is not a false positive.
 *
 * INTO is here because `SELECT ... INTO new_table` is a CREATE TABLE in
 * disguise, and RETURNING because `WITH x AS (DELETE ... RETURNING *) SELECT`
 * is a write that begins with the word WITH.
 */
const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'TRUNCATE',
  'CREATE', 'ALTER', 'DROP', 'GRANT', 'REVOKE', 'REASSIGN',
  'REFRESH', 'REINDEX', 'CLUSTER', 'VACUUM', 'ANALYZE', 'CHECKPOINT',
  'COPY', 'IMPORT', 'LOCK', 'SET', 'RESET', 'DISCARD',
  'LISTEN', 'NOTIFY', 'UNLISTEN', 'CALL', 'DO', 'EXPLAIN',
  'PREPARE', 'EXECUTE', 'DEALLOCATE', 'DECLARE',
  'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT',
  'INTO', 'RETURNING',
];

/*
 * Words deliberately NOT on that list: END (every CASE expression contains
 * one), COMMENT and CLOSE (plausible column names), FETCH (FETCH FIRST n ROWS
 * is ordinary SQL). None of them can start a second statement, because a
 * semicolon that is not the final character is already refused below.
 */

/**
 * Functions that read or write outside the query's own data, or that can be
 * used to stall a connection. pg_read_file and friends are superuser-only in a
 * correct deployment, but the application role is not guaranteed to be
 * unprivileged and the console should not depend on that.
 */
const FORBIDDEN_FUNCTIONS = [
  'pg_read_file', 'pg_read_binary_file', 'pg_ls_dir', 'pg_stat_file',
  'pg_sleep', 'pg_sleep_for', 'pg_sleep_until',
  'pg_terminate_backend', 'pg_cancel_backend', 'pg_reload_conf',
  'pg_logical_emit_message', 'pg_create_restore_point',
  'lo_import', 'lo_export', 'lo_put', 'lo_unlink',
  'dblink', 'dblink_exec', 'dblink_connect',
  'nextval', 'setval', 'currval',
  'query_to_xml', 'database_to_xml', 'schema_to_xml',
];

class SqlRejected extends Error {
  constructor(message) {
    super(message);
    this.name = 'SqlRejected';
  }
}

/**
 * Blanks out every string literal, quoted identifier and comment, replacing
 * each with spaces so character offsets stay aligned with the original, and
 * records the offsets of statement-separating semicolons.
 *
 * Only '' is treated as an escape inside a single-quoted string — that matches
 * Postgres with standard_conforming_strings on (the default). Backslash is NOT
 * treated as an escape on purpose: if the parser guesses wrong about a string
 * boundary it will end the literal early and see the remainder as code, which
 * makes it reject. Guessing the other way would let a crafted literal swallow a
 * semicolon and hide a second statement.
 */
const scan = (sql) => {
  const out = [];
  const semicolons = [];
  let i = 0;
  const n = sql.length;

  const blank = (from, to) => {
    for (let k = from; k < to; k++) out.push(sql[k] === '\n' ? '\n' : ' ');
  };

  while (i < n) {
    const c = sql[i];

    // line comment
    if (c === '-' && sql[i + 1] === '-') {
      let j = i;
      while (j < n && sql[j] !== '\n') j++;
      blank(i, j);
      i = j;
      continue;
    }

    // block comment (Postgres nests them)
    if (c === '/' && sql[i + 1] === '*') {
      let depth = 1;
      let j = i + 2;
      while (j < n && depth > 0) {
        if (sql[j] === '/' && sql[j + 1] === '*') { depth++; j += 2; continue; }
        if (sql[j] === '*' && sql[j + 1] === '/') { depth--; j += 2; continue; }
        j++;
      }
      if (depth > 0) throw new SqlRejected('Unterminated comment in query.');
      blank(i, j);
      i = j;
      continue;
    }

    // single-quoted string literal
    if (c === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") { j++; break; }
        j++;
      }
      if (j > n) throw new SqlRejected('Unterminated string literal in query.');
      blank(i, j);
      i = j;
      continue;
    }

    // double-quoted identifier
    if (c === '"') {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === '"' && sql[j + 1] === '"') { j += 2; continue; }
        if (sql[j] === '"') { j++; break; }
        j++;
      }
      blank(i, j);
      i = j;
      continue;
    }

    // dollar-quoted string: $tag$ ... $tag$
    if (c === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        if (end === -1) throw new SqlRejected('Unterminated dollar-quoted string in query.');
        blank(i, end + tag.length);
        i = end + tag.length;
        continue;
      }
    }

    if (c === ';') semicolons.push(i);

    out.push(c);
    i++;
  }

  return { code: out.join(''), semicolons };
};

/**
 * Throws SqlRejected unless `sql` is a single, read-only SELECT.
 * Returns the query with any trailing semicolon removed, ready to be wrapped.
 */
const assertReadOnlySelect = (sql) => {
  if (typeof sql !== 'string' || !sql.trim()) {
    throw new SqlRejected('Query is required.');
  }
  if (sql.length > 20000) {
    throw new SqlRejected('Query is too long.');
  }

  const { code, semicolons } = scan(sql);

  // A semicolon is only acceptable as the very last non-whitespace character.
  // Anything else means a second statement is being smuggled in behind a
  // harmless-looking SELECT.
  for (const pos of semicolons) {
    if (code.slice(pos + 1).trim().length > 0) {
      throw new SqlRejected('Only a single statement may be executed. Remove the ";" and any statements after it.');
    }
  }

  const stripped = code.trim().replace(/;+\s*$/, '');
  if (!stripped) throw new SqlRejected('Query is required.');

  if (!/^(SELECT|WITH)\b/i.test(stripped)) {
    throw new SqlRejected('Only SELECT queries are permitted on this console.');
  }

  for (const kw of FORBIDDEN_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(stripped)) {
      throw new SqlRejected(`"${kw}" is not permitted. This console is read-only.`);
    }
  }

  for (const fn of FORBIDDEN_FUNCTIONS) {
    if (new RegExp(`\\b${fn}\\s*\\(`, 'i').test(stripped)) {
      throw new SqlRejected(`"${fn}()" is not permitted on this console.`);
    }
  }

  // Hand back the original text (not the blanked copy) minus the trailing
  // semicolon, since the caller needs the real literals to run it.
  const trailing = semicolons.length && code.slice(semicolons[semicolons.length - 1] + 1).trim() === ''
    ? semicolons[semicolons.length - 1]
    : sql.length;

  return sql.slice(0, trailing).trim();
};

module.exports = { assertReadOnlySelect, SqlRejected, FORBIDDEN_KEYWORDS, FORBIDDEN_FUNCTIONS };
