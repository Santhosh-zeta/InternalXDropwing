/**
 * Provider failures, reduced to a kind and a generic message that is safe to
 * show to users. Response bodies, keys and URLs never go into the error or the logs.
 */
const MESSAGES = {
  auth: 'The AI provider rejected the server\'s API key. Ask your administrator to check it.',
  rate_limit: 'The AI provider is busy or the account is out of quota. Please try again in a minute.',
  overloaded: 'The AI provider is temporarily unavailable. Please try again shortly.',
  timeout: 'The AI provider took too long to answer. Please try again.',
  network: 'Could not reach the AI provider. Please try again shortly.',
  blocked: 'The AI provider declined to answer that request.',
  bad_request: 'The AI provider could not process that request.',
  unknown: 'The assistant ran into a problem. Please try again.',
};

class AiError extends Error {
  constructor(kind, status) {
    super(`AI provider error: ${kind}${status ? ` (HTTP ${status})` : ''}`);
    this.name = 'AiError';
    this.kind = MESSAGES[kind] ? kind : 'unknown';
    this.status = status || null;
    this.userMessage = MESSAGES[this.kind];
  }
}

const kindForStatus = (status) => {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status === 408 || status === 504) return 'timeout';
  if (status >= 500) return 'overloaded';
  if (status >= 400) return 'bad_request';
  return 'unknown';
};

const fromStatus = (status) => new AiError(kindForStatus(status), status);

/** Anything thrown while calling a provider -> AiError (abort errors are handled by the caller first). */
const wrap = (err) => {
  if (err instanceof AiError) return err;
  if (err && Number.isInteger(err.status)) return fromStatus(err.status);
  if (err && (err.name === 'APIConnectionTimeoutError' || err.name === 'TimeoutError')) return new AiError('timeout');
  if (err && (err.name === 'APIConnectionError' || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND')) return new AiError('network');
  return new AiError('unknown');
};

/** The message a user may see for any error. */
const userMessage = (err) => (err instanceof AiError ? err.userMessage : MESSAGES.unknown);

const isAbort = (err, signal) =>
  !!((signal && signal.aborted) || (err && (err.name === 'APIUserAbortError' || err.name === 'AbortError')));

module.exports = { AiError, fromStatus, wrap, userMessage, isAbort, MESSAGES };
