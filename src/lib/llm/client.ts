import OpenAI from 'openai';
import type { TokenUsage } from '@/lib/ai-result';
import { LlmError } from './errors';

export interface ProviderOptions {
  apiKey?: string;
  baseURL: string;
  model: string;
  timeoutMs?: number;
}
export interface LlmOptions extends ProviderOptions {
  mock: boolean;
}
export type JsonCompletionRequest = OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & {
  thinking: { type: 'enabled' | 'disabled' };
};

export function createProviderClient(options: ProviderOptions) {
  if (!options.apiKey) throw new LlmError('LLM_NOT_CONFIGURED');
  return new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL, maxRetries: 0 });
}

function addUsage(usage: TokenUsage, tokens: OpenAI.CompletionUsage | undefined) {
  usage.promptTokens += tokens?.prompt_tokens ?? 0;
  usage.completionTokens += tokens?.completion_tokens ?? 0;
  const cached =
    tokens && 'prompt_cache_hit_tokens' in tokens
      ? tokens.prompt_cache_hit_tokens
      : tokens?.prompt_tokens_details?.cached_tokens;
  usage.cacheHitTokens += typeof cached === 'number' ? cached : 0;
}

// The feature supplies one deadline for both attempts and owns all prompt/validation policy.
// Only invalid output is retried once; transport errors are never automatically retried.
export async function requestJsonCompletion<Data>(
  client: OpenAI,
  request: JsonCompletionRequest,
  signal: AbortSignal,
  validate: (value: unknown) => Data,
) {
  const usage: TokenUsage = { promptTokens: 0, completionTokens: 0, cacheHitTokens: 0 };
  for (let attempt = 0; attempt < 2; attempt++) {
    let completion;
    try {
      completion = await client.chat.completions.create(request, { signal });
    } catch {
      throw new LlmError(signal.aborted ? 'LLM_TIMEOUT' : 'LLM_UNAVAILABLE');
    }
    addUsage(usage, completion.usage);
    try {
      const choice = completion.choices[0];
      if (choice?.finish_reason !== 'stop') throw new Error('Incomplete JSON output');
      const data = validate(JSON.parse(choice.message.content ?? ''));
      return { data, usage };
    } catch {
      if (attempt === 1) throw new LlmError('LLM_INVALID_RESPONSE');
    }
  }
  throw new LlmError('LLM_INVALID_RESPONSE');
}
