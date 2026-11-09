/**
 * A scripted stand-in for the Anthropic SDK client: `messages.stream(params, opts)`
 * returns `{ on('text', fn), finalMessage() }`, the only surface the assistant uses.
 * Each scripted step is a content array (or a function of the request params that
 * returns one); `stop_reason` is "tool_use" when the content holds a tool_use block.
 */
const makeFake = (steps, { usage = { input_tokens: 100, output_tokens: 20 }, stopReason } = {}) => {
  const calls = [];
  const client = {
    calls,
    messages: {
      // Non-streaming call (digest summary): same scripted steps.
      async create(params, opts = {}) {
        return this.stream(params, opts).finalMessage();
      },
      stream(params, opts = {}) {
        // Deep copy: the agent keeps appending to the same messages array.
        calls.push(JSON.parse(JSON.stringify(params)));
        const i = Math.min(calls.length - 1, steps.length - 1);
        const step = typeof steps[i] === 'function' ? steps[i](params, calls.length - 1) : steps[i];
        const content = Array.isArray(step) ? step : step.content;
        const handlers = [];
        return {
          on: (evt, fn) => { if (evt === 'text') handlers.push(fn); },
          finalMessage: async () => {
            if (opts.signal && opts.signal.aborted) {
              const e = new Error('aborted'); e.name = 'APIUserAbortError'; throw e;
            }
            if (step.beforeFinish) await step.beforeFinish(opts.signal);
            if (opts.signal && opts.signal.aborted) {
              const e = new Error('aborted'); e.name = 'APIUserAbortError'; throw e;
            }
            content.filter((b) => b.type === 'text').forEach((b) => handlers.forEach((h) => h(b.text)));
            return {
              id: `msg_${calls.length}`, role: 'assistant', model: params.model, content,
              stop_reason: step.stop_reason || stopReason || (content.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn'),
              usage: step.usage || usage,
            };
          },
        };
      },
    },
  };
  return client;
};

const text = (t) => ({ type: 'text', text: t });
const toolUse = (name, input = {}, id = `toolu_${Math.random().toString(36).slice(2, 10)}`) => ({ type: 'tool_use', id, name, input });

/** Parse a text/event-stream body into the JSON events. */
const parseSse = (body) => String(body).split('\n\n').filter((c) => c.startsWith('data: ')).map((c) => JSON.parse(c.slice(6)));

/** supertest parser that keeps the SSE body as a string. */
const sseParser = (res, cb) => { let d = ''; res.setEncoding('utf8'); res.on('data', (c) => { d += c; }); res.on('end', () => cb(null, d)); };

module.exports = { makeFake, text, toolUse, parseSse, sseParser };
