import type { LocatedCorrection } from '@/lib/feedback/schema';

export function markStyle(tag: LocatedCorrection['tag']) {
  if (
    ['spelling', 'capitalization', 'apostrophe', 'run-on-sentence', 'sentence-fragment'].includes(
      tag,
    )
  )
    return { group: 'spelling', decoration: 'dotted' } as const;
  if (
    ['word-choice', 'collocation', 'false-friend', 'word-form', 'register', 'repetition'].includes(
      tag,
    )
  )
    return { group: 'vocabulary', decoration: 'solid' } as const;
  if (tag === 'punctuation') return { group: 'punctuation', decoration: 'dashed' } as const;
  if (
    [
      'connectors',
      'cohesion',
      'paragraphing',
      'topic-sentence',
      'task-response',
      'off-topic',
      'too-short',
      'tone-formality',
    ].includes(tag)
  )
    return { group: 'style', decoration: 'double' } as const;
  return { group: 'grammar', decoration: 'wavy' } as const;
}
