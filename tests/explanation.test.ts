import { createServer } from 'node:http';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { explainCorrection } from '@/lib/llm/explain';

let calls = 0;
let body = '';
let content = JSON.stringify({
  why_original: 'The activity happened last weekend. Use a past-tense verb.',
  why_suggestion: 'Went is the past form of go. It shows a finished activity.',
});
let finishReason = 'stop';
let hang = false;
const server = createServer(async (request, response) => {
  body = '';
  for await (const chunk of request) body += chunk;
  calls++;
  if (hang) return;
  response.setHeader('Content-Type', 'application/json');
  response.end(
    JSON.stringify({
      choices: [{ message: { content }, finish_reason: finishReason }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    }),
  );
});
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
function options() {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server');
  return {
    apiKey: 'test',
    baseURL: 'http://127.0.0.1:' + address.port,
    model: 'test',
    mock: false,
  };
}
const input = {
  text: 'Last weekend I go to the beach.',
  original: 'go',
  suggestion: 'went',
  tag: 'verb-tense',
  explanation: 'Use the past tense.',
};
it('explains one saved correction with a short non-thinking request and no account data', async () => {
  calls = 0;
  const result = await explainCorrection(input, options());
  expect(result.data.why_suggestion).toContain('past form of go');
  expect(calls).toBe(1);
  const request = JSON.parse(body);
  expect(request.thinking).toEqual({ type: 'disabled' });
  expect(request.max_tokens).toBeLessThanOrEqual(600);
  expect(JSON.parse(request.messages[1].content)).toEqual(input);
  expect(body).not.toContain('userId');
});
it('rejects extra fields and truncated output after at most one validation retry', async () => {
  const saved = content;
  try {
    calls = 0;
    content = JSON.stringify({
      why_original: 'Wrong.',
      why_suggestion: 'Correct.',
      userId: 'forged',
    });
    await expect(explainCorrection(input, options())).rejects.toThrow('LLM_INVALID_RESPONSE');
    expect(calls).toBe(2);
    content = saved;
    finishReason = 'length';
    await expect(explainCorrection(input, options())).rejects.toThrow('LLM_INVALID_RESPONSE');
  } finally {
    content = saved;
    finishReason = 'stop';
  }
});
it('bounds a stalled explanation without automatic transport retries', async () => {
  calls = 0;
  hang = true;
  try {
    await expect(explainCorrection(input, { ...options(), timeoutMs: 100 })).rejects.toThrow(
      'LLM_TIMEOUT',
    );
    expect(calls).toBe(1);
  } finally {
    hang = false;
  }
});
