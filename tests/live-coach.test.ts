import { expect, it } from 'vitest';
import { gradeWriting } from '@/lib/llm/grade';
import { sampleDraft } from '@/mocks/draft.sample';

// Opt-in only: consumes paid DeepSeek tokens using synthetic writing, never learner data.
it.skipIf(process.env.RUN_LIVE_COACH !== 'true')(
  'validates one real DeepSeek response',
  async () => {
    process.loadEnvFile('.env');
    const result = await gradeWriting(sampleDraft, {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL ?? 'deepseek-v4.1-flash-1017',
      mock: false,
    });
    expect(result.mock).toBe(false);
    expect(result.data.safety_flag).toBe(false);
    expect(result.data.corrections.length).toBeLessThanOrEqual(8);
    expect(result.usage.promptTokens).toBeGreaterThan(0);
  },
  70000,
);
