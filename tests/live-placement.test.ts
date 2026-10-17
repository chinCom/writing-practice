import { expect, it } from 'vitest';
import { estimatePlacement } from '@/lib/llm/placement';
it.skipIf(process.env.RUN_LIVE_PLACEMENT !== 'true')(
  'validates one real practice placement estimate from synthetic writing',
  async () => {
    process.loadEnvFile('.env');
    const result = await estimatePlacement(
      {
        samples: [
          'My name is Lin. I live in Hanoi. I work in a shop and I like reading books.',
          'Last weekend I visited my cousin. We cooked lunch together and then walked by the river. I enjoyed the day because we had time to talk.',
        ],
        answers: ['is', 'went', 'because'],
      },
      {
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
        model: process.env.DEEPSEEK_MODEL ?? 'deepseek-v4.1-flash-1017',
        mock: false,
      },
    );
    expect(result.safety_flag).toBe(false);
    expect(['A1', 'A2', 'B1']).toContain(result.cefr);
    expect(result.reason.length).toBeGreaterThan(0);
  },
  35000,
);
