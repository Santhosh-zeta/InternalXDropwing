/**
 * Policy for passwords that guard privileged accounts (bootstrap admin,
 * `npm run create-admin`). Ordinary users are held to the shorter rule in
 * validate.middleware.js; an L1 account is the keys to everything, so it must
 * be long and must not be a placeholder copied out of an example file.
 */
const MIN_ADMIN_PASSWORD_LENGTH = 12;

const PLACEHOLDER_FRAGMENTS = [
  'change_me', 'changeme', 'change-me', 'your_', 'your-', 'replace', 'placeholder',
  'example', 'password', 'passw0rd', 'admin123', 'test@1234', 'test1234', 'qwerty',
  'letmein', '123456', 'secret', 'generate_', 'dropwing', 'internalx',
];

/** Returns null when acceptable, otherwise a human readable reason. */
const checkAdminPassword = (password) => {
  if (typeof password !== 'string') return 'password is missing';
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return `password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`;
  }
  const lower = password.toLowerCase();
  if (PLACEHOLDER_FRAGMENTS.some((f) => lower.includes(f))) {
    return 'password looks like a placeholder or a common password';
  }
  if (new Set(password).size < 6) return 'password has too few distinct characters';
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (classes < 3) return 'password must mix at least 3 of: lowercase, uppercase, digits, symbols';
  return null;
};

module.exports = { MIN_ADMIN_PASSWORD_LENGTH, checkAdminPassword };
