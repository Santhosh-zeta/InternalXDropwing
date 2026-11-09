/** fetch + Server-Sent Events helpers shared by the OpenAI and Gemini providers. */
const { AiError, fromStatus } = require('./errors');

const RETRY_STATUS = new Set([429, 502, 503, 529]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const abortError = () => { const e = new Error('aborted'); e.name = 'AbortError'; return e; };

/**
 * HTTP call with a timeout and the caller's abort signal. Retries once on 429/502/503/529
 * (honouring a short Retry-After). Returns the Response for a 2xx; otherwise throws an AiError
 * that never carries the response body, or an AbortError when the caller aborted.
 */
const request = async (url, { method = 'POST', headers = {}, body, signal, timeoutMs, retries = 1 }) => {
  for (let attempt = 0; ; attempt += 1) {
    const timeout = AbortSignal.timeout(timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: combined,
      });
    } catch (err) {
      if (signal && signal.aborted) throw abortError();
      if (timeout.aborted) throw new AiError('timeout');
      throw new AiError('network');
    }
    if (res.ok) return res;
    let detail = '';
    try { detail = JSON.stringify(await res.json()); } catch { /* the body is only used to classify */ }
    if (attempt < retries && RETRY_STATUS.has(res.status) && !(signal && signal.aborted)) {
      await sleep(Math.min(2000, (parseFloat(res.headers.get('retry-after')) || 0.5) * 1000));
      continue;
    }
    // Gemini reports a bad key as HTTP 400 API_KEY_INVALID.
    if (res.status === 400 && detail.includes('API_KEY_INVALID')) throw new AiError('auth', 400);
    throw fromStatus(res.status);
  }
};

const dataOf = (block) => block.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart()).join('\n');

/** Parse an SSE body into its JSON `data:` payloads (a literal [DONE] is skipped). */
async function* sseEvents(res, signal, timeoutMs) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const timeout = AbortSignal.timeout(timeoutMs);
  const guard = () => {
    if (signal && signal.aborted) throw abortError();
    if (timeout.aborted) throw new AiError('timeout');
  };
  const parse = (block) => {
    const data = dataOf(block);
    if (!data || data === '[DONE]') return null;
    try { return JSON.parse(data); } catch { return null; }
  };
  let buf = '';
  try {
    for (;;) {
      guard();
      let chunk;
      try { chunk = await reader.read(); } catch { guard(); throw new AiError('network'); }
      if (chunk.done) break;
      buf += decoder.decode(chunk.value, { stream: true });
      let m;
      while ((m = /\r?\n\r?\n/.exec(buf))) {
        const evt = parse(buf.slice(0, m.index));
        buf = buf.slice(m.index + m[0].length);
        if (evt) yield evt;
      }
    }
    const evt = parse(buf);
    if (evt) yield evt;
  } finally {
    reader.cancel().catch(() => {});
  }
}

module.exports = { request, sseEvents };
