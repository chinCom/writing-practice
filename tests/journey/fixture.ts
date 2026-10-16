import { readFile } from 'node:fs/promises';
import { curriculumSchema } from '../../src/lib/curriculum';

export const userId = '00000000-0000-4000-8000-000000000091';
export const serviceURL = 'http://127.0.0.1:4319';
export const initialText =
  'Hi everyone! My name is Lin and I live in Hanoi. Last year I move here for work. I study English because I want to write clear messages to my friends.';
export const revisedText = initialText.replace('I move here', 'I moved here');
export async function journeyUnit() {
  const units = curriculumSchema.parse(
    JSON.parse(await readFile('curriculum/growth.draft.json', 'utf8')),
  );
  return units.find((unit) => unit.level === 'A1')!;
}

export const accessToken =
  'eyJhbGciOiJIUzI1NiJ9.' +
  Buffer.from(JSON.stringify({ sub: userId, role: 'authenticated', exp: 4102444800 })).toString(
    'base64url',
  ) +
  '.synthetic-signature';
