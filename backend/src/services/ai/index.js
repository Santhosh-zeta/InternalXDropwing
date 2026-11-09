/**
 * Provider selection. The assistant, the digest summary and notes-to-tasks all
 * go through getProvider(); nothing else in the app knows which vendor is used.
 *
 *   AI_PROVIDER=anthropic|openai|gemini   optional; default: whichever key is set
 *   (precedence anthropic > openai > gemini)
 *   AI_MODEL                              optional model override (any provider)
 *
 * Everything is read lazily, so without a key the feature is simply "not configured".
 */
const crypto = require('crypto');
const { PROVIDERS, DEFAULT_MODELS } = require('./constants');
const { createAnthropic } = require('./anthropic');
const { createOpenAI } = require('./openai');
const { createGemini } = require('./gemini');
const { userMessage } = require('./errors');

let override = null; // tests: a provider object
let anthropicClientOverride = null; // tests: a fake Anthropic SDK client

const setProviderForTests = (p) => { override = p; };
const setAnthropicClientForTests = (client) => { anthropicClientOverride = client; };

const keysFromEnv = (env) => ({
  anthropic: env.ANTHROPIC_API_KEY || '',
  openai: env.OPENAI_API_KEY || '',
  gemini: env.GEMINI_API_KEY || env.GOOGLE_API_KEY || '',
});

/** { name, reason } of the provider the environment selects, or null. */
const selectProvider = (env = process.env) => {
  const keys = keysFromEnv(env);
  const wanted = String(env.AI_PROVIDER || '').trim().toLowerCase();
  if (wanted) {
    if (PROVIDERS.includes(wanted)) {
      if (keys[wanted]) return { name: wanted, reason: 'AI_PROVIDER' };
      warnOnce(`AI_PROVIDER=${wanted} but its API key is not set`);
      return null;
    }
    warnOnce(`ignoring unknown AI_PROVIDER "${wanted.slice(0, 20)}" (use ${PROVIDERS.join(', ')})`);
  }
  const name = PROVIDERS.find((p) => keys[p]);
  return name ? { name, reason: 'auto-detected from the API key that is set' } : null;
};

const warned = new Set();
const warnOnce = (msg) => { if (!warned.has(msg)) { warned.add(msg); console.warn(`[ai] ${msg}`); } };

let cached = null;
let cachedSig = null;
let lastLogged = null;

const buildProvider = (name, env) => {
  const keys = keysFromEnv(env);
  const model = env.AI_MODEL || (name === 'anthropic' && env.ASSISTANT_MODEL) || DEFAULT_MODELS[name];
  if (name === 'anthropic') return createAnthropic({ apiKey: keys.anthropic, baseURL: env.ANTHROPIC_BASE_URL, model });
  if (name === 'openai') return createOpenAI({ apiKey: keys.openai, baseURL: env.OPENAI_BASE_URL, model });
  return createGemini({ apiKey: keys.gemini, baseURL: env.GEMINI_BASE_URL, model });
};

/** The configured provider, or null when no key is set. */
const getProvider = (env = process.env) => {
  if (override) return override;
  if (anthropicClientOverride) return createAnthropic({ client: anthropicClientOverride, model: env.AI_MODEL || env.ASSISTANT_MODEL });
  const sel = selectProvider(env);
  if (!sel) return null;
  const keys = keysFromEnv(env);
  const sig = [sel.name, env.AI_MODEL, env.ASSISTANT_MODEL, env.OPENAI_BASE_URL, env.GEMINI_BASE_URL, env.ANTHROPIC_BASE_URL,
    crypto.createHash('sha256').update(keys[sel.name]).digest('hex')].join('|');
  if (sig !== cachedSig) {
    cached = buildProvider(sel.name, env);
    cachedSig = sig;
    if (lastLogged !== sig) {
      lastLogged = sig;
      console.log(`[ai] using provider ${sel.name} (${sel.reason}), model ${cached.wantedModel}`);
    }
  }
  return cached;
};

const isConfigured = () => !!getProvider();

/**
 * Cheap key validity check (lists the account's models) for the system status
 * page: { configured, provider, model, ok, error? }. Never includes the key or a response body.
 */
const probe = async () => {
  const p = getProvider();
  if (!p) return { configured: false, provider: null, model: null, ok: false };
  try {
    const ids = await p.listModels();
    const model = await p.resolveModel();
    return { configured: true, provider: p.name, model, ok: true, models: ids.length };
  } catch (err) {
    return { configured: true, provider: p.name, model: p.wantedModel, ok: false, error: userMessage(err) };
  }
};

module.exports = { getProvider, isConfigured, selectProvider, probe, setProviderForTests, setAnthropicClientForTests };
