/**
 * The assistant on every provider: selection, the normalized tool-call round trip,
 * scope enforcement, caps, abort, errors, model fallback and structured output.
 * OpenAI and Gemini are exercised over real HTTP against local servers that speak
 * their wire formats (tests/helpers/mockProviders.js); Anthropic is covered by
 * assistant.test.js. No real provider is ever contacted.
 */
const { setup } = require('./helpers/app');
const { parseSse, sseParser } = require('./helpers/fakeAnthropic');
const { startMock, oaText, oaTool, gmText, gmTool } = require('./helpers/mockProviders');
const ai = require('../src/services/ai');
const { selectProvider, probe, setProviderForTests } = ai;
const { clearModelCache, pickBest } = require('../src/services/ai/models');
const { createOpenAI } = require('../src/services/ai/openai');
const { createGemini, toGeminiSchema } = require('../src/services/ai/gemini');
const { runTurn, AgentAbort } = require('../src/services/assistant/agent');
const store = require('../src/services/assistant/store');
const { config } = require('../src/services/assistant/client');

const OA_KEY = 'sk-openai-SECRETKEY123456';
const GM_KEY = 'AIza-GEMINI-SECRETKEY654321';
const ENV = ['AI_PROVIDER', 'AI_MODEL', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'OPENAI_BASE_URL', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_BASE_URL',
  'ASSISTANT_DAILY_TOKEN_CAP', 'ASSISTANT_MAX_TOOL_ITERATIONS', 'ASSISTANT_MODEL'];

let t;
let c;
const A = {};
let mock;
let logs;
const spies = [];

const chat = (who, body) => A[who].post('/api/assistant/chat').send(body).buffer(true).parse(sseParser);
const types = (events) => events.map((e) => e.type);
const textOf = (events) => events.filter((e) => e.type === 'text').map((e) => e.delta).join('');

const useOpenAI = (m, extra = {}) => {
  process.env.OPENAI_API_KEY = OA_KEY;
  process.env.OPENAI_BASE_URL = `${m.url}/v1`;
  Object.assign(process.env, extra);
};
const useGemini = (m, extra = {}) => {
  process.env.GEMINI_API_KEY = GM_KEY;
  process.env.GEMINI_BASE_URL = `${m.url}/v1beta`;
  Object.assign(process.env, extra);
};
const OA_MODELS = { data: [{ id: 'gpt-5' }, { id: 'gpt-5-mini' }, { id: 'text-embedding-3-large' }] };
const GM_MODELS = { models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] }] };

beforeAll(async () => {
  t = await setup();
  c = t.ctx;
  for (const k of ['dd.l5', 'dd.l7', 'fx.l5', 'fx.l7', 'dd.l7b', 'l1']) A[k] = await t.as(k);
});
beforeEach(() => {
  logs = [];
  for (const m of ['log', 'warn', 'error']) spies.push(jest.spyOn(console, m).mockImplementation((...a) => { logs.push(a.map(String).join(' ')); }));
});
afterEach(async () => {
  spies.splice(0).forEach((s) => s.mockRestore());
  ENV.forEach((k) => delete process.env[k]);
  setProviderForTests(null);
  clearModelCache();
  if (mock) { await mock.close(); mock = null; }
});
afterAll(async () => { await t.close(); });

