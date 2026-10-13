import { z } from 'zod';
const Draft = z.object({ version: z.literal(1), text: z.string().max(20000) });
export const DRAFT_KEY = 'writing-coach:preview-draft:v1';
export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}
export function decodeDraft(value: string | null): string | null {
  if (!value) return null;
  try {
    const result = Draft.safeParse(JSON.parse(value));
    return result.success ? result.data.text : null;
  } catch {
    return null;
  }
}
