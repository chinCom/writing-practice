import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { it, expect } from 'vitest';
import { z } from 'zod';
import { gradeWriting } from '@/lib/llm/grade';
import type { Correction } from '@/lib/feedback/schema';
import { evaluateCorrections, summarizeEvaluations, type EvaluationResult } from '@/lib/evaluation';
import { feedbackPromptVersion } from '@/lib/prompts/version';
const Case = z.strictObject({
  id: z.string(),
  level: z.literal('A2'),
  text: z.string().max(1200),
  expected: z.array(
    z.strictObject({ original: z.string(), suggestions: z.array(z.string()).min(1) }),
  ),
});
it('records a bounded, opt-in live A2 quality pilot', async () => {
  if (process.env.EVAL_LIVE !== 'true')
    throw new Error('Cost risk: set EVAL_LIVE=true to approve paid provider calls.');
  try {
    process.loadEnvFile(resolve(process.cwd(), '.env'));
  } catch {
    /* CI can supply environment variables. */
  }
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is required.');
  const cases = (await readFile(resolve(process.cwd(), 'evals/golden-set.jsonl'), 'utf8'))
    .trim()
    .split('\n')
    .map((line) => Case.parse(JSON.parse(line)));
  const results: (EvaluationResult & {
    error?: string;
    corrections?: Correction[];
  })[] = [];
  for (const sample of cases) {
    try {
      const result = await gradeWriting(sample.text, {
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
        model: process.env.DEEPSEEK_MODEL ?? 'deepseek-flash',
        mock: false,
      });
      results.push({
        id: sample.id,
        expectedCount: sample.expected.length,
        valid: true,
        corrections: result.data.corrections,
        ...evaluateCorrections(sample.expected, result.data.corrections),
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        latencyMs: result.latencyMs,
      });
    } catch (error) {
      results.push({
        id: sample.id,
        expectedCount: sample.expected.length,
        valid: false,
        truePositives: 0,
        falsePositives: 0,
        falseNegatives: sample.expected.length,
        promptTokens: 0,
        completionTokens: 0,
        latencyMs: 0,
        error: error instanceof Error ? error.message : 'EVAL_FAILED',
      });
    }
  }
  const report = {
    scope: '12 synthetic A2 cases; not a broad or human-reviewed benchmark',
    createdAt: new Date().toISOString(),
    model: process.env.DEEPSEEK_MODEL ?? 'deepseek-flash',
    promptVersion: feedbackPromptVersion,
    summary: summarizeEvaluations(results),
    results,
  };
  await mkdir('evals/results', { recursive: true });
  await writeFile('evals/results/latest.json', JSON.stringify(report, null, 2) + '\n');
  console.info(report.summary);
  expect(results.length).toBe(12);
  expect(results.every((result) => result.valid)).toBe(true);
});
