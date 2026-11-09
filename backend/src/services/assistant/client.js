/**
 * Anthropic client + feature configuration. Everything is read from the
 * environment lazily so the feature is simply "not configured" without a key
 * and nothing crashes at import time.
 */
const Anthropic = require('@anthropic-ai/sdk');

let override = null;
let cached = null;
let cachedKey = null;

/** The configured SDK client, or null when ANTHROPIC_API_KEY is absent. */
const getClient = () => {
  if (override) return override;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!cached || cachedKey !== key) {
    cached = new Anthropic({
      apiKey: key,
      baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
      maxRetries: 2,
      timeout: 120000,
    });
    cachedKey = key;
  }
  return cached;
};

/** Tests inject a fake client (or null to clear). */
const setClientForTests = (client) => { override = client; };

const int = (name, def) => {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v > 0 ? v : def;
};

const config = () => ({
  model: process.env.ASSISTANT_MODEL || 'claude-sonnet-5-5',
  effort: process.env.ASSISTANT_EFFORT || 'medium',
  maxOutputTokens: int('ASSISTANT_MAX_OUTPUT_TOKENS', 4096),
  maxIterations: int('ASSISTANT_MAX_TOOL_ITERATIONS', 6),
  dailyTokenCap: int('ASSISTANT_DAILY_TOKEN_CAP', 300000),
  dailyMessageCap: int('ASSISTANT_DAILY_MESSAGE_CAP', 100),
  historyRows: int('ASSISTANT_HISTORY_ROWS', 40),
});

const isConfigured = () => !!getClient();

module.exports = { getClient, setClientForTests, config, isConfigured };
