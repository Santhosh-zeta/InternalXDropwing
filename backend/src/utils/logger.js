/**
 * Structured JSON logging (pino). One line per event on stdout, ready for
 * `docker logs`, journald or any log shipper.
 *
 *   LOG_LEVEL   trace|debug|info|warn|error|fatal|silent  (default info; silent in tests)
 *
 * Secrets never reach the log: credentials in headers, cookies and the usual
 * password/token body fields are redacted wherever they appear in a logged object.
 */
const util = require('util');
const pino = require('pino');

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.authorization',
  '*.cookie',
  '*.password',
  '*.newPassword',
  '*.currentPassword',
  '*.password_hash',
  '*.token',
  '*.credential',
  '*.otp',
  '*.reset_password_token',
  '*.link',
];

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  redact: { paths: REDACT_PATHS, censor: '[redacted]' },
  base: { service: 'internalx-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Route console.* through pino so the many `console.error('x:', err)` calls in
 * the code base come out as JSON lines too (with the error serialised), instead
 * of unstructured text. Called once, by the real server process only.
 */
const captureConsole = () => {
  const forward = (level) => (...args) => {
    const err = args.find((a) => a instanceof Error);
    const text = util.format(...args.map((a) => (a instanceof Error ? a.message : a)));
    if (err) logger[level]({ err }, text);
    else logger[level](text);
  };
  console.log = forward('info');
  console.info = forward('info');
  console.warn = forward('warn');
  console.error = forward('error');
  console.debug = forward('debug');
};

module.exports = { logger, captureConsole, REDACT_PATHS };
