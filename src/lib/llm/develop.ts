import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { CurriculumLevel, CurriculumTask } from '@/lib/curriculum';
import { DevelopmentSchema, developmentFocus, type Development } from '@/lib/feedback/development';
import type { AiResult } from '@/lib/ai-result';
import { createProviderClient, requestJsonCompletion, type LlmOptions } from './client';

let prompt: Promise<string> | undefined;
export async function developWriting(
  text: string,
  level: CurriculumLevel,
  task: CurriculumTask,
  options: LlmOptions,
): Promise<AiResult<Development>> {
  const started = Date.now();
  const client = createProviderClient(options);
  prompt ??= readFile(resolve(process.cwd(), 'src/lib/prompts/development.system.md'), 'utf8');
  const system =
    (await prompt) +
    '\nTrusted task: ' +
    JSON.stringify({
      title: task.title,
      prompt: task.prompt,
      targetLevel: task.targetLevel,
      scaffold: task.scaffold,
    });
  const signal = AbortSignal.timeout(options.timeoutMs ?? 15000);
  const result = await requestJsonCompletion(
    client,
    {
      model: options.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify({ learner_level: level, learner_text: text }) },
      ],
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
      max_tokens: 500,
    },
    signal,
    (value) => {
      const data = DevelopmentSchema.parse(value);
      if (
        Object.values(data).some(
          (value) => typeof value === 'string' && value.split(/\s+/).length > 35,
        )
      )
        throw new Error('Guidance too long');
      if (data.safety_flag || !developmentFocus(text, data.focus_text)) data.focus_text = '';
      return data;
    },
  );
  return { ...result, model: options.model, mock: false, latencyMs: Date.now() - started };
}
