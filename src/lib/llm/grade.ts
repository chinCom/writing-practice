import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { FeedbackSchema, ModelFeedbackSchema, type ErrorTag } from '@/lib/feedback/schema';
import { filterLiveCorrections } from '@/lib/feedback/corrections';
import type { z } from 'zod';
import { validateTargetReport } from '@/lib/targets';
import mockFeedback from '@/mocks/feedback.sample.json';
import { weekendTask, type CurriculumTask } from '@/lib/curriculum';

export interface GradeOptions {
  apiKey?: string;
  baseURL: string;
  model: string;
  mock: boolean;
  timeoutMs?: number;
  task?: CurriculumTask;
  targets?: z.infer<typeof ErrorTag>[];
}
export class LlmError extends Error {}
export async function gradeWriting(text: string, options: GradeOptions) {
  const started = Date.now();
  const usage = { promptTokens: 0, completionTokens: 0, cacheHitTokens: 0 };
  if (options.mock) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1500));
    return {
      data: FeedbackSchema.parse(mockFeedback),
      usage,
      model: 'mock',
      latencyMs: Date.now() - started,
      mock: true,
    };
  }
  if (!options.apiKey) throw new LlmError('LLM_NOT_CONFIGURED');
  const client = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL, maxRetries: 0 });
  const system = await readFile(
    resolve(process.cwd(), 'src/lib/prompts/feedback.system.md'),
    'utf8',
  );
  const task = options.task ?? weekendTask;
  const signal = AbortSignal.timeout(options.timeoutMs ?? 45000);
  // Escape delimiters so learner input cannot create a new trusted message boundary.
  const learnerText = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  for (let attempt = 0; attempt < 2; attempt++) {
    let completion;
    try {
      const request: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & {
        thinking: { type: 'disabled' };
      } = {
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
      };
      completion = await client.chat.completions.create(request, { signal });
    } catch {
      throw new LlmError(signal.aborted ? 'LLM_TIMEOUT' : 'LLM_UNAVAILABLE');
    }
    const tokens = completion.usage;
    usage.promptTokens += tokens?.prompt_tokens ?? 0;
    usage.completionTokens += tokens?.completion_tokens ?? 0;
    const cacheTokens =
      tokens && 'prompt_cache_hit_tokens' in tokens
        ? tokens.prompt_cache_hit_tokens
        : tokens?.prompt_tokens_details?.cached_tokens;
    usage.cacheHitTokens += typeof cacheTokens === 'number' ? cacheTokens : 0;
    try {
      const choice = completion.choices[0];
      if (choice?.finish_reason !== 'stop') throw new Error('Incomplete feedback');
      const parsed = ModelFeedbackSchema.parse(JSON.parse(choice.message.content ?? ''));
      if (parsed.corrections.length > (['PRE_A1', 'A1', 'A2'].includes(task.targetLevel) ? 8 : 12))
        throw new Error('Too many corrections');
      const data = validateTargetReport(
        { ...parsed, corrections: filterLiveCorrections(text, parsed.corrections) },
        options.targets ?? [],
      );
      return { data, usage, model: options.model, latencyMs: Date.now() - started, mock: false };
    } catch {
      if (attempt === 1) throw new LlmError('LLM_INVALID_RESPONSE');
    }
  }
  throw new LlmError('LLM_INVALID_RESPONSE');
}
