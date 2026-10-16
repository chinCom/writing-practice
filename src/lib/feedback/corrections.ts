import type { Correction } from './schema';

const wordCharacter = /[\p{L}\p{N}_]/u;

function hasExactSnippet(text: string, snippet: string): boolean {
  for (let start = text.indexOf(snippet); start !== -1; start = text.indexOf(snippet, start + 1)) {
    const end = start + snippet.length;
    const startsInsideWord =
      wordCharacter.test(snippet[0]) && start > 0 && wordCharacter.test(text[start - 1]);
    const endsInsideWord =
      wordCharacter.test(snippet.at(-1)!) && end < text.length && wordCharacter.test(text[end]);
    if (!startsInsideWord && !endsInsideWord) return true;
  }
  return false;
}

function withinWordLimit(text: string): boolean {
  return text.trim().split(/\s+/).length <= 12;
}

// Enforce the live prompt's mechanical contract without guessing grammar or changing saved feedback.
export function filterLiveCorrections(text: string, corrections: Correction[]): Correction[] {
  return corrections.filter(
    (correction) =>
      correction.severity !== 'style' &&
      correction.confidence >= 0.7 &&
      correction.original !== correction.suggestion &&
      withinWordLimit(correction.original) &&
      withinWordLimit(correction.suggestion) &&
      hasExactSnippet(text, correction.original),
  );
}
