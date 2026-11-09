/**
 * The agentic loop (manual, streaming): call the model, run any read-only tools
 * it asks for against the caller's freshly re-read scope, feed the results
 * back, repeat until it answers or a limit is hit.
 *
 * Limits: max tool iterations, per-user daily token budget (checked between
 * model calls), output-size cap on every tool result, abort when the client
 * disconnects. Every tool call is written to audit_logs.
 *
 * `provider` is a services/ai provider: one `chat()` call is one model turn.
 * Messages are provider-neutral blocks (text / tool_use / tool_result), the same
 * shape that is stored in assistant_messages.
 */
const { scopeFor } = require('../../utils/scope');
const { logAudit } = require('../audit.service');
const { toolsFor, toolDefs, labelFor, wrapResult, cleanInput } = require('./tools');
const { ToolError } = require('./queries');
const { SYSTEM_PROMPT } = require('./prompt');
const store = require('./store');
const usage = require('./usage');
const { isAbort } = require('../ai/errors');
const { assistantContent } = require('../ai/structured');

class AgentAbort extends Error {}


/**
 * Run one user turn. `history` is the model-ready prior conversation. Returns
 * { text, inputTokens, outputTokens, stopReason }.
 */
const runTurn = async ({
  provider, cfg, user, conversationId, history, userText, contextLine, emit, signal, remainingTokens, ip,
}) => {
  const userContent = [{ type: 'text', text: `${contextLine}\n\n${userText}` }];
  await store.append(conversationId, [{ role: 'user', content: userContent, text: userText }]);
  const messages = [...history, { role: 'user', content: userContent }];

  const first = await scopeFor(user);
  if (!first) throw new ToolError('Account not found or deactivated');
  const tools = toolsFor(first);
  const defs = toolDefs(tools);

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

    let res;
    try {
      res = await provider.chat({
        system: SYSTEM_PROMPT,
        messages,
        tools: defs,
        signal,
        onText: (delta) => emit({ type: 'text', delta }),
        maxTokens: cfg.maxOutputTokens,
        effort: cfg.effort,
        thinking: true,
      });
    } catch (err) {
      if (isAbort(err, signal)) throw new AgentAbort();
      throw err;
    }

    const inTok = res.usage.input;
    const outTok = res.usage.output;
    inputTokens += inTok;
    outputTokens += outTok;
    await usage.record(user.id, { input: inTok, output: outTok });

    stopReason = res.stopReason;
    const toolUses = res.toolCalls;
    const text = res.text;
    const content = assistantContent(res);

    if (stopReason === 'refusal') {
      emit({ type: 'notice', message: 'I cannot help with that request.' });
      finalText = text;
      break;
    }

    if (stopReason !== 'tool_use' || toolUses.length === 0) {
      if (stopReason === 'max_tokens') emit({ type: 'notice', message: 'The answer was cut short. Ask me to continue or narrow the question.' });
      finalText = text;
      // A tool call cut off by max_tokens is never run or stored.
      const keep = content.filter((b) => b.type !== 'tool_use');
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

    // `raw` (provider-specific blocks such as reasoning) is replayed within this turn only, never stored.
    const assistantTurn = { role: 'assistant', content, raw: res.raw };
    const resultTurn = { role: 'user', content: results };
    await store.append(conversationId, [
      { role: 'assistant', content, text, inputTokens: inTok, outputTokens: outTok },
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
