import type { LocatedCorrection } from '@/lib/feedback/schema';

// Set membership keeps this lookup constant; it runs once per mark on every render.
const spellingTags = new Set<LocatedCorrection['tag']>([
  'spelling',
  'capitalization',
  'apostrophe',
  'run-on-sentence',
  'sentence-fragment',
]);

const vocabularyTags = new Set<LocatedCorrection['tag']>([
  'word-choice',
  'collocation',
  'false-friend',
  'word-form',
  'register',
  'repetition',
]);

const styleTags = new Set<LocatedCorrection['tag']>([
  'connectors',
  'cohesion',
  'paragraphing',
  'topic-sentence',
  'task-response',
  'off-topic',
  'too-short',
  'tone-formality',
]);

export function markStyle(tag: LocatedCorrection['tag']) {
  if (spellingTags.has(tag)) return { group: 'spelling', decoration: 'dotted' } as const;
  if (vocabularyTags.has(tag)) return { group: 'vocabulary', decoration: 'solid' } as const;
  if (tag === 'punctuation') return { group: 'punctuation', decoration: 'dashed' } as const;
  if (styleTags.has(tag)) return { group: 'style', decoration: 'double' } as const;
  return { group: 'grammar', decoration: 'wavy' } as const;
}
