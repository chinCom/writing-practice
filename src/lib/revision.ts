import type { Feedback, LocatedCorrection } from '@/lib/feedback/schema';

export function revisionText(text: string, corrections: LocatedCorrection[], applied: Set<number>) {
  let value = text;
  corrections
    .map((correction, index) => ({ ...correction, index }))
    .filter(
      (correction) =>
        applied.has(correction.index) && correction.start !== null && correction.end !== null,
    )
    .sort((a, b) => b.start! - a.start!)
    .forEach((correction) => {
      value =
        value.slice(0, correction.start!) + correction.suggestion + value.slice(correction.end!);
    });
  return value;
}

export type Scores = Feedback['scores'];
export interface WritingVersion {
  id: string;
  createdAt: string;
  text: string;
  wordCount: number;
  attempt: number;
  parentSubmissionId: string | null;
  scores: Scores;
}
export interface PortfolioPage {
  entries: WritingVersion[];
  nextOffset: number | null;
}
export interface RevisionComparison {
  current: WritingVersion;
  original: WritingVersion;
}
export interface TextChange {
  kind: 'same' | 'added' | 'removed';
  text: string;
}

export function compareScores(original: Scores, current: Scores): Scores {
  return {
    task: current.task - original.task,
    organization: current.organization - original.organization,
    grammar: current.grammar - original.grammar,
    vocabulary: current.vocabulary - original.vocabulary,
  };
}
export function diffWriting(original: string, current: string): TextChange[] {
  const split = (text: string) => text.match(/\s+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? [];
  const before = split(original);
  const after = split(current);
  const lengths = Array.from(
    { length: before.length + 1 },
    () => new Uint16Array(after.length + 1),
  );
  for (let left = before.length - 1; left >= 0; left--) {
    for (let right = after.length - 1; right >= 0; right--) {
      lengths[left][right] =
        before[left] === after[right]
          ? lengths[left + 1][right + 1] + 1
          : Math.max(lengths[left + 1][right], lengths[left][right + 1]);
    }
  }
  const changes: TextChange[] = [];
  function add(kind: TextChange['kind'], text: string) {
    const previous = changes.at(-1);
    if (previous?.kind === kind) previous.text += text;
    else changes.push({ kind, text });
  }
  let left = 0;
  let right = 0;
  while (left < before.length || right < after.length) {
    if (left < before.length && right < after.length && before[left] === after[right]) {
      add('same', before[left++]);
      right++;
    } else if (
      left < before.length &&
      (right === after.length || lengths[left + 1][right] >= lengths[left][right + 1])
    )
      add('removed', before[left++]);
    else add('added', after[right++]);
  }
  return changes;
}
