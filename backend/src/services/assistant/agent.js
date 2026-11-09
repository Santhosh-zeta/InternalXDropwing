/**
 * The agentic loop (manual, streaming): call the model, run any read-only tools
 * it asks for against the caller's freshly re-read scope, feed the results
 * back, repeat until it answers or a limit is hit.
 *
 * Limits: max tool iterations, per-user daily token budget (checked between
 * model calls), output-size cap on every tool result, abort when the client
 * disconnects. Every tool call is written to audit_logs.
 *
 * `client` is anything with `messages.stream(params, { signal })` returning
 * `.on('text', fn)` and `.finalMessage()` - the Anthropic SDK client, or a fake
 * in tests.
 */
const { scopeFor } = require('../../utils/scope');
const { logAudit } = require('../audit.service');
const { toolsFor, toolDefs, labelFor, wrapResult, cleanInput } = require('./tools');
const { ToolError } = require('./queries');
const { SYSTEM_PROMPT } = require('./prompt');
const store = require('./store');
const usage = require('./usage');

class AgentAbort extends Error {}

const textOf = (content) => content.filter((b) => b.type === 'text').map((b) => b.text).join('');
const isAbort = (err, signal) =>
  (signal && signal.aborted) || (err && (err.name === 'APIUserAbortError' || err.name === 'AbortError'));

/**
 * Run one user turn. `history` is the model-ready prior conversation. Returns
 * { text, inputTokens, outputTokens, stopReason }.
 */
const runTurn = async ({
  client, cfg, user, conversationId, history, userText, contextLine, emit, signal, remainingTokens, ip,
}) => {
  const userContent = [{ type: 'text', text: `${contextLine}\n\n${userText}` }];
  await store.append(conversationId, [{ role: 'user', content: userContent, text: userText }]);
  const messages = [...history, { role: 'user', content: userContent }];

  const first = await scopeFor(user);
  if (!first) throw new ToolError('Account not found or deactivated');
  const tools = toolsFor(first);
  const defs = toolDefs(tools);
  const system = [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }];

  let inputTokens = 0;
  let outputTokens = 0;
  let finalText = '';
  let stopReason = null;

  for (let iteration = 0; iteration < cfg.maxIterations; iteration += 1) {
    if (signal.aborted) throw new AgentAbort();
    if (remainingTokens - inputTokens - outputTokens <= 0) {
      emit({ type: 'notice', message: 'Daily usage limit reached. It resets tomorrow.' });
      stopReason = 'daily_limit';
      break;
    }

    const stream = client.messages.stream({
      model: cfg.model,
      max_tokens: cfg.maxOutputTokens,
      system,
      tools: defs,
      // Lowest thinking setting on Sonnet 5.5; keeps replayed history simple (no reasoning blocks to bind).
      thinking: { type: 'between_tools' },
      output_config: { effort: cfg.effort },
      messages,
    }, { signal });
    stream.on('text', (delta) => emit({ type: 'text', delta }));

    let message;
    try {
      message = await stream.finalMessage();
    } catch (err) {
      if (isAbort(err, signal)) throw new AgentAbort();
      throw err;
    }

    const u = message.usage || {};
    const inTok = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
    const outTok = u.output_tokens || 0;
    inputTokens += inTok;
    outputTokens += outTok;
    await usage.record(user.id, { input: inTok, output: outTok });

    stopReason = message.stop_reason;
    const toolUses = message.content.filter((b) => b.type === 'tool_use');
    const text = textOf(message.content);

    if (stopReason === 'refusal') {
      emit({ type: 'notice', message: 'I cannot help with that request.' });
      finalText = text;
      break;
    }

    if (stopReason !== 'tool_use' || toolUses.length === 0) {
      if (stopReason === 'max_tokens') emit({ type: 'notice', message: 'The answer was cut short. Ask me to continue or narrow the question.' });
      finalText = text;
      // A tool_use cut off by max_tokens is never run or stored.
      const keep = message.content.filter((b) => b.type !== 'tool_use');
      if (keep.length > 0) {
        await store.append(conversationId, [{ role: 'assistant', content: keep, text, inputTokens: inTok, outputTokens: outTok }]);
      }
      break;
    }

    // Run the tools. The scope is re-read for every call; a revoked or demoted
    // account loses access mid-conversation.
    const results = [];
    for (const block of toolUses) {
      if (signal.aborted) throw new AgentAbort();
      emit({ type: 'tool', id: block.id, name: block.name, label: labelFor(block.name), state: 'running' });
      let content;
      let ok = true;
      try {
        const scope = await scopeFor(user);
        if (!scope) throw new ToolError('Account not found or deactivated');
        const tool = toolsFor(scope).find((t) => t.name === block.name);
        if (!tool) throw new ToolError('Tool not available');
        const input = cleanInput(tool, block.input);
        content = wrapResult(await tool.run(scope, input));
        await logAudit(user.id, 'ASSISTANT_TOOL', 'assistant_conversation', conversationId, { tool: block.name, input }, ip);
      } catch (err) {
        ok = false;
        if (!(err instanceof ToolError)) console.error(`[assistant] tool ${block.name} failed:`, err.message);
        content = err instanceof ToolError ? err.message : 'The lookup failed. Tell the user it could not be completed.';
        await logAudit(user.id, 'ASSISTANT_TOOL_DENIED', 'assistant_conversation', conversationId, { tool: block.name, reason: String(content).slice(0, 120) }, ip);
      }
      results.push({ type: 'tool_result', tool_use_id: block.id, content, ...(ok ? {} : { is_error: true }) });
      emit({ type: 'tool', id: block.id, name: block.name, label: labelFor(block.name), state: ok ? 'done' : 'error' });
    }

    const assistantTurn = { role: 'assistant', content: message.content };
    const resultTurn = { role: 'user', content: results };
    await store.append(conversationId, [
      { ...assistantTurn, text, inputTokens: inTok, outputTokens: outTok },
      { ...resultTurn, text: null },
    ]);
    messages.push(assistantTurn, resultTurn);
    finalText = text;
    if (iteration === cfg.maxIterations - 1) {
      emit({ type: 'notice', message: 'I reached the lookup limit for one question. Ask a narrower follow-up to continue.' });
      stopReason = 'max_iterations';
      // Leave the history ending in tool_result; the next user turn follows it.
    }
  }

  return { text: finalText, inputTokens, outputTokens, stopReason };
};

module.exports = { runTurn, AgentAbort };
