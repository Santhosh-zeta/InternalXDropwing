/**
 * OpenAI provider over plain fetch: Chat Completions with function tools and
 * SSE streaming. OPENAI_BASE_URL points it at any compatible gateway (Azure,
 * OpenRouter, Ollama, ...). The key is only ever sent in the Authorization header.
 */
const { DEFAULT_MODELS, DEFAULT_BASE_URLS, TIMEOUT_MS, LIST_TIMEOUT_MS } = require('./constants');
const { AiError, wrap, isAbort } = require('./errors');
const { request, sseEvents } = require('./http');
const { resolveModel } = require('./models');
const { structured } = require('./structured');

/** Neutral messages -> Chat Completions messages. */
const toOpenAI = (system, messages) => {
  const out = [{ role: 'system', content: system }];
  for (const m of messages) {
    if (typeof m.content === 'string') { out.push({ role: m.role, content: m.content }); continue; }
    if (m.role === 'assistant') {
      const text = m.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
      const calls = m.content.filter((b) => b.type === 'tool_use').map((b) => ({
        id: b.id, type: 'function', function: { name: b.name, arguments: JSON.stringify(b.input || {}) },
      }));
      if (!text && calls.length === 0) continue;
      out.push({ role: 'assistant', content: text || null, ...(calls.length ? { tool_calls: calls } : {}) });
    } else {
      // Tool results must directly follow the assistant tool_calls turn, so they come first.
      for (const b of m.content.filter((x) => x.type === 'tool_result')) {
        out.push({ role: 'tool', tool_call_id: b.tool_use_id, content: b.is_error ? `Error: ${b.content}` : b.content });
      }
      const text = m.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      if (text) out.push({ role: 'user', content: text });
    }
  }
  return out;
};

const FINISH = { stop: 'end_turn', tool_calls: 'tool_use', function_call: 'tool_use', length: 'max_tokens', content_filter: 'refusal' };

const parseArgs = (s) => { try { const v = JSON.parse(s || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };

const createOpenAI = ({ apiKey, baseURL, model, timeoutMs = TIMEOUT_MS } = {}) => {
  const base = String(baseURL || DEFAULT_BASE_URLS.openai).replace(/\/+$/, '');
  const official = base === DEFAULT_BASE_URLS.openai;
  const wanted = model || DEFAULT_MODELS.openai;
  const auth = { authorization: `Bearer ${apiKey}` };

  const listModels = async () => {
    const res = await request(`${base}/models`, { method: 'GET', headers: auth, timeoutMs: LIST_TIMEOUT_MS, retries: 0 });
    const body = await res.json();
    return (body.data || []).map((m) => m.id).filter(Boolean);
  };

  const provider = {
    name: 'openai',
    wantedModel: wanted,
    cacheKey: `${base}|${String(apiKey).slice(-6)}`,
    listModels,
    resolveModel: () => resolveModel(provider),
    status: () => ({ configured: true, provider: 'openai', model: provider.resolved || wanted }),

    async chat({ system, messages, tools = [], signal, onText, maxTokens = 4096, forceTool, model: override }) {
      const body = {
        model: override || await provider.resolveModel(),
        messages: toOpenAI(system, messages),
        stream: true,
        stream_options: { include_usage: true },
        // The official API rejects max_tokens on current models; gateways only know max_tokens.
        [official ? 'max_completion_tokens' : 'max_tokens']: maxTokens,
        ...(tools.length ? {
          tools: tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } })),
          ...(forceTool ? { tool_choice: { type: 'function', function: { name: forceTool } } } : {}),
        } : {}),
      };
      let text = '';
      let refusalText = '';
      let finish = null;
      let usage = { input: 0, output: 0 };
      const calls = new Map(); // index -> { id, name, args }
      try {
        const res = await request(`${base}/chat/completions`, { headers: auth, body, signal, timeoutMs });
        for await (const evt of sseEvents(res, signal, timeoutMs)) {
          if (evt.usage) usage = { input: evt.usage.prompt_tokens || 0, output: evt.usage.completion_tokens || 0 };
          const choice = evt.choices && evt.choices[0];
          if (!choice) continue;
          const d = choice.delta || {};
          if (d.content) { text += d.content; if (onText) onText(d.content); }
          if (d.refusal) refusalText += d.refusal;
          for (const tc of d.tool_calls || []) {
            const i = tc.index ?? 0;
            const cur = calls.get(i) || { id: null, name: '', args: '' };
            if (tc.id) cur.id = tc.id;
            if (tc.function && tc.function.name) cur.name += tc.function.name;
            if (tc.function && tc.function.arguments) cur.args += tc.function.arguments;
            calls.set(i, cur);
          }
          if (choice.finish_reason) finish = choice.finish_reason;
        }
      } catch (err) {
        if (isAbort(err, signal)) throw err;
        const e = wrap(err);
        console.error(`[ai] openai call failed: ${e.kind}${e.status ? ` (HTTP ${e.status})` : ''}`);
        throw e;
      }
      const toolCalls = [...calls.entries()].sort((a, b) => a[0] - b[0]).map(([i, c]) => ({
        id: c.id || `call_${Date.now().toString(36)}_${i}`, name: c.name, input: parseArgs(c.args),
      })).filter((c) => c.name);
      let stopReason = FINISH[finish] || 'end_turn';
      if (refusalText && !text && toolCalls.length === 0) stopReason = 'refusal';
      else if (toolCalls.length && stopReason !== 'max_tokens') stopReason = 'tool_use';
      return { text, toolCalls, stopReason, usage, raw: null };
    },

    structured: (args) => structured(provider, args),
  };
  return provider;
};

module.exports = { createOpenAI, toOpenAI, AiError };
