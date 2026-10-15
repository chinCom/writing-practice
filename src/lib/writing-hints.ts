import type { CurriculumTask } from './curriculum';

export type HintTask = Pick<CurriculumTask, 'id' | 'minWords' | 'maxWords' | 'targetLevel'>;
export type WritingHint =
  | { kind: 'verb' | 'past'; original: string; suggestion: string }
  | { kind: 'short'; remaining: number }
  | { kind: 'long'; excess: number }
  | { kind: 'invitation' | 'paragraphs' | 'repeat' };

export const repeatedWord = /\b(the|a|an|to|of|in|on)\s+\1\b/i;

export function analyzeWriting(text: string, task: HintTask): WritingHint[] {
  const draft = text.trim().slice(0, 20000);
  if (!draft) return [];
  const hints: WritingHint[] = [];
  // Ignore quoted examples. These narrow rules are prompts to review, not a grammar grade.
  const unquoted = draft.replace(/"[^"\n]*"|“[^”\n]*”/g, '');
  const verb = unquoted.match(/\b(swimmed|goed|eated|buyed|choosed)\b/i);
  const forms: Record<string, string> = {
    swimmed: 'swam',
    goed: 'went',
    eated: 'ate',
    buyed: 'bought',
    choosed: 'chose',
  };
  if (verb)
    hints.push({ kind: 'verb', original: verb[0], suggestion: forms[verb[0].toLowerCase()] });
  const past = unquoted.match(/\b(?:yesterday|last weekend)\s+I\s+(go|eat|see|buy|meet)\b/i);
  const pastForms: Record<string, string> = {
    go: 'went',
    eat: 'ate',
    see: 'saw',
    buy: 'bought',
    meet: 'met',
  };
  if (past)
    hints.push({ kind: 'past', original: past[0], suggestion: pastForms[past[1].toLowerCase()] });
  if (repeatedWord.test(unquoted)) hints.push({ kind: 'repeat' });
  const words = draft.split(/\s+/u).length;
  if (words < task.minWords) hints.push({ kind: 'short', remaining: task.minWords - words });
  if (words > task.maxWords) hints.push({ kind: 'long', excess: words - task.maxWords });
  if (
    task.id === 'weekend' &&
    words >= 10 &&
    !/\b(?:would you like|do you want|can you|could you|join us|come with us|come along)\b/i.test(
      draft,
    )
  )
    hints.push({ kind: 'invitation' });
  if (['B1', 'B2', 'C1', 'C2'].includes(task.targetLevel) && words >= 100 && !/\n\s*\n/.test(draft))
    hints.push({ kind: 'paragraphs' });
  return hints.slice(0, 3);
}
