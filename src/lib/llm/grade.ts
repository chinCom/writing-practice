import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { FeedbackSchema } from '@/lib/feedback/schema';
import mockFeedback from '@/mocks/feedback.sample.json';

export interface GradeOptions {
  apiKey?: string;
  baseURL: string;
  model: string;
  mock: boolean;
  timeoutMs?: number;
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
          { role: 'system', content: system },
          {
            role: 'user',
            content:
              'Level: A2. Explanations: English.\n<learner_text>\n' +
              learnerText +
              '\n</learner_text>',
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2400,
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
      const data = FeedbackSchema.parse(JSON.parse(choice.message.content ?? ''));
      if (data.corrections.length > 8) throw new Error('Too many A2 corrections');
      return { data, usage, model: options.model, latencyMs: Date.now() - started, mock: false };
    } catch {
      if (attempt === 1) throw new LlmError('LLM_INVALID_RESPONSE');
    }
  }
  throw new LlmError('LLM_INVALID_RESPONSE');
}
