import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  FeedbackSchema,
  ModelFeedbackSchema,
  type ErrorTag,
  type Feedback,
} from '@/lib/feedback/schema';
import { filterLiveCorrections } from '@/lib/feedback/corrections';
import type { z } from 'zod';
import { validateTargetReport } from '@/lib/targets';
import mockFeedback from '@/mocks/feedback.sample.json';
import { weekendTask, type CurriculumTask } from '@/lib/curriculum';
import type { AiResult } from '@/lib/ai-result';
import { createProviderClient, requestJsonCompletion, type LlmOptions } from './client';

export { LlmError } from './errors';
export interface GradeOptions extends LlmOptions {
  task?: CurriculumTask;
  targets?: z.infer<typeof ErrorTag>[];
}
export async function gradeWriting(
  text: string,
  options: GradeOptions,
): Promise<AiResult<Feedback>> {
  const started = Date.now();
  if (options.mock) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1500));
    return {
      data: FeedbackSchema.parse(mockFeedback),
      usage: { promptTokens: 0, completionTokens: 0, cacheHitTokens: 0 },
      model: 'mock',
      latencyMs: Date.now() - started,
      mock: true,
    };
  }
  const client = createProviderClient(options);
  const system = await readFile(
    resolve(process.cwd(), 'src/lib/prompts/feedback.system.md'),
    'utf8',
  );
  const task = options.task ?? weekendTask;
  const signal = AbortSignal.timeout(options.timeoutMs ?? 45000);
  // Escape delimiters so learner input cannot create a new trusted message boundary.
  const learnerText = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const result = await requestJsonCompletion(
    client,
    {
      model: options.model,
      messages: [
        {
          role: 'system',
          content:
            system +
            '\nTrusted task configuration:\n' +
            JSON.stringify(task) +
            '\nTrusted active targets: ' +
            JSON.stringify(options.targets ?? []),
        },
        {
          role: 'user',
          content:
            'Level: ' +
            task.targetLevel +
            '. Explanations: English.\n<learner_text>\n' +
            learnerText +
            '\n</learner_text>',
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: options.targets?.length ? 2700 : 2400,
      thinking: { type: 'disabled' },
    },
    signal,
    (value) => {
      const parsed = ModelFeedbackSchema.parse(value);
      if (parsed.corrections.length > (['PRE_A1', 'A1', 'A2'].includes(task.targetLevel) ? 8 : 12))
        throw new Error('Too many corrections');
      return validateTargetReport(
        { ...parsed, corrections: filterLiveCorrections(text, parsed.corrections) },
        options.targets ?? [],
      );
    },
  );
  return { ...result, model: options.model, latencyMs: Date.now() - started, mock: false };
}
