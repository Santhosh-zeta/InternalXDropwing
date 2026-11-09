/**
 * Structured output through native tool / function calling, the same on every
 * provider: the model is given one tool whose input schema is the wanted shape
 * and the server checks the call was made (retrying once). Providers that
 * support it are told to call that tool (`forceTool`); Anthropic's current
 * models reject forced tool choice, so its adapter ignores the hint and the
 * prompt asks for the call.
 *
 * Returns { data, usage: { input, output }, stopReason }. `data` is null when the
 * model refused, ran out of tokens or never made the call.
 */
const assistantContent = (result) => [
  ...(result.text ? [{ type: 'text', text: result.text }] : []),
  ...result.toolCalls.map((c) => ({ type: 'tool_use', id: c.id, name: c.name, input: c.input, ...(c.meta ? { meta: c.meta } : {}) })),
];

const structured = async (provider, { system, user, schema, name, description = 'Return the result.', maxTokens = 4096, effort = 'low', signal, onUsage, model, retryPrompt }) => {
  const tools = [{ name, description, input_schema: schema }];
  const messages = [{ role: 'user', content: user }];
  const usage = { input: 0, output: 0 };
  let stopReason = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await provider.chat({ system, messages, tools, forceTool: name, maxTokens, effort, signal, model });
    usage.input += res.usage.input;
    usage.output += res.usage.output;
    if (onUsage) await onUsage(res.usage);
    stopReason = res.stopReason;
    if (res.stopReason === 'refusal' || res.stopReason === 'max_tokens') return { data: null, usage, stopReason };
    const call = res.toolCalls.find((c) => c.name === name);
    if (call) return { data: call.input, usage, stopReason };
    const prior = assistantContent(res);
    messages.push(
      { role: 'assistant', content: prior.length ? prior : [{ type: 'text', text: '(no answer)' }] },
      { role: 'user', content: retryPrompt || `Call ${name} now.` },
    );
  }
  return { data: null, usage, stopReason };
};

module.exports = { structured, assistantContent };
