/**
 * Everything provider-specific that may need updating when a vendor retires a
 * model lives here. If the default is missing from the account's model list,
 * models.js picks the best available one by PREFERENCES instead.
 */
const PROVIDERS = ['anthropic', 'openai', 'gemini'];

const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-5-5',
  openai: 'gpt-5',
  gemini: 'gemini-2.5-flash',
};

// Best first. An id matches when it starts with the prefix; within a prefix the shortest id wins
// (the full model over its -mini / -nano / dated variants).
const PREFERENCES = {
  anthropic: ['claude-sonnet-5', 'claude-sonnet-4', 'claude-opus-4', 'claude-haiku-4', 'claude-3-7-sonnet', 'claude-3-5-sonnet'],
  openai: ['gpt-5.5', 'gpt-5.4', 'gpt-5.2', 'gpt-5.1', 'gpt-5', 'gpt-4.1', 'gpt-4o'],
  gemini: ['gemini-3-pro', 'gemini-3-flash', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash'],
};

// Ids that are never a chat model for this app.
const EXCLUDE = /(embed|audio|realtime|image|tts|transcribe|whisper|moderation|dall-e|instruct|search|codex|computer-use|vision|live|robotics|aqa|learnlm|gemma|imagen|veo)/i;

const DEFAULT_BASE_URLS = {
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
};

const TIMEOUT_MS = 120000;
const LIST_TIMEOUT_MS = 15000;
const MODEL_CACHE_MS = 60 * 60 * 1000;
const MODEL_CACHE_FAIL_MS = 60 * 1000;

module.exports = {
  PROVIDERS, DEFAULT_MODELS, PREFERENCES, EXCLUDE, DEFAULT_BASE_URLS, TIMEOUT_MS, LIST_TIMEOUT_MS, MODEL_CACHE_MS, MODEL_CACHE_FAIL_MS,
};
