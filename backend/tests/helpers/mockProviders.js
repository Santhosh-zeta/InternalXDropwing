/**
 * Local HTTP servers that speak the OpenAI Chat Completions and Gemini
 * streamGenerateContent wire formats, for provider tests. Each POST consumes the
 * next scripted step; GET /models answers with `models`. Every request is recorded.
 *
 * step = { status, headers, body (JSON for non-2xx), events: [objects sent as SSE `data:`],
 *          hang: true (send headers then never finish), delayMs }
 */
const http = require('http');

const startMock = async ({ steps = [], models = {}, modelsStatus = 200 } = {}) => {
  const calls = [];
  let i = 0;
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (d) => { raw += d; });
    req.on('end', () => {
      let body = null;
      try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
      calls.push({ method: req.method, url: req.url, headers: req.headers, body });
      if (req.method === 'GET' && /\/models(\?|$)/.test(req.url)) {
        res.writeHead(modelsStatus, { 'content-type': 'application/json' });
        return res.end(JSON.stringify(modelsStatus === 200 ? models : { error: { message: 'nope' } }));
      }
      const step = typeof steps[Math.min(i, steps.length - 1)] === 'function'
        ? steps[Math.min(i, steps.length - 1)](body, i) : steps[Math.min(i, steps.length - 1)];
      i += 1;
      if (!step) { res.writeHead(500); return res.end(); }
      if (step.status && step.status >= 400) {
        res.writeHead(step.status, { 'content-type': 'application/json', ...(step.headers || {}) });
        return res.end(JSON.stringify(step.body || { error: { message: 'secret provider detail' } }));
      }
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const send = () => {
        for (const e of step.events || []) res.write(`data: ${JSON.stringify(e)}\n\n`);
        if (step.done) res.write('data: [DONE]\n\n');
        if (!step.hang) res.end();
      };
      if (step.delayMs) setTimeout(send, step.delayMs); else send();
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    calls,
    posts: () => calls.filter((c) => c.method === 'POST'),
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }),
  };
};

// ── OpenAI wire format ──
const oaText = (...parts) => [
  ...parts.map((t) => ({ choices: [{ index: 0, delta: { content: t } }] })),
  { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
  { choices: [], usage: { prompt_tokens: 100, completion_tokens: 20 } },
];
const oaTool = (name, args, id = 'call_1', lead = null) => [
  ...(lead ? [{ choices: [{ index: 0, delta: { content: lead } }] }] : []),
  { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id, type: 'function', function: { name, arguments: '' } }] } }] },
  { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: JSON.stringify(args).slice(0, 5) } }] } }] },
  { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: JSON.stringify(args).slice(5) } }] } }] },
  { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
  { choices: [], usage: { prompt_tokens: 100, completion_tokens: 20 } },
];

// ── Gemini wire format ──
const gmUsage = { promptTokenCount: 100, candidatesTokenCount: 20 };
const gmText = (...parts) => parts.map((t, n) => ({
  candidates: [{ content: { role: 'model', parts: [{ text: t }] }, ...(n === parts.length - 1 ? { finishReason: 'STOP' } : {}) }],
  usageMetadata: gmUsage,
}));
const gmTool = (name, args, { lead = null, signature = null } = {}) => [{
  candidates: [{
    content: { role: 'model', parts: [...(lead ? [{ text: lead }] : []), { functionCall: { name, args }, ...(signature ? { thoughtSignature: signature } : {}) }] },
    finishReason: 'STOP',
  }],
  usageMetadata: gmUsage,
}];

module.exports = { startMock, oaText, oaTool, gmText, gmTool };
