import { writeFile } from 'node:fs/promises';
import OpenAI from 'openai';
import { curriculumSchema } from '../src/lib/curriculum';
import { ErrorTag } from '../src/lib/feedback/schema';
if (process.env.GENERATE_CURRICULUM_LIVE !== 'true')
  throw new Error('Set GENERATE_CURRICULUM_LIVE=true to approve one paid offline generation call.');
if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is required');
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
  maxRetries: 0,
});
const response = await client.chat.completions.create(
  {
    model: process.env.DEEPSEEK_MODEL ?? 'deepseek-flash',
    messages: [
      {
        role: 'system',
        content:
          'Generate offline draft English writing lessons for later human review. Return JSON only. Do not claim human review.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          instructions:
            'Return {units:[...]}. Generate one unit each for A1, A2, B1, each order 1, two lessons, two deterministic warmups per lesson, last lesson checkpoint. Use unique lowercase-hyphen ids. Level word ranges A1 20–50, A2 40–100, B1 100–180. Focus on familiar messages then opinion paragraphs. Model text must match task length and level. Each choose question must contain its exact answer in options. Do not include alternatives or ambiguous answers.',
          allowedGrammarFocus: ErrorTag.options,
          constraints:
            'frames <= 6 items; wordBank <= 12; grammarFocus must use only allowedGrammarFocus strings; all models within the task word range.',
          unitShape: {
            id: 'unit-id',
            level: 'A1',
            order: 1,
            title: 'Title',
            theme: 'Theme',
            outcome: 'I can ...',
            grammarFocus: ['verb-tense'],
            vocabulary: ['word'],
            lessons: [
              {
                id: 'lesson-id',
                title: 'Title',
                miniLesson: {
                  markdown: 'Short lesson in plain text.',
                  modelText: 'Complete model writing.',
                },
                warmups: [
                  {
                    type: 'gap-fill',
                    prompt: 'Complete: I ___ at home.',
                    answer: 'am',
                    hint: 'Use am after I.',
                  },
                  {
                    type: 'choose',
                    prompt: 'Choose a correct sentence.',
                    options: ['I am here.', 'I is here.'],
                    answer: 'I am here.',
                    hint: 'Use am after I.',
                  },
                ],
                task: {
                  id: 'task-id',
                  title: 'Title',
                  genre: 'message',
                  prompt: 'Write ...',
                  scaffold: 'frames',
                  frames: ['I am ___.'],
                  wordBank: ['I am'],
                  checklist: ['Introduce yourself'],
                  minWords: 20,
                  maxWords: 50,
                  isCheckpoint: false,
                  targetLevel: 'A1',
                },
              },
            ],
          },
        }),
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 6500,
    ...{ thinking: { type: 'disabled' } },
  },
  { signal: AbortSignal.timeout(90000) },
);
const choice = response.choices[0];
if (choice?.finish_reason !== 'stop')
  throw new Error('Generation did not finish. No draft was changed.');
const units = curriculumSchema.parse(JSON.parse(choice.message.content ?? '').units);
// Write a candidate, never overwrite approved or currently reviewed content.
await writeFile('curriculum/a1-b1.generated.json', JSON.stringify(units, null, 2) + '\n', {
  flag: 'wx',
});
console.log('Saved offline candidate for human review. No lessons were published.');
