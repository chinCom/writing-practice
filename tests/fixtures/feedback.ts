export const correction = {
  original: 'goed',
  suggestion: 'went',
  tag: 'verb-tense' as const,
  severity: 'major' as const,
  explanation: 'Use went for the past.',
  confidence: 0.95,
};
export const feedback = {
  cefr_estimate: 'A2',
  scores: { task: 3, organization: 3, grammar: 2, vocabulary: 3 },
  strengths: ['You described where you went.'],
  priorities: [{ tag: 'verb-tense', why: 'Use past forms.' }],
  corrections: [correction],
  level_up_rewrite: 'I went to the beach.',
  next_step: 'Check your past-tense verbs.',
  safety_flag: false,
};
