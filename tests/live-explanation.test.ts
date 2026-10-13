import { mkdir, writeFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { explainCorrection } from '@/lib/llm/explain';

// Opt-in only. These paid provider calls use synthetic writing, never learner data.
it.skipIf(process.env.RUN_LIVE_EXPLANATION !== 'true')(
  'checks real explanations for tense, a missing word and an optional wording change',
  async () => {
    process.loadEnvFile('.env');
    const fixtures = [
      {
        text: 'Last weekend I go to the beach.',
        original: 'go',
        suggestion: 'went',
        tag: 'verb-tense',
        explanation: 'Use the past tense for last weekend.',
      },
      {
        text: 'I would like to invite you come to my house.',
        original: 'invite you come',
        suggestion: 'invite you to come',
        tag: 'missing-word',
        explanation: 'Add to before come after invite.',
      },
      {
        text: 'After a long week of working, I can finally relax.',
        original: 'a long week of working',
        suggestion: 'a long week of work',
        tag: 'word-choice',
        explanation: 'Work is a more natural noun here.',
      },
    ];
    const results = [];
    for (const input of fixtures) {
      const result = await explainCorrection(input, {
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
        model: process.env.DEEPSEEK_MODEL ?? 'deepseek-flash',
        mock: false,
      });
      expect(result.mock).toBe(false);
      expect(result.usage.completionTokens).toBeGreaterThan(0);
      for (const field of Object.values(result.data)) {
        expect(field.split(/\s+/).length).toBeLessThanOrEqual(60);
        for (const sentence of field.split(/[.!?]+/).filter((part) => part.trim()))
          expect(sentence.trim().split(/\s+/).length).toBeLessThanOrEqual(20);
      }
      results.push({
        input,
        explanation: result.data,
        latencyMs: result.latencyMs,
        model: result.model,
        usage: result.usage,
      });
    }
    await mkdir('docs/verification/ux', { recursive: true });
    await writeFile(
      'docs/verification/ux/explanation-live.json',
      JSON.stringify({ synthetic: true, results }, null, 2) + '\n',
    );
  },
  60000,
);
