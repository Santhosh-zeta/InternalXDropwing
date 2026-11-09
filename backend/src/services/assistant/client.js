/**
 * Assistant feature configuration (limits). The model vendor lives in
 * services/ai; this file only keeps the limits and the test hook that
 * injects a fake Anthropic SDK client.
 */
const ai = require('../ai');

const int = (name, def) => {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v > 0 ? v : def;
};

const config = () => ({
  effort: process.env.ASSISTANT_EFFORT || 'medium',
  maxOutputTokens: int('ASSISTANT_MAX_OUTPUT_TOKENS', 4096),
  maxIterations: int('ASSISTANT_MAX_TOOL_ITERATIONS', 6),
  dailyTokenCap: int('ASSISTANT_DAILY_TOKEN_CAP', 300000),
  dailyMessageCap: int('ASSISTANT_DAILY_MESSAGE_CAP', 100),
  historyRows: int('ASSISTANT_HISTORY_ROWS', 40),
});

/** Tests inject a fake Anthropic SDK client (or null to clear). */
const setClientForTests = (client) => ai.setAnthropicClientForTests(client);

module.exports = { config, setClientForTests, isConfigured: ai.isConfigured };
