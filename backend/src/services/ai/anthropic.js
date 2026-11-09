/**
 * Anthropic provider (official SDK). Keeps prompt caching: the system prompt is
 * one cached block and tools come first, so the prefix is identical between requests.
 *
 * `client` is anything with `messages.stream(params, { signal })` returning
 * `.on('text', fn)` and `.finalMessage()` (the SDK client, or a fake in tests).
 */
const Anthropic = require('@anthropic-ai/sdk');
const { DEFAULT_MODELS, TIMEOUT_MS } = require('./constants');
const { AiError, wrap, isAbort } = require('./errors');
const { resolveModel } = require('./models');
const { structured } = require('./structured');

/** Neutral blocks -> Anthropic blocks. Only the in-flight turn's own thinking blocks are replayed (via `raw`). */
const toAnthropic = (messages) => messages
  .map((m) => {
    if (typeof m.content === 'string') return { role: m.role, content: m.content };
    if (m.role === 'assistant' && m.raw && m.raw.provider === 'anthropic') return { role: 'assistant', content: m.raw.content };
    const content = m.content.map((b) => {
      if (b.type === 'tool_use') return { type: 'tool_use', id: b.id, name: b.name, input: b.input || {} };
      if (b.type === 'tool_result') return { type: 'tool_result', tool_use_id: b.tool_use_id, content: b.content, ...(b.is_error ? { is_error: true } : {}) };
      return { type: 'text', text: b.text };
    });
    return { role: m.role, content };
  })
  .filter((m) => typeof m.content === 'string' ? m.content : m.content.length > 0);

const STOP = { tool_use: 'tool_use', end_turn: 'end_turn', max_tokens: 'max_tokens', refusal: 'refusal' };

const createAnthropic = ({ client, apiKey, baseURL, model } = {}) => {
  const sdk = client || new Anthropic({ apiKey, baseURL: baseURL || undefined, maxRetries: 2, timeout: TIMEOUT_MS });
  const wanted = model || DEFAULT_MODELS.anthropic;

  const listModels = async () => {
    if (!sdk.models || typeof sdk.models.list !== 'function') return [];
    try {
      const page = await sdk.models.list({ limit: 100 });
      const rows = Array.isArray(page) ? page : (page.data || []);
      return rows.map((r) => r.id).filter(Boolean);
    } catch (err) { throw wrap(err); }
  };

  const provider = {
    name: 'anthropic',
    wantedModel: wanted,
    cacheKey: String(apiKey || 'injected').slice(-6),
    listModels,
    resolveModel: () => resolveModel(provider),
    status: () => ({ configured: true, provider: 'anthropic', model: provider.resolved || wanted }),

    async chat({ system, messages, tools = [], signal, onText, maxTokens = 4096, effort = 'medium', thinking = false, forceTool, model: override }) {
      const params = {
        model: override || await provider.resolveModel(),
        max_tokens: maxTokens,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        ...(tools.length ? { tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema, strict: true })),
          // Forced tool_choice is rejected by current models; the prompt asks for the call and the caller checks.
          ...(forceTool ? { tool_choice: { type: 'auto' } } : {}) } : {}),
        // Lowest thinking setting on Sonnet 5.5; no reasoning blocks to bind when history is replayed.
        ...(thinking ? { thinking: { type: 'between_tools' } } : {}),
        output_config: { effort },
        messages: toAnthropic(messages),
      };
      let message;
      try {
        const stream = sdk.messages.stream(params, { signal });
        if (onText) stream.on('text', onText);
        message = await stream.finalMessage();
      } catch (err) {
        if (isAbort(err, signal)) throw err;
        const e = wrap(err);
        console.error(`[ai] anthropic call failed: ${e.kind}${e.status ? ` (HTTP ${e.status})` : ''}`);
        throw e;
      }
      const blocks = message.content || [];
      const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('');
      const toolCalls = blocks.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id, name: b.name, input: b.input || {} }));
      const u = message.usage || {};
      const stopReason = toolCalls.length && message.stop_reason !== 'max_tokens' ? 'tool_use' : (STOP[message.stop_reason] || 'end_turn');
      return {
        text,
        toolCalls,
        stopReason,
        usage: {
          input: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0),
          output: u.output_tokens || 0,
        },
        raw: { provider: 'anthropic', content: blocks },
      };
    },

    structured: (args) => structured(provider, args),
  };
  return provider;
};

module.exports = { createAnthropic, toAnthropic, AiError };
