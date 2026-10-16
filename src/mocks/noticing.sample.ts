import { pathSample } from './curriculum.sample';
export const noticingSample = {
  ...pathSample.units[0].lessons[0],
  id: 'noticing-preview',
  miniLesson: {
    markdown: 'Notice the present form of be.',
    modelText: 'I am a student. I am ready.',
  },
  noticing: { instruction: 'Select both examples of am.' },
};
export const noticingAnswer = {
  instruction: noticingSample.noticing.instruction,
  spans: [
    { start: 2, end: 4 },
    { start: 18, end: 20 },
  ],
  explanation: 'Both sentences use am with I.',
};
