/**
 * CSRF defence in depth for cookie-authenticated, state-changing requests.
 *
 * The session cookie is SameSite=Strict, which already stops browsers sending it
 * cross-site. This adds a server-side check that does not depend on that:
 *
 *   - Requests that carry no session cookie, or authenticate with an
 *     `Authorization: Bearer` header (the mobile app, scripts), are exempt: a
 *     header cannot be attached by a cross-site form or image tag.
 *   - Otherwise a browser's `Origin` header must be this site (Host /
 *     X-Forwarded-Host) or a configured CORS origin; failing that,
 *     `Sec-Fetch-Site` must be same-origin / none.
 *   - A request with neither header (very old browser, curl with a cookie jar)
 *     must be a JSON or multipart request, which a plain cross-site <form>
 *     cannot produce.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const csrfGuard = (allowedOrigins = []) => (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (!req.cookies || !req.cookies.internalx_token) return next();
  if (/^Bearer\s/i.test(req.headers.authorization || '')) return next();

  const deny = () => res.status(403).json({ success: false, message: 'Cross-site request refused' });
  const allowed = Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins].filter(Boolean);

  const sender = req.headers.origin;
  if (sender) {
    let host;
    try { host = new URL(sender).host; } catch (_) { return deny(); }
    const own = [req.get('host'), req.get('x-forwarded-host')].filter(Boolean);
    return own.includes(host) || allowed.includes(sender) ? next() : deny();
  }

  const site = req.headers['sec-fetch-site'];
  if (site) return site === 'same-origin' || site === 'none' ? next() : deny();

  return req.is('application/json') || req.is('multipart/form-data') ? next() : deny();
};

module.exports = { csrfGuard };
