import { readFile } from 'node:fs/promises';
import { placementOutput, type placementInput } from '@/lib/curriculum';
import type { z } from 'zod';
import { createProviderClient, requestJsonCompletion, type LlmOptions } from './client';

export async function estimatePlacement(
  input: z.infer<typeof placementInput>,
  options: LlmOptions,
) {
  if (options.mock)
    return {
      cefr: 'A2' as const,
      confidence: 0.6,
      reason: 'Design preview only. This is not a real placement result.',
      safety_flag: false,
    };
  const client = createProviderClient(options);
  const prompt = await readFile('src/lib/prompts/placement.system.md', 'utf8');
  const signal = AbortSignal.timeout(options.timeoutMs ?? 25000);
  const result = await requestJsonCompletion(
    client,
    {
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
    },
    signal,
    (value) => placementOutput.parse(value),
  );
  return result.data;
}
