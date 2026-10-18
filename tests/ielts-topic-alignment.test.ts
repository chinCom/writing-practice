import { expect, it } from 'vitest';
import draft from '../curriculum/ielts.draft.json';
import { curriculumSchema } from '@/lib/curriculum';

const lessons = curriculumSchema.parse(draft).flatMap((unit) => unit.lessons);
const cases: [string, string[], RegExp][] = [
  [
    'ielts-task1-static-comparisons-1',
    ['Dormitories', 'Apartments', '38%', '52%'],
    /Sydney|Tokyo|watering|laundry/i,
  ],
  [
    'ielts-task1-static-comparisons-2',
    ['Singapore', 'Zurich', 'Taipei', 'Bangkok'],
    /Norway|Korea|chargers|EV share/i,
  ],
  [
    'ielts-task1-static-comparisons-3',
    ['Social Media', 'Television', '54%', '49%'],
    /jogging|gardening|gym workouts|cycling/i,
  ],
  [
    'ielts-task1-processes-maps-1',
    ['coffee', '200', '-45', 'vacuum'],
    /bottles|cullet|glass fragments/i,
  ],
  [
    'ielts-task1-processes-maps-2',
    ['Riverside', '2005', 'Studio', 'Cafe'],
    /Seaview|golf course|fish market|bus terminal/i,
  ],
  [
    'ielts-task1-processes-maps-3',
    ['Greenvale', '2005', 'Town Hall', 'Food Hall'],
    /Harbor Industrial|clock tower|coal yard|warehouse/i,
  ],
  [
    'ielts-task2-opinion-essays-1',
    ['universities', 'humanities', 'funding'],
    /hospital|preventive campaigns|healthcare funds/i,
  ],
  [
    'ielts-task2-opinion-essays-2',
    ['tax', 'sugary', 'health'],
    /congestion|bus speeds|road pricing/i,
  ],
  [
    'ielts-task2-opinion-essays-3',
    ['internship', 'university', 'workplace'],
    /mandatory volunteering|book donations|civic empathy/i,
  ],
  [
    'ielts-task2-discussion-essays-1',
    ['company', 'changing jobs', 'career'],
    /tournaments|stadiums|host cities/i,
  ],
  [
    'ielts-task2-discussion-essays-2',
    ['abroad', 'students', 'advantages'],
    /cashless|mobile wallets|physical cash|power outages/i,
  ],
  [
    'ielts-task2-discussion-essays-3',
    ['schools', 'citizens', 'individual'],
    /crop failures|corporate profits|Treating nature|environmental protection/i,
  ],
  [
    'ielts-task2-problem-solution-1',
    ['burnout', 'employers', 'workload'],
    /housing costs|contractors into permanent|homeownership/i,
  ],
  [
    'ielts-task2-problem-solution-2',
    ['freelance', 'creators', 'income'],
    /small shops|supermarkets|shop owners|economies of scale/i,
  ],
  [
    'ielts-task2-problem-solution-3',
    ['rural', 'cities', 'migration'],
    /\bSTEM\b|commercial degrees|scientific roles/i,
  ],
];

it.each(cases)(
  '%s uses the assigned topic throughout its model and dependent exercises',
  (id, anchors, staleTopic) => {
    const lesson = lessons.find((item) => item.id === id)!;
    for (const anchor of anchors)
      expect(lesson.miniLesson.modelText.toLowerCase()).toContain(anchor.toLowerCase());
    expect(JSON.stringify(lesson)).not.toMatch(staleTopic);
    const words = lesson.miniLesson.modelText.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(lesson.task.minWords);
    expect(words).toBeLessThanOrEqual(lesson.task.maxWords);
    for (const warmup of lesson.warmups) expect(warmup.options).toContain(warmup.answer);
  },
);

it('addresses the named landlord in the assigned letter', () => {
  const lesson = lessons.find((item) => item.id === 'ielts-task1-general-letters-1')!;
  expect(lesson.miniLesson.modelText).toMatch(/^Dear (Mr\.|Ms\.) Davis,/);
});
