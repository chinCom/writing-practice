import 'server-only';
import draft from '../../curriculum/course.draft.json';
import { curriculumSchema } from '@/lib/curriculum';
export const courseDraft = curriculumSchema.parse(draft);
