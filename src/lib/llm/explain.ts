import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ExplanationSchema, type Explanation } from '@/lib/feedback/explanation';
import type { AiResult } from '@/lib/ai-result';
import { createProviderClient, requestJsonCompletion, type ProviderOptions } from './client';

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
  options: ProviderOptions,
): Promise<AiResult<Explanation>> {
  const started = Date.now();
  const client = createProviderClient(options);
  prompt ??= readFile(resolve(process.cwd(), 'src/lib/prompts/explanation.system.md'), 'utf8');
  const system = await prompt;
  const signal = AbortSignal.timeout(options.timeoutMs ?? 15000);
  const result = await requestJsonCompletion(
    client,
    {
      model: options.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(input) },
      ],
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
      max_tokens: 600,
    },
    signal,
    (value) => {
      const data = ExplanationSchema.parse(value);
      if (Object.values(data).some((value) => value.split(/\s+/).length > 60))
        throw new Error('Explanation too long');
      return data;
    },
  );
  return { ...result, model: options.model, mock: false, latencyMs: Date.now() - started };
}
