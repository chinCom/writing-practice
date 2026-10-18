import { createServer } from 'node:http';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  createProviderClient,
  requestJsonCompletion,
  type JsonCompletionRequest,
} from '@/lib/llm/client';
import { LlmError } from '@/lib/llm/errors';

type Reply = {
  content?: string;
  finish?: string;
  usage?: Record<string, unknown>;
  status?: number;
  hang?: boolean;
};
let replies: Reply[] = [];
let calls = 0;
const bodies: unknown[] = [];
const server = createServer(async (request, response) => {
  let body = '';
  for await (const chunk of request) body += chunk;
  bodies.push(JSON.parse(body));
  const reply = replies[calls++] ?? {};
  if (reply.hang) return;
  response.statusCode = reply.status ?? 200;
  response.setHeader('Content-Type', 'application/json');
  response.end(
    JSON.stringify({
      choices: [
        {
          message: { content: reply.content ?? '{"answer":"valid"}' },
          finish_reason: reply.finish ?? 'stop',
        },
      ],
      ...(reply.usage ? { usage: reply.usage } : {}),
    }),
  );
});
beforeAll(() => new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve)));
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
beforeEach(() => {
  calls = 0;
  replies = [];
  bodies.length = 0;
});
const request: JsonCompletionRequest = {
  model: 'test',
  messages: [{ role: 'user', content: 'Return JSON.' }],
  response_format: { type: 'json_object' },
  thinking: { type: 'disabled' },
  max_tokens: 100,
};
const schema = z.strictObject({ answer: z.literal('valid') });
function client() {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server');
  return createProviderClient({
    apiKey: 'synthetic',
    baseURL: 'http://127.0.0.1:' + address.port,
    model: 'test',
  });
}
function complete(signal = AbortSignal.timeout(2000)) {
  return requestJsonCompletion(client(), request, signal, (value) => schema.parse(value));
}

it('counts both attempts and prefers provider cache usage over standard fallback', async () => {
  replies = [
    {
      content: '',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 2,
        prompt_cache_hit_tokens: 7,
        prompt_tokens_details: { cached_tokens: 99 },
      },
    },
    {
      usage: {
        prompt_tokens: 20,
        completion_tokens: 3,
        prompt_tokens_details: { cached_tokens: 8 },
      },
    },
  ];
  expect(await complete()).toEqual({
    data: { answer: 'valid' },
    usage: { promptTokens: 30, completionTokens: 5, cacheHitTokens: 15 },
  });
  expect(calls).toBe(2);
  expect(bodies).toEqual([request, request]);
});
it('returns zero usage when the provider omits token metadata', async () => {
  expect((await complete()).usage).toEqual({
    promptTokens: 0,
    completionTokens: 0,
    cacheHitTokens: 0,
  });
  expect(calls).toBe(1);
});
it('keeps malformed provider-specific cache usage from overriding its existing precedence', async () => {
  replies = [
    {
      usage: {
        prompt_cache_hit_tokens: 'not-a-number',
        prompt_tokens_details: { cached_tokens: 8 },
      },
    },
  ];
  expect((await complete()).usage.cacheHitTokens).toBe(0);
});
it.each([{ content: 'not-json' }, { content: '{"answer":"invalid"}' }, { finish: 'length' }])(
  'fails closed after exactly two invalid outputs ($content/$finish)',
  async (reply) => {
    replies = [reply, reply];
    await expect(complete()).rejects.toThrow('LLM_INVALID_RESPONSE');
    expect(calls).toBe(2);
  },
);
it('does not retry provider transport errors', async () => {
  replies = [{ status: 503 }];
  await expect(complete()).rejects.toThrow('LLM_UNAVAILABLE');
  expect(calls).toBe(1);
});
it('uses the same caller deadline across validation attempts', async () => {
  const controller = new AbortController();
  const validate = vi.fn((value: unknown) => {
    controller.abort();
    return schema.parse(value);
  });
  replies = [{ content: '{}' }];
  await expect(
    requestJsonCompletion(client(), request, controller.signal, validate),
  ).rejects.toThrow('LLM_TIMEOUT');
  expect(validate).toHaveBeenCalledOnce();
  expect(calls).toBe(1);
});
it('does not open a provider call without an API key', () => {
  expect(() => createProviderClient({ baseURL: 'http://localhost', model: 'test' })).toThrow(
    LlmError,
  );
  expect(calls).toBe(0);
});
