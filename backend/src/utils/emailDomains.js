/**
 * The one list of email domains allowed to self-register and to sign in with
 * Google. Override with ALLOWED_EMAIL_DOMAINS (comma separated). Read on every
 * call so a changed env (and tests) take effect without a module reload.
 */
const DEFAULT_ALLOWED_EMAIL_DOMAINS = ['dropwinggroups.com', 'dropwing.in', 'fenixa.com', 'persynix.com', 'grovia.in'];

const allowedEmailDomains = () => {
  const raw = process.env.ALLOWED_EMAIL_DOMAINS;
  if (!raw || !raw.trim()) return DEFAULT_ALLOWED_EMAIL_DOMAINS;
  return raw.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
};

const isAllowedEmailDomain = (email) => {
  const at = String(email || '').lastIndexOf('@');
  if (at < 1) return false;
  return allowedEmailDomains().includes(email.slice(at + 1).toLowerCase());
};

module.exports = { DEFAULT_ALLOWED_EMAIL_DOMAINS, allowedEmailDomains, isAllowedEmailDomain };
