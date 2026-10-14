import { readFile } from 'node:fs/promises';
import OpenAI from 'openai';
import { placementOutput, type placementInput } from '@/lib/curriculum';
import type { z } from 'zod';
import { LlmError, type GradeOptions } from './grade';
export async function estimatePlacement(
  input: z.infer<typeof placementInput>,
  options: GradeOptions,
) {
  if (options.mock)
    return {
      cefr: 'A2' as const,
      confidence: 0.6,
      reason: 'Design preview only. This is not a real placement result.',
      safety_flag: false,
    };
  if (!options.apiKey) throw new LlmError('LLM_NOT_CONFIGURED');
  const client = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL, maxRetries: 0 });
  const prompt = await readFile('src/lib/prompts/placement.system.md', 'utf8');
  const signal = AbortSignal.timeout(options.timeoutMs ?? 25000);
  for (let attempt = 0; attempt < 2; attempt++) {
    let completion;
    try {
      const body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming & {
        thinking: { type: 'enabled' };
      } = {
        model: options.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: JSON.stringify(input) },
        ],
        response_format: { type: 'json_object' },
        // Leave room for reasoning tokens as well as the short JSON result.
        max_tokens: 4096,
        thinking: { type: 'enabled' },
        reasoning_effort: 'low',
      };
      completion = await client.chat.completions.create(body, { signal });
    } catch {
      throw new LlmError(signal.aborted ? 'LLM_TIMEOUT' : 'LLM_UNAVAILABLE');
    }
    try {
      const choice = completion.choices[0];
      if (choice?.finish_reason !== 'stop') throw new Error('Incomplete placement');
      return placementOutput.parse(JSON.parse(choice.message.content ?? ''));
    } catch {
      if (attempt === 1) throw new LlmError('LLM_INVALID_RESPONSE');
    }
  }
  throw new LlmError('LLM_INVALID_RESPONSE');
}
