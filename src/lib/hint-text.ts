type HintPart = { text: string; highlight: boolean };
const instructionWords = new Set([
  'a',
  'an',
  'the',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'my',
  'your',
  'his',
  'her',
  'our',
  'their',
  'to',
  'in',
  'on',
  'at',
  'and',
  'or',
  'of',
  'for',
  'with',
]);
export function hintTerms(explanation: string, suggestion: string): string[] {
  const phrase = suggestion.trim();
  if (phrase && splitHintText(explanation, [phrase]).some((part) => part.highlight))
    return [phrase];
  return [...new Set(suggestion.match(/[\p{L}]+(?:['’][\p{L}]+)*/gu) ?? [])]
    .filter(
      (word) =>
        !instructionWords.has(word.toLowerCase()) &&
        splitHintText(explanation, [word]).some((part) => part.highlight),
    )
    .slice(0, 6);
}
export function splitHintText(text: string, terms: string[]): HintPart[] {
  const candidates = terms
    .filter((term) => term.trim().length > 0)
    .sort((a, b) => b.length - a.length);
  const ranges: { start: number; end: number }[] = [];
  const lower = text.toLowerCase();
  for (const term of candidates) {
    let cursor = 0;
    while (cursor < text.length) {
      const start = lower.indexOf(term.toLowerCase(), cursor);
      if (start < 0) break;
      const end = start + term.length;
      const boundary = (value: string) => !/[\p{L}\p{N}_]/u.test(value);
      if (
        boundary(text[start - 1] ?? '') &&
        boundary(text[end] ?? '') &&
        !ranges.some((range) => start < range.end && end > range.start)
      )
        ranges.push({ start, end });
      cursor = end;
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const parts: HintPart[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor)
      parts.push({ text: text.slice(cursor, range.start), highlight: false });
    parts.push({ text: text.slice(range.start, range.end), highlight: true });
    cursor = range.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), highlight: false });
  return parts;
}
