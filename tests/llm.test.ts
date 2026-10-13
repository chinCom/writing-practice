import { createServer } from 'node:http';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { gradeWriting } from '@/lib/llm/grade';
import { feedback } from './fixtures/feedback';

let calls = 0;
let responseText = JSON.stringify(feedback);
let requestBody = '';
const server = createServer(async (request, response) => {
  for await (const chunk of request) requestBody += chunk;
  calls++;
  response.setHeader('Content-Type', 'application/json');
  response.end(
    JSON.stringify({
      id: 'test',
      choices: [{ message: { content: calls === 1 ? '' : responseText } }],
      usage: { prompt_tokens: 100, completion_tokens: 50, prompt_cache_hit_tokens: 40 },
    }),
  );
});
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
function options() {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server');
  return {
    apiKey: 'test-key',
    baseURL: 'http://127.0.0.1:' + address.port,
    model: 'test-model',
    mock: false,
  };
}
it('retries empty JSON once, validates feedback and records token usage', async () => {
  calls = 0;
  requestBody = '';
  const result = await gradeWriting('I goed to the beach.', options());
  expect(result.data).toMatchObject({ cefr_estimate: 'A2', safety_flag: false });
  expect(result.usage).toEqual({ promptTokens: 200, completionTokens: 100, cacheHitTokens: 80 });
  expect(result.model).toBe('test-model');
  expect(requestBody).toContain('<learner_text>');
  expect(requestBody).not.toContain('userId');
});
it('fails closed after two invalid responses', async () => {
  calls = 1;
  responseText = '{"scores": {}}';
  await expect(gradeWriting('A message.', options())).rejects.toThrow('LLM_INVALID_RESPONSE');
});
it('labels explicit mock results and never calls the provider', async () => {
  const result = await gradeWriting('A message.', { ...options(), mock: true });
  expect(result.mock).toBe(true);
  expect(result.model).toBe('mock');
});