describe('provider selection', () => {
  test('auto-detects by key with precedence anthropic > openai > gemini', () => {
    expect(selectProvider({})).toBeNull();
    expect(selectProvider({ GEMINI_API_KEY: 'g' }).name).toBe('gemini');
    expect(selectProvider({ GOOGLE_API_KEY: 'g' }).name).toBe('gemini');
    expect(selectProvider({ GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o' }).name).toBe('openai');
    expect(selectProvider({ GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o', ANTHROPIC_API_KEY: 'a' }).name).toBe('anthropic');
  });

  test('AI_PROVIDER wins, needs its key, and an unknown value falls back to auto-detect', () => {
    expect(selectProvider({ AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'g', ANTHROPIC_API_KEY: 'a' }).name).toBe('gemini');
    expect(selectProvider({ AI_PROVIDER: 'openai', ANTHROPIC_API_KEY: 'a' })).toBeNull();
    expect(selectProvider({ AI_PROVIDER: 'bogus', OPENAI_API_KEY: 'o' }).name).toBe('openai');
  });

  test('getProvider reflects the environment, logs the choice, and AI_MODEL overrides the default', () => {
    expect(ai.getProvider()).toBeNull();
    process.env.OPENAI_API_KEY = OA_KEY;
    expect(ai.getProvider().name).toBe('openai');
    expect(ai.getProvider().status().model).toBe('gpt-5');
    process.env.AI_MODEL = 'gpt-test';
    expect(ai.getProvider().status().model).toBe('gpt-test');
    delete process.env.AI_MODEL;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-x';
    expect(ai.getProvider().status().provider).toBe('anthropic');
    expect(ai.getProvider().status().model).toBe('claude-sonnet-5-5');
    expect(logs.some((l) => /using provider openai/.test(l))).toBe(true);
    expect(logs.join('\n')).not.toContain(OA_KEY);
  });

  test('model preference list', () => {
    expect(pickBest('openai', ['gpt-5-mini', 'gpt-5.1', 'gpt-5.1-2025-11-13', 'gpt-4o', 'gpt-5-codex'])).toBe('gpt-5.1');
    expect(pickBest('gemini', ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-3-pro-preview', 'text-embedding-004'])).toBe('gemini-3-pro-preview');
    expect(pickBest('openai', ['whisper-1'])).toBeNull();
  });
});

describe('status endpoint and not configured', () => {
  test('no key: not configured, admin hint names all three keys, chat is 503', async () => {
    const admin = (await A.l1.get('/api/assistant/status')).body.data;
    expect(admin).toMatchObject({ configured: false, provider: null, model: null });
    expect(admin.setupHint).toMatch(/ANTHROPIC_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY/);
    expect((await A['dd.l7'].post('/api/assistant/chat').send({ message: 'hi' })).status).toBe(503);
    expect((await A['dd.l5'].post('/api/assistant/notes/propose').send({ notes: 'x'.repeat(30) })).status).toBe(503);
  });

  test('configured: provider and model, never a secret', async () => {
    useGemini({ url: 'http://127.0.0.1:1' });
    const res = await A.l1.get('/api/assistant/status');
    expect(res.body.data).toMatchObject({ configured: true, provider: 'gemini', model: 'gemini-2.5-flash', setupHint: null });
    expect(JSON.stringify(res.body)).not.toContain(GM_KEY);
  });
});

describe('OpenAI over HTTP', () => {
  test('streams text, round-trips a tool call, sends the expected wire format', async () => {
    mock = await startMock({
      models: OA_MODELS,
      steps: [{ events: oaTool('my_tasks', { status: 'open', venture_id: 2 }, 'call_abc', 'Checking. ') }, { events: oaText('You have ', '1 task.') }],
    });
    useOpenAI(mock);
    const res = await chat('dd.l7', { message: 'What is overdue?' });
    const events = parseSse(res.body);
    expect(types(events)).toEqual(['conversation', 'text', 'tool', 'tool', 'text', 'text', 'done']);
    expect(textOf(events)).toBe('Checking. You have 1 task.');
    expect(events.at(-1).usage).toEqual({ input_tokens: 200, output_tokens: 40 });

    const [first, second] = mock.posts();
    expect(first.url).toBe('/v1/chat/completions');
    expect(first.headers.authorization).toBe(`Bearer ${OA_KEY}`);
    expect(first.url).not.toContain(OA_KEY);
    expect(first.body).toMatchObject({ model: 'gpt-5', stream: true, max_tokens: 4096 });
    expect(first.body.messages[0]).toMatchObject({ role: 'system' });
    expect(first.body.messages[0].content).toMatch(/Ask InternalX/);
    expect(first.body.messages[1].content).toMatch(/^<context>Today is/);
    expect(first.body.tools.map((x) => x.function.name)).toContain('my_tasks');
    expect(first.body.tools.every((x) => x.type === 'function' && x.function.parameters.type === 'object')).toBe(true);
    expect(first.body.tools.map((x) => x.function.name)).not.toContain('finance_summary');

    // second request: assistant tool_calls (args reassembled from streamed fragments) then a tool message
    const msgs = second.body.messages;
    const assistant = msgs.at(-2);
    const tool = msgs.at(-1);
    expect(assistant.tool_calls[0]).toMatchObject({ id: 'call_abc', type: 'function', function: { name: 'my_tasks' } });
    expect(JSON.parse(assistant.tool_calls[0].function.arguments)).toEqual({ status: 'open', venture_id: 2 });
    expect(tool).toMatchObject({ role: 'tool', tool_call_id: 'call_abc' });
    const payload = JSON.parse(tool.content.replace(/\\u003c/g, '<'));
    expect(payload.untrusted_data).toBe(true);
    expect(payload.data.tasks.map((x) => x.id)).toEqual([c.tasks['dd.t_l7']]); // the injected venture_id never reached the query

    // stored in the neutral format
    const rows = await t.pool.query('SELECT role, content FROM assistant_messages WHERE conversation_id = $1 ORDER BY id', [events[0].id]);
    expect(rows.rows.map((r) => r.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
    expect(rows.rows[1].content.map((b) => b.type)).toEqual(['text', 'tool_use']);
    expect(rows.rows[1].content[1]).toMatchObject({ id: 'call_abc', name: 'my_tasks' });
    expect(rows.rows[2].content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'call_abc' });
    const audit = await t.pool.query("SELECT details FROM audit_logs WHERE action_type = 'ASSISTANT_TOOL' AND entity_id = $1", [events[0].id]);
    expect(JSON.parse(audit.rows[0].details)).toEqual({ tool: 'my_tasks', input: { status: 'open' } });
    expect(logs.join('\n')).not.toContain(OA_KEY);
  });

  test('the official endpoint gets max_completion_tokens, a gateway gets max_tokens', async () => {
    mock = await startMock({ models: OA_MODELS, steps: [{ events: oaText('ok') }] });
    const gw = createOpenAI({ apiKey: OA_KEY, baseURL: `${mock.url}/v1` });
    await gw.chat({ system: 's', messages: [{ role: 'user', content: 'hi' }] });
    expect(mock.posts()[0].body.max_tokens).toBe(4096);
    expect(mock.posts()[0].body.max_completion_tokens).toBeUndefined();
  });

  test('a conversation started on OpenAI continues on Gemini (neutral history)', async () => {
    mock = await startMock({
      models: OA_MODELS,
      steps: [{ events: oaTool('my_tasks', {}, 'call_sw') }, { events: oaText('First answer.') }],
    });
    useOpenAI(mock);
    const convId = parseSse((await chat('dd.l7b', { message: 'one' })).body)[0].id;
    await mock.close();
    ENV.forEach((k) => delete process.env[k]);

    mock = await startMock({ models: GM_MODELS, steps: [{ events: gmText('Second answer.') }] });
    useGemini(mock);
    const events = parseSse((await chat('dd.l7b', { message: 'two', conversationId: convId })).body);
    expect(textOf(events)).toBe('Second answer.');
    const contents = mock.posts()[0].body.contents;
    expect(contents.map((x) => x.role)).toEqual(['user', 'model', 'user', 'model', 'user']);
    expect(contents[1].parts.find((p) => p.functionCall).functionCall.name).toBe('my_tasks');
    expect(contents[2].parts[0].functionResponse.name).toBe('my_tasks');
  });
});

describe('Gemini over HTTP', () => {
  test('streams text, round-trips a function call with its thought signature, keeps the key out of the URL', async () => {
    mock = await startMock({
      models: GM_MODELS,
      steps: [{ events: gmTool('my_tasks', { status: 'open', venture_id: 2 }, { lead: 'Checking. ', signature: 'sig-xyz' }) }, { events: gmText('You have ', '1 task.') }],
    });
    useGemini(mock);
    const res = await chat('dd.l7', { message: 'What is overdue?' });
    const events = parseSse(res.body);
    expect(types(events)).toEqual(['conversation', 'text', 'tool', 'tool', 'text', 'text', 'done']);
    expect(textOf(events)).toBe('Checking. You have 1 task.');
    expect(events.at(-1).usage).toEqual({ input_tokens: 200, output_tokens: 40 });

    const [first, second] = mock.posts();
    expect(first.url).toBe('/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse');
    expect(first.url).not.toContain(GM_KEY);
    expect(first.headers['x-goog-api-key']).toBe(GM_KEY);
    expect(first.body.systemInstruction.parts[0].text).toMatch(/Ask InternalX/);
    expect(first.body.generationConfig.maxOutputTokens).toBe(4096);
    const decls = first.body.tools[0].functionDeclarations;
    expect(decls.map((d) => d.name)).toContain('my_tasks');
    expect(JSON.stringify(decls)).not.toMatch(/additionalProperties/);

    const contents = second.body.contents;
    const modelTurn = contents.at(-2);
    expect(modelTurn.role).toBe('model');
    const call = modelTurn.parts.find((p) => p.functionCall);
    expect(call.functionCall).toEqual({ name: 'my_tasks', args: { status: 'open', venture_id: 2 } });
    expect(call.thoughtSignature).toBe('sig-xyz');
    const resp = contents.at(-1).parts[0].functionResponse;
    expect(resp.name).toBe('my_tasks');
    expect(JSON.parse(resp.response.output.replace(/\\u003c/g, '<')).data.tasks.map((x) => x.id)).toEqual([c.tasks['dd.t_l7']]);
    expect(logs.join('\n')).not.toContain(GM_KEY);
  });

  test('GOOGLE_API_KEY works as the key', async () => {
    mock = await startMock({ models: GM_MODELS, steps: [{ events: gmText('hi') }] });
    process.env.GOOGLE_API_KEY = GM_KEY;
    process.env.GEMINI_BASE_URL = `${mock.url}/v1beta`;
    expect(parseSse((await chat('dd.l7', { message: 'hi' })).body).at(-1).type).toBe('done');
    expect(mock.posts()[0].headers['x-goog-api-key']).toBe(GM_KEY);
  });

  test('schema translation drops what Gemini rejects and keeps nullability', () => {
    const out = toGeminiSchema({
      type: 'object', additionalProperties: false, required: ['a'],
      properties: { a: { type: ['string', 'null'] }, p: { type: ['string', 'null'], enum: ['x', null] }, q: { type: 'string', minLength: 2, maxLength: 9 } },
    });
    expect(out).toEqual({ type: 'object', required: ['a'], properties: { a: { type: 'string', nullable: true }, p: { type: 'string', nullable: true, enum: ['x'] }, q: { type: 'string' } } });
  });
});

describe.each([
  ['openai', useOpenAI, () => ({ models: OA_MODELS }), (name, args) => oaTool(name, args, 'call_x'), (x) => oaText(x)],
  ['gemini', useGemini, () => ({ models: GM_MODELS }), (name, args) => gmTool(name, args), (x) => gmText(x)],
])('%s: scope, caps and limits go through the same loop', (_name, use, base, toolEvents, textEvents) => {
  test('a cross-venture project id is refused and the result never contains the data', async () => {
    mock = await startMock({ ...base(), steps: [{ events: toolEvents('project_summary', { project_id: c.projects['fx.p1'] }) }, { events: textEvents('I could not access that project.') }] });
    use(mock);
    const events = parseSse((await chat('dd.l5', { message: 'Summarize the Fenixa project' })).body);
    expect(events.find((e) => e.type === 'tool' && e.state === 'error')).toBeTruthy();
    const body = mock.posts()[1].body;
    const result = JSON.stringify(body.messages ? body.messages.at(-1) : body.contents.at(-1)); // the tool result turn only
    expect(result).toContain('not found');
    expect(result).not.toMatch(/Fenixa/);
    const audit = await t.pool.query("SELECT 1 FROM audit_logs WHERE action_type = 'ASSISTANT_TOOL_DENIED' AND user_id = $1 AND details LIKE '%project_summary%'", [A['dd.l5'].id]);
    expect(audit.rowCount).toBeGreaterThan(0);
  });

  test('a tool the user was never offered is refused', async () => {
    mock = await startMock({ ...base(), steps: [{ events: toolEvents('finance_summary', {}) }, { events: textEvents('ok') }] });
    use(mock);
    const events = parseSse((await chat('dd.l7', { message: 'budget?' })).body);
    expect(events.find((e) => e.type === 'tool' && e.state === 'error')).toBeTruthy();
    expect(JSON.stringify(mock.posts()[1].body)).toContain('Tool not available');
    expect(JSON.stringify(mock.posts()[0].body)).not.toContain('finance_summary');
  });

  test('max tool iterations and the daily token cap stop the loop', async () => {
    await t.pool.query('DELETE FROM assistant_usage WHERE user_id = ANY($1)', [[A['fx.l5'].id, A['fx.l7'].id]]);
    mock = await startMock({ ...base(), steps: [(b, i) => ({ events: toolEvents('my_tasks', { limit: i + 1 }) })] });
    use(mock, { ASSISTANT_MAX_TOOL_ITERATIONS: '2' });
    const events = parseSse((await chat('fx.l5', { message: 'forever' })).body);
    expect(mock.posts()).toHaveLength(2);
    expect(events.find((e) => e.type === 'notice').message).toMatch(/lookup limit/);

    delete process.env.ASSISTANT_MAX_TOOL_ITERATIONS;
    process.env.ASSISTANT_DAILY_TOKEN_CAP = '200';
    const before = mock.posts().length;
    const capped = parseSse((await chat('fx.l7', { message: 'loop' })).body);
    expect(mock.posts().length - before).toBe(2); // 120 per call: the second call crosses 200
    expect(capped.some((e) => e.type === 'notice' && /limit/.test(e.message))).toBe(true);
  });

  test('daily message cap blocks before any provider call', async () => {
    mock = await startMock({ ...base(), steps: [{ events: textEvents('ok') }] });
    use(mock);
    await t.pool.query('INSERT INTO assistant_usage (user_id, messages, input_tokens, output_tokens) VALUES ($1, 100, 0, 0) ON CONFLICT (user_id, day) DO UPDATE SET messages = 100', [A['dd.l7b'].id]);
    const res = await A['dd.l7b'].post('/api/assistant/chat').send({ message: 'hi' });
    expect(res.status).toBe(429);
    expect(mock.posts()).toHaveLength(0);
  });

  test('aborting mid-stream stops the loop and stores no dangling tool call', async () => {
    mock = await startMock({ ...base(), steps: [{ events: [], hang: true }] });
    use(mock);
    const controller = new AbortController();
    const conv = await store.createConversation(A['dd.l7'].id, 'abort test');
    const run = runTurn({
      provider: ai.getProvider(), cfg: config(), user: { id: A['dd.l7'].id }, conversationId: conv.id, history: [],
      userText: 'go', contextLine: '<context>x</context>', emit: () => {}, signal: controller.signal, remainingTokens: 1e6, ip: null,
    });
    setTimeout(() => controller.abort(), 150);
    await expect(run).rejects.toBeInstanceOf(AgentAbort);
    const rows = await t.pool.query('SELECT role FROM assistant_messages WHERE conversation_id = $1', [conv.id]);
    expect(rows.rows.map((r) => r.role)).toEqual(['user']);
  });
});

describe('provider errors are friendly and leak nothing', () => {
  const cases = [
    ['openai', useOpenAI, OA_MODELS, 'models', { status: 401 }, /rejected the server's API key/],
    ['openai', useOpenAI, OA_MODELS, 'models', { status: 403 }, /rejected the server's API key/],
    ['openai', useOpenAI, OA_MODELS, 'models', { status: 429, headers: { 'retry-after': '0' } }, /busy or the account is out of quota/],
    ['openai', useOpenAI, OA_MODELS, 'models', { status: 503, headers: { 'retry-after': '0' } }, /temporarily unavailable/],
    ['gemini', useGemini, GM_MODELS, 'models', { status: 400, body: { error: { status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } } }, /rejected the server's API key/],
    ['gemini', useGemini, GM_MODELS, 'models', { status: 429, headers: { 'retry-after': '0' } }, /busy or the account is out of quota/],
    ['gemini', useGemini, GM_MODELS, 'models', { status: 500 }, /temporarily unavailable/],
  ];
  test.each(cases)('%s %j', async (name, use, models, _k, step, pattern) => {
    mock = await startMock({ models: name === 'openai' ? OA_MODELS : GM_MODELS, steps: [step] });
    use(mock);
    const events = parseSse((await chat('dd.l7', { message: 'hi' })).body);
    const err = events.at(-1);
    expect(err.type).toBe('error');
    expect(err.message).toMatch(pattern);
    const everything = JSON.stringify(events) + logs.join('\n');
    expect(everything).not.toContain(OA_KEY);
    expect(everything).not.toContain(GM_KEY);
    expect(everything).not.toMatch(/secret provider detail/);
  });

  test('a safety block is reported as a notice, a hung provider times out', async () => {
    mock = await startMock({ models: GM_MODELS, steps: [{ events: [{ promptFeedback: { blockReason: 'SAFETY' }, usageMetadata: { promptTokenCount: 5 } }] }] });
    useGemini(mock);
    expect(parseSse((await chat('dd.l7', { message: 'hi' })).body).find((e) => e.type === 'notice').message).toMatch(/cannot help/);
    await mock.close();

    mock = await startMock({ models: OA_MODELS, steps: [{ events: [], hang: true }] });
    const slow = createOpenAI({ apiKey: OA_KEY, baseURL: `${mock.url}/v1`, timeoutMs: 200 });
    await expect(slow.chat({ system: 's', messages: [{ role: 'user', content: 'hi' }] })).rejects.toMatchObject({ kind: 'timeout' });
    const slowG = createGemini({ apiKey: GM_KEY, baseURL: `${mock.url}/v1beta`, timeoutMs: 200 });
    await expect(slowG.chat({ system: 's', messages: [{ role: 'user', content: 'hi' }] })).rejects.toMatchObject({ kind: 'timeout' });
  });

  test('an unreachable provider is a network error, not a crash', async () => {
    const dead = createOpenAI({ apiKey: OA_KEY, baseURL: 'http://127.0.0.1:1/v1' });
    await expect(dead.chat({ system: 's', messages: [{ role: 'user', content: 'hi' }] })).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('model list and fallback', () => {
  test('a model missing from the account is replaced by the best available one (cached, logged)', async () => {
    mock = await startMock({ models: { data: [{ id: 'gpt-5-mini' }, { id: 'gpt-5.1' }, { id: 'text-embedding-3-large' }] }, steps: [{ events: oaText('a') }, { events: oaText('b') }] });
    useOpenAI(mock);
    await chat('dd.l7', { message: 'hi' });
    await chat('dd.l7', { message: 'again' });
    expect(mock.posts().map((p) => p.body.model)).toEqual(['gpt-5.1', 'gpt-5.1']);
    expect(mock.calls.filter((x) => x.method === 'GET')).toHaveLength(1);
    expect(logs.some((l) => /"gpt-5" is not available.*using "gpt-5.1"/.test(l))).toBe(true);
    expect((await A.l1.get('/api/assistant/status')).body.data.model).toBe('gpt-5.1');
  });

  test('an explicit AI_MODEL that exists is kept; a failing list falls back to the configured model', async () => {
    mock = await startMock({ models: OA_MODELS, steps: [{ events: oaText('a') }] });
    useOpenAI(mock, { AI_MODEL: 'gpt-5-mini' });
    await chat('dd.l7', { message: 'hi' });
    expect(mock.posts()[0].body.model).toBe('gpt-5-mini');
    await mock.close();
    clearModelCache();
    mock = await startMock({ modelsStatus: 404, steps: [{ events: oaText('a') }] });
    useOpenAI(mock, { AI_MODEL: 'my-local-model' });
    await chat('dd.l7', { message: 'hi' });
    expect(mock.posts()[0].body.model).toBe('my-local-model');
  });

  test('gemini picks from generateContent models only', async () => {
    mock = await startMock({
      models: { models: [{ name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3-pro-embed', supportedGenerationMethods: ['embedContent'] }] },
      steps: [{ events: gmText('a') }],
    });
    useGemini(mock);
    await chat('dd.l7', { message: 'hi' });
    expect(mock.posts()[0].url).toContain('/models/gemini-2.0-flash:streamGenerateContent');
  });

  test('probe() reports a valid key, and a bad key without leaking anything', async () => {
    mock = await startMock({ models: OA_MODELS });
    useOpenAI(mock);
    expect(await probe()).toMatchObject({ configured: true, provider: 'openai', model: 'gpt-5', ok: true });
    await mock.close();
    clearModelCache();
    mock = await startMock({ modelsStatus: 401 });
    useOpenAI(mock);
    const bad = await probe();
    expect(bad).toMatchObject({ provider: 'openai', ok: false });
    expect(bad.error).toMatch(/rejected/);
    expect(JSON.stringify(bad)).not.toContain(OA_KEY);
    ENV.forEach((k) => delete process.env[k]);
    expect(await probe()).toMatchObject({ configured: false, ok: false });
  });
});

describe('notes to tasks through each provider', () => {
  const NOTES = 'Standup: Dropwing L7 will finish the homepage by 2030-03-01 for the Alpha project. Someone should review contracts.';
  const draft = (o) => ({ title: 'x task title', description: null, assignee_name: null, due_date: null, project_name: null, priority: null, ...o });
  const tasks = [draft({ title: 'Finish the homepage', assignee_name: 'Dropwing L7', due_date: '2030-03-01', project_name: 'Dropwing Design Studio Alpha', priority: 'high' })];
  const propose = () => A['dd.l5'].post('/api/assistant/notes/propose').send({ notes: NOTES });

  test('openai: forced function call, drafts matched inside the scope, nothing written', async () => {
    mock = await startMock({ models: OA_MODELS, steps: [{ events: oaTool('propose_tasks', { tasks }) }] });
    useOpenAI(mock);
    const before = (await t.pool.query('SELECT COUNT(*)::int n FROM tasks')).rows[0].n;
    const res = await propose();
    expect(res.status).toBe(200);
    expect(res.body.data.drafts[0]).toMatchObject({ title: 'Finish the homepage', due_date: '2030-03-01', priority: 'high' });
    expect(res.body.data.drafts[0].assignee).toMatchObject({ name: 'Dropwing L7' });
    expect(res.body.data.usage).toEqual({ input_tokens: 100, output_tokens: 20 });
    expect((await t.pool.query('SELECT COUNT(*)::int n FROM tasks')).rows[0].n).toBe(before);
    expect(mock.posts()[0].body.tool_choice).toEqual({ type: 'function', function: { name: 'propose_tasks' } });
    expect(mock.posts()[0].body.messages[1].content).toContain('<notes>');
    expect(JSON.stringify(mock.posts()[0].body)).not.toContain('Fenixa L7'); // other ventures' people are never sent
  });

  test('gemini: function calling mode ANY with a Gemini-safe schema; retries once when no call is made', async () => {
    mock = await startMock({ models: GM_MODELS, steps: [{ events: gmText('Sure, here you go...') }, { events: gmTool('propose_tasks', { tasks }) }] });
    useGemini(mock);
    const res = await propose();
    expect(res.status).toBe(200);
    expect(res.body.data.drafts).toHaveLength(1);
    expect(mock.posts()).toHaveLength(2);
    const body = mock.posts()[0].body;
    expect(body.toolConfig.functionCallingConfig).toEqual({ mode: 'ANY', allowedFunctionNames: ['propose_tasks'] });
    expect(JSON.stringify(body.tools)).not.toMatch(/additionalProperties|"type":\[/);
    expect(body.tools[0].functionDeclarations[0].parameters.properties.tasks.items.properties.due_date.nullable).toBe(true);
    expect(mock.posts()[1].body.contents.map((x) => x.role)).toEqual(['user', 'model', 'user']);
  });

  test('a provider failure is a 502 with a friendly message and no details', async () => {
    mock = await startMock({ models: OA_MODELS, steps: [{ status: 401 }] });
    useOpenAI(mock);
    const res = await propose();
    expect(res.status).toBe(502);
    expect(res.body.message).toMatch(/rejected the server's API key/);
    expect(JSON.stringify(res.body)).not.toContain(OA_KEY);
  });
});

describe('stored history stays readable', () => {
  test('vendor-only blocks in old rows are ignored on replay', async () => {
    const conv = await store.createConversation(A['dd.l7'].id, 'legacy');
    await store.append(conv.id, [
      { role: 'user', content: [{ type: 'text', text: 'q' }], text: 'q' },
      { role: 'assistant', content: [{ type: 'thinking', thinking: 'x', signature: 's' }, { type: 'text', text: 'a' }], text: 'a' },
    ]);
    const h = await store.loadHistory(conv.id, 40);
    expect(h.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(JSON.stringify(h)).not.toContain('thinking');
  });
});
