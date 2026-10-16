import type { z } from 'zod';
import type { noticingSchema } from './curriculum';
export type TextSpan = { start: number; end: number };
export function gradeNoticing(exercise: z.infer<typeof noticingSchema>, selected: TextSpan[]) {
  const key = ({ start, end }: TextSpan) => `${start}:${end}`;
  const answers = new Set(exercise.spans.map(key));
  return (
    selected.length === answers.size &&
    new Set(selected.map(key)).size === answers.size &&
    selected.every((span) => answers.has(key(span)))
  );
}
export function modelWords(text: string) {
  return [...text.matchAll(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)].map((match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}
