import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { ExplanationSchema } from '@/lib/feedback/explanation';
import { LlmError, type GradeOptions } from './grade';

export interface ExplanationInput {
  text: string;
  original: string;
  suggestion: string;
  tag: string;
  explanation: string;
}
let prompt: Promise<string> | undefined;
export async function explainCorrection(
  input: ExplanationInput,
  options: Omit<GradeOptions, 'mock'>,
) {
  const started = Date.now();
  const usage = { promptTokens: 0, completionTokens: 0, cacheHitTokens: 0 };
  if (!options.apiKey) throw new LlmError('LLM_NOT_CONFIGURED');
  const client = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL, maxRetries: 0 });
  prompt ??= readFile(resolve(process.cwd(), 'src/lib/prompts/explanation.system.md'), 'utf8');
  const system = await prompt;
  const signal = AbortSignal.timeout(options.timeoutMs ?? 15000);
  for (let attempt = 0; attempt < 2; attempt++) {
    let completion;
    try {
      const request: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & {
        thinking: { type: 'disabled' };
      } = {
        model: options.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(input) },
        ],
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
        max_tokens: 600,
      };
      completion = await client.chat.completions.create(request, { signal });
    } catch {
      throw new LlmError(signal.aborted ? 'LLM_TIMEOUT' : 'LLM_UNAVAILABLE');
    }
    usage.promptTokens += completion.usage?.prompt_tokens ?? 0;
    usage.completionTokens += completion.usage?.completion_tokens ?? 0;
    const tokens = completion.usage;
    const cached =
      tokens && 'prompt_cache_hit_tokens' in tokens
        ? tokens.prompt_cache_hit_tokens
        : tokens?.prompt_tokens_details?.cached_tokens;
    usage.cacheHitTokens += typeof cached === 'number' ? cached : 0;
    try {
      const choice = completion.choices[0];
      if (choice?.finish_reason !== 'stop') throw new Error('Incomplete explanation');
      const data = ExplanationSchema.parse(JSON.parse(choice.message.content ?? ''));
      if (Object.values(data).some((value) => value.split(/\s+/).length > 60))
        throw new Error('Explanation too long');
      return { data, usage, model: options.model, mock: false, latencyMs: Date.now() - started };
    } catch {
      if (attempt === 1) throw new LlmError('LLM_INVALID_RESPONSE');
    }
  }
  throw new LlmError('LLM_INVALID_RESPONSE');
}
