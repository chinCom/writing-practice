import { performance } from 'node:perf_hooks';
import { gradeWriting } from '../src/lib/llm/grade';
import { estimatePlacement } from '../src/lib/llm/placement';
import { explainCorrection } from '../src/lib/llm/explain';
import { sampleDraft } from '../src/mocks/draft.sample';

// Opt-in only: up to six paid requests if each adapter needs its validation retry.
if (process.env.MEASURE_AI_LIVE !== 'true')
  throw new Error('Set MEASURE_AI_LIVE=true to approve paid synthetic latency checks.');
if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is required');
const options = {
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
  model: process.env.DEEPSEEK_MODEL ?? 'deepseek-v4.1-flash-1017',
  mock: false,
};
const base = new URL(options.baseURL);
if (base.protocol !== 'https:' || base.hostname !== 'api.deepseek.com')
  throw new Error('This live diagnostic only sends synthetic requests to api.deepseek.com.');

const originalFetch = globalThis.fetch;
const requests: Array<Record<string, unknown>> = [];
const observations: Promise<void>[] = [];
let operation = '';
globalThis.fetch = async (input, init) => {
  const started = performance.now();
  const response = await originalFetch(input, init);
  const headersMs = Math.round(performance.now() - started);
  const label = operation;
  observations.push(
    response
      .clone()
      .json()
      .then((body) => {
        // Store counts and timings only, never writing, output, or credentials.
        requests.push({
          operation: label,
          status: response.status,
          headersMs,
          responseMs: Math.round(performance.now() - started),
          finishReason: body.choices?.[0]?.finish_reason,
          promptTokens: body.usage?.prompt_tokens,
          completionTokens: body.usage?.completion_tokens,
          reasoningTokens: body.usage?.completion_tokens_details?.reasoning_tokens,
          cacheHitTokens: body.usage?.prompt_cache_hit_tokens,
        });
      }),
  );
  return response;
};

const measurements: Array<Record<string, unknown>> = [];
const checks = [
  { name: 'feedback', run: () => gradeWriting(sampleDraft, options) },
  {
    name: 'placement',
    run: () =>
      estimatePlacement(
        {
          samples: [
            'My name is Lin. I live in Hanoi. I work in a shop and I like reading books.',
            'Last weekend I visited my cousin. We cooked lunch together and then walked by the river. I enjoyed the day because we had time to talk.',
          ],
          answers: ['is', 'went', 'because'],
        },
        options,
      ),
  },
  {
    name: 'explanation',
    run: () =>
      explainCorrection(
        {
          text: sampleDraft,
          original: 'go',
          suggestion: 'went',
          tag: 'verb-tense',
          explanation: 'Use the past tense for last weekend.',
        },
        options,
      ),
  },
];
try {
  for (const check of checks) {
    operation = check.name;
    const started = performance.now();
    try {
      await check.run();
      measurements.push({
        operation,
        elapsedMs: Math.round(performance.now() - started),
        valid: true,
      });
    } catch (error) {
      measurements.push({
        operation,
        elapsedMs: Math.round(performance.now() - started),
        valid: false,
        code: error instanceof Error ? error.message : 'UNKNOWN',
      });
    }
  }
  await Promise.all(observations);
} finally {
  globalThis.fetch = originalFetch;
}
console.log(JSON.stringify({ model: options.model, measurements, requests }, null, 2));
