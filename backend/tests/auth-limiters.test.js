const router = require('../src/routes/auth.routes');
const { authLimiter, apiLimiter } = require('../src/middleware/rateLimit.middleware');

/** Middleware that runs for a given route, in order (router-level use() layers + the route's own). */
const chainFor = (method, path) => {
  const out = [];
  for (const layer of router.stack) {
    if (!layer.route) { out.push(...[layer.handle]); continue; }
    if (layer.route.path === path && layer.route.methods[method]) {
      out.push(...layer.route.stack.map((l) => l.handle));
      return out;
    }
  }
  return null;
};

test('/me and /logout are not behind the shared per-IP auth limiter', () => {
  for (const [method, path] of [['get', '/me'], ['post', '/logout']]) {
    const chain = chainFor(method, path);
    expect(chain).not.toBeNull();
    expect(chain).not.toContain(authLimiter);
    expect(chain).toContain(apiLimiter); // per-user budget
  }
});

test('the unauthenticated routes still sit behind the ceiling', () => {
  for (const [method, path] of [['post', '/login'], ['post', '/verify-otp'], ['post', '/forgot-password']]) {
    expect(chainFor(method, path)).toContain(authLimiter);
  }
});
