import type { Correction, LocatedCorrection } from './schema';

function normalize(text: string) {
  const offsets: number[] = [];
  let normalized = '';
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (/\s/.test(character) && normalized.endsWith(' ')) continue;
    normalized += /\s/.test(character) ? ' ' : character.toLowerCase();
    offsets.push(index);
  }
  return { normalized, offsets };
}
function editDistance(left: string, right: string) {
  let row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    const next = [i];
    for (let j = 1; j <= right.length; j++) {
      next[j] = Math.min(
        next[j - 1] + 1,
        row[j] + 1,
        row[j - 1] + Number(left[i - 1] !== right[j - 1]),
      );
    }
    row = next;
  }
  return row[right.length];
}
const severity = { major: 3, minor: 2, style: 1 };
export function locateCorrections(text: string, corrections: Correction[]): LocatedCorrection[] {
  const claimed: Array<{ start: number; end: number }> = [];
  const normalizedText = normalize(text);
  function available(start: number, end: number) {
    return !claimed.some((range) => start < range.end && end > range.start);
  }
  function wordBoundaries(source: string, snippet: string, start: number, end: number) {
    const wordCharacter = /[\p{L}\p{N}_]/u;
    return (
      !(wordCharacter.test(snippet[0]) && start > 0 && wordCharacter.test(source[start - 1])) &&
      !(
        wordCharacter.test(snippet.at(-1)!) &&
        end < source.length &&
        wordCharacter.test(source[end])
      )
    );
  }
  function find(snippet: string) {
    for (
      let start = text.indexOf(snippet);
      start !== -1;
      start = text.indexOf(snippet, start + 1)
    ) {
      if (
        available(start, start + snippet.length) &&
        wordBoundaries(text, snippet, start, start + snippet.length)
      )
        return { start, end: start + snippet.length };
    }
    const needle = normalize(snippet).normalized;
    for (
      let index = normalizedText.normalized.indexOf(needle);
      index !== -1;
      index = normalizedText.normalized.indexOf(needle, index + 1)
    ) {
      const start = normalizedText.offsets[index];
      const end = normalizedText.offsets[index + needle.length - 1] + 1;
      if (available(start, end) && wordBoundaries(text, snippet, start, end)) return { start, end };
    }
    // A conservative fallback: complete word sequences only, at most one edit per 12 characters.
    if (needle.length >= 6 && needle.length <= 100) {
      const threshold = Math.max(1, Math.floor(needle.length / 12));
      const words = [...text.matchAll(/\S+/g)];
      const wordCount = snippet.trim().split(/\s+/).length;
      for (let index = 0; index + wordCount <= words.length; index++) {
        const start = words[index].index;
        const last = words[index + wordCount - 1];
        const end = last.index + last[0].replace(/[.,!?;:]+$/, '').length;
        const candidate = normalize(text.slice(start, end)).normalized;
        if (
          available(start, end) &&
          Math.abs(candidate.length - needle.length) <= threshold &&
          editDistance(candidate, needle) <= threshold
        ) {
          return { start, end };
        }
      }
    }
    return null;
  }
  // Choose severity first, but preserve model order in the returned notes.
  const located = new Map<Correction, LocatedCorrection>();
  const eligible = corrections
    .filter((correction) => correction.confidence >= 0.7)
    .map((correction) => ({ ...correction }));
  for (const correction of [...eligible].sort(
    (a, b) => severity[b.severity] - severity[a.severity],
  )) {
    const range = find(correction.original);
    if (range) claimed.push(range);
    // Exact overlaps are redundant, not additional unmarked notes.
    const overlaps =
      !range &&
      text.includes(correction.original) &&
      claimed.some(({ start, end }) => {
        const index = text.indexOf(correction.original);
        return index < end && index + correction.original.length > start;
      });
    if (!overlaps)
      located.set(correction, {
        ...correction,
        start: range?.start ?? null,
        end: range?.end ?? null,
      });
  }
  return eligible.flatMap((correction) =>
    located.has(correction) ? [located.get(correction)!] : [],
  );
}
