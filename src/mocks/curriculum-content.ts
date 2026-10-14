import draft from '../../curriculum/a1-b1.draft.json';
import { curriculumSchema } from '../lib/curriculum';
export const curriculumDraft = curriculumSchema.parse(draft);
