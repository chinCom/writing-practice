import { z } from 'zod';
const Draft = z.object({ version: z.literal(1), text: z.string().max(20000) });
export const DRAFT_KEY = 'writing-coach:preview-draft:v1';
// `countWords` runs on every keystroke in both editors, so the splitter is shared.
const wordBoundary = /\s+/u;
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(wordBoundary).length : 0;
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
