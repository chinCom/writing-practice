import type { CurriculumTask } from './curriculum';

export type HintTask = Pick<CurriculumTask, 'id' | 'minWords' | 'maxWords' | 'targetLevel'>;
export type WritingHint =
  | { kind: 'verb' | 'past'; original: string; suggestion: string }
  | { kind: 'short'; remaining: number }
  | { kind: 'long'; excess: number }
  | { kind: 'invitation' | 'paragraphs' | 'repeat' };

// This runs on every keystroke, so the patterns and lookup tables are module constants.
const quotedExamples = /"[^"\n]*"|“[^”\n]*”/g;
const repeatedWord = /\b(the|a|an|to|of|in|on)\s+\1\b/i;
const wrongVerb = /\b(swimmed|goed|eated|buyed|choosed)\b/i;
const pastTenseMiss = /\b(?:yesterday|last weekend)\s+I\s+(go|eat|see|buy|meet)\b/i;
const invitation =
  /\b(?:would you like|do you want|can you|could you|join us|come with us|come along)\b/i;
const paragraphBreak = /\n\s*\n/;
const wordBoundary = /\s+/u;

const correctedVerbs: Record<string, string> = {
  swimmed: 'swam',
  goed: 'went',
  eated: 'ate',
  buyed: 'bought',
  choosed: 'chose',
};

const correctedPastForms: Record<string, string> = {
  go: 'went',
  eat: 'ate',
  see: 'saw',
  buy: 'bought',
  meet: 'met',
};

const paragraphLevels = new Set(['B1', 'B2', 'C1', 'C2']);

export { repeatedWord };

export function analyzeWriting(text: string, task: HintTask): WritingHint[] {
  const draft = text.trim().slice(0, 20000);
  if (!draft) return [];
  const hints: WritingHint[] = [];
  // Ignore quoted examples. These narrow rules are prompts to review, not a grammar grade.
  const unquoted = draft.replace(quotedExamples, '');
  const verb = unquoted.match(wrongVerb);
  if (verb)
    hints.push({
      kind: 'verb',
      original: verb[0],
      suggestion: correctedVerbs[verb[0].toLowerCase()],
    });
  const past = unquoted.match(pastTenseMiss);
  if (past)
    hints.push({
      kind: 'past',
      original: past[0],
      suggestion: correctedPastForms[past[1].toLowerCase()],
    });
  if (repeatedWord.test(unquoted)) hints.push({ kind: 'repeat' });
  const words = draft.split(wordBoundary).length;
  if (words < task.minWords) hints.push({ kind: 'short', remaining: task.minWords - words });
  if (words > task.maxWords) hints.push({ kind: 'long', excess: words - task.maxWords });
  if (task.id === 'weekend' && words >= 10 && !invitation.test(draft))
    hints.push({ kind: 'invitation' });
  if (paragraphLevels.has(task.targetLevel) && words >= 100 && !paragraphBreak.test(draft))
    hints.push({ kind: 'paragraphs' });
  return hints.slice(0, 3);
}
