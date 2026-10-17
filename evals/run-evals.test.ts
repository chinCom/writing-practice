import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { it, expect } from 'vitest';
import { z } from 'zod';
import { gradeWriting } from '@/lib/llm/grade';
import type { Correction } from '@/lib/feedback/schema';
import {
  evaluateCorrections,
  summarizeEvaluations,
  summarizeTargetStudy,
  targetStudyCaseSchema,
  aiTargetDiagnosticCaseSchema,
  type TargetStudyRun,
  type EvaluationResult,
} from '@/lib/evaluation';
import { feedbackPromptVersion } from '@/lib/prompts/version';
const Case = z.strictObject({
  id: z.string(),
  level: z.literal('A2'),
  text: z.string().max(1200),
  expected: z.array(
    z.strictObject({ original: z.string(), suggestions: z.array(z.string()).min(1) }),
  ),
});
it.skipIf(Boolean(process.env.EVAL_TARGET_CORPUS))(
  'records a bounded, opt-in live A2 quality pilot',
  async () => {
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
          model: process.env.DEEPSEEK_MODEL ?? 'deepseek-v4.1-flash-1017',
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
      model: process.env.DEEPSEEK_MODEL ?? 'deepseek-v4.1-flash-1017',
      promptVersion: feedbackPromptVersion,
      summary: summarizeEvaluations(results),
      results,
    };
    await mkdir('evals/results', { recursive: true });
    await writeFile('evals/results/latest.json', JSON.stringify(report, null, 2) + '\n');
    console.info(report.summary);
    expect(results.length).toBe(12);
    expect(results.every((result) => result.valid)).toBe(true);
  },
);

it.skipIf(!process.env.EVAL_TARGET_CORPUS)(
  'records the opt-in three-run target study without changing progression',
  async () => {
    if (process.env.EVAL_LIVE !== 'true')
      throw new Error(
        'Cost and privacy risk: set EVAL_LIVE=true to approve sending the reviewed corpus to the paid provider.',
      );
    try {
      process.loadEnvFile(resolve(process.cwd(), '.env'));
    } catch {
      /* CI can supply environment variables. */
    }
    if (!process.env.DEEPSEEK_API_KEY || !process.env.DEEPSEEK_MODEL)
      throw new Error('DEEPSEEK_API_KEY and an explicitly pinned DEEPSEEK_MODEL are required.');
    const mode = process.env.EVAL_TARGET_MODE ?? 'human-study';
    if (mode !== 'human-study' && mode !== 'ai-diagnostic')
      throw new Error('EVAL_TARGET_MODE must be human-study or ai-diagnostic.');
    const diagnostic = mode === 'ai-diagnostic';
    const cases = (await readFile(resolve(process.env.EVAL_TARGET_CORPUS!), 'utf8'))
      .trim()
      .split('\n')
      .map((line) =>
        diagnostic
          ? aiTargetDiagnosticCaseSchema.parse(JSON.parse(line))
          : targetStudyCaseSchema.parse(JSON.parse(line)),
      );
    if (
      cases.length < 30 ||
      cases.length > 60 ||
      new Set(cases.map((sample) => sample.id)).size !== cases.length ||
      cases.some((sample) => sample.annotation !== (diagnostic ? 'ai-reviewed' : 'human'))
    )
      throw new Error(
        'Use 30–60 distinct, consented, de-identified texts with the selected review provenance.',
      );
    const model = process.env.DEEPSEEK_MODEL;
    const results: (TargetStudyRun & {
      promptTokens: number;
      completionTokens: number;
      latencyMs: number;
    })[] = [];
    await mkdir('evals/results', { recursive: true });
    const outputPath = diagnostic
      ? 'evals/results/targets-ai-diagnostic.json'
      : 'evals/results/targets-latest.json';
    const saveReport = async () => {
      const report = {
        mode,
        scope: diagnostic
          ? 'Provisional AI-reviewed reference and estimated uses. Not human gold; never satisfies M3 or enables progression.'
          : 'Operator-supplied human annotations; reviewer identity and consent require manual verification. Never activates progression.',
        createdAt: new Date().toISOString(),
        model,
        promptVersion: feedbackPromptVersion,
        summary: summarizeTargetStudy(cases, results),
        results,
      };
      await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
      return report;
    };
    for (const sample of cases) {
      for (let run = 1; run <= 3; run++) {
        const graderVersion = `${model}:${feedbackPromptVersion}`;
        try {
          const result = await gradeWriting(sample.text, {
            apiKey: process.env.DEEPSEEK_API_KEY,
            baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
            model,
            mock: false,
            task: sample.task,
            targets: sample.targets.map((target) => target.tag),
          });
          results.push({
            id: sample.id,
            run,
            graderVersion,
            feedback: result.data,
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            latencyMs: result.latencyMs,
          });
        } catch {
          results.push({
            id: sample.id,
            run,
            graderVersion,
            feedback: null,
            promptTokens: 0,
            completionTokens: 0,
            latencyMs: 0,
          });
        }
      }
      await saveReport();
      console.info(`Target study progress: ${results.length}/${cases.length * 3} calls recorded.`);
    }
    const report = await saveReport();
    console.info(report.summary);
    if (diagnostic) {
      expect(report.summary.gatePassed).toBe(false);
      expect(report.summary.noiseReady).toBe(false);
    } else expect(report.summary.complete).toBe(true);
  },
  180 * 90000,
);
