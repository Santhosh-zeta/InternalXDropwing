/**
 * Google Gemini provider over plain fetch: generateContent with function
 * declarations, streamed as SSE. The key travels only in the x-goog-api-key
 * header, never in the URL, so it cannot end up in logs or error messages.
 */
const { DEFAULT_MODELS, DEFAULT_BASE_URLS, TIMEOUT_MS, LIST_TIMEOUT_MS } = require('./constants');
const { AiError, wrap, isAbort } = require('./errors');
const { request, sseEvents } = require('./http');
const { resolveModel } = require('./models');
const { structured } = require('./structured');

/** JSON Schema -> the OpenAPI subset Gemini accepts for function parameters. */
const toGeminiSchema = (s) => {
  if (Array.isArray(s)) return s.map(toGeminiSchema);
  if (!s || typeof s !== 'object') return s;
  const out = {};
  for (const [k, v] of Object.entries(s)) {
    if (['additionalProperties', 'minLength', 'maxLength', 'strict', '$schema', 'default'].includes(k)) continue;
    if (k === 'type' && Array.isArray(v)) {
      const real = v.filter((x) => x !== 'null');
      out.type = real[0] || 'string';
      if (v.includes('null')) out.nullable = true;
    } else if (k === 'enum') {
      out.enum = v.filter((x) => x !== null);
    } else if (k === 'properties') {
      out.properties = Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, toGeminiSchema(pv)]));
    } else if (k === 'items') {
      out.items = toGeminiSchema(v);
    } else {
      out[k] = v;
    }
  }
  return out;
};

const SKIP_SIGNATURE = 'skip_thought_signature_validator';

/** Neutral messages -> Gemini contents. functionResponse needs the function name, found via the tool_use id. */
const toGemini = (messages, model) => {
  const names = new Map();
  for (const m of messages) {
    if (Array.isArray(m.content)) for (const b of m.content) if (b.type === 'tool_use') names.set(b.id, b.name);
  }
  const contents = [];
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    if (typeof m.content === 'string') { contents.push({ role, parts: [{ text: m.content }] }); continue; }
    const parts = [];
    let firstCall = true;
    for (const b of m.content) {
      if (b.type === 'text' && b.text) parts.push({ text: b.text });
      else if (b.type === 'tool_use') {
        const part = { functionCall: { name: b.name, args: b.input || {} } };
        const sig = b.meta && b.meta.gemini && b.meta.gemini.thoughtSignature;
        // Gemini 3 insists on the signature of the first call of a step; a turn that came from another provider has none.
        if (sig) part.thoughtSignature = sig;
        else if (firstCall && /gemini-3/.test(model)) part.thoughtSignature = SKIP_SIGNATURE;
        firstCall = false;
        parts.push(part);
      } else if (b.type === 'tool_result') {
        parts.push({ functionResponse: { name: names.get(b.tool_use_id) || 'tool', response: b.is_error ? { error: b.content } : { output: b.content } } });
      }
    }
    if (parts.length) contents.push({ role, parts });
  }
  return contents;
};

const REFUSAL_FINISH = new Set(['SAFETY', 'RECITATION', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'IMAGE_SAFETY']);

const createGemini = ({ apiKey, baseURL, model, timeoutMs = TIMEOUT_MS } = {}) => {
  const base = String(baseURL || DEFAULT_BASE_URLS.gemini).replace(/\/+$/, '');
  const wanted = model || DEFAULT_MODELS.gemini;
  const auth = { 'x-goog-api-key': apiKey };

  const listModels = async () => {
    const res = await request(`${base}/models?pageSize=1000`, { method: 'GET', headers: auth, timeoutMs: LIST_TIMEOUT_MS, retries: 0 });
    const body = await res.json();
    return (body.models || [])
      .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => String(m.name || '').replace(/^models\//, ''))
      .filter(Boolean);
  };

  const provider = {
    name: 'gemini',
    wantedModel: wanted,
    cacheKey: String(apiKey).slice(-6),
    listModels,
    resolveModel: () => resolveModel(provider),
    status: () => ({ configured: true, provider: 'gemini', model: provider.resolved || wanted }),

    async chat({ system, messages, tools = [], signal, onText, maxTokens = 4096, forceTool, model: override }) {
      const modelId = override || await provider.resolveModel();
      const body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: toGemini(messages, modelId),
        generationConfig: { maxOutputTokens: maxTokens },
        ...(tools.length ? {
          tools: [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: toGeminiSchema(t.input_schema) })) }],
          ...(forceTool ? { toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: [forceTool] } } } : {}),
        } : {}),
      };
      let text = '';
      let finish = null;
      let blocked = false;
      let usage = { input: 0, output: 0 };
      const toolCalls = [];
      try {
        const res = await request(`${base}/models/${encodeURIComponent(modelId)}:streamGenerateContent?alt=sse`, { headers: auth, body, signal, timeoutMs });
        for await (const evt of sseEvents(res, signal, timeoutMs)) {
          if (evt.promptFeedback && evt.promptFeedback.blockReason) blocked = true;
          if (evt.usageMetadata) {
            const u = evt.usageMetadata;
            usage = { input: u.promptTokenCount || 0, output: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0) };
          }
          const cand = evt.candidates && evt.candidates[0];
          if (!cand) continue;
          for (const part of (cand.content && cand.content.parts) || []) {
            if (part.functionCall) {
              const sig = part.thoughtSignature;
              toolCalls.push({
                id: `gem_${Date.now().toString(36)}_${toolCalls.length}`,
                name: part.functionCall.name,
                input: part.functionCall.args && typeof part.functionCall.args === 'object' ? part.functionCall.args : {},
                ...(sig ? { meta: { gemini: { thoughtSignature: sig } } } : {}),
              });
            } else if (typeof part.text === 'string' && !part.thought) {
              text += part.text;
              if (onText && part.text) onText(part.text);
            }
          }
          if (cand.finishReason) finish = cand.finishReason;
        }
      } catch (err) {
        if (isAbort(err, signal)) throw err;
        const e = wrap(err);
        console.error(`[ai] gemini call failed: ${e.kind}${e.status ? ` (HTTP ${e.status})` : ''}`);
        throw e;
      }
      let stopReason = 'end_turn';
      if (toolCalls.length) stopReason = 'tool_use';
      else if (blocked || REFUSAL_FINISH.has(finish)) stopReason = 'refusal';
      else if (finish === 'MAX_TOKENS') stopReason = 'max_tokens';
      return { text, toolCalls, stopReason, usage, raw: null };
    },

    structured: (args) => structured(provider, args),
  };
  return provider;
};

module.exports = { createGemini, toGemini, toGeminiSchema, AiError };
