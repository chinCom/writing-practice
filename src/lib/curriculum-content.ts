import 'server-only';
import core from '../../curriculum/course.draft.json';
import ielts from '../../curriculum/ielts.draft.json';
import { curriculumSchema, getTrackUnits, type CurriculumTrack } from './curriculum';

// Drafts are for offline tooling and explicitly development-only previews, not publication.
export const curriculumDrafts = curriculumSchema.parse([...core, ...ielts]);
export function draftUnitsForTrack(track: CurriculumTrack) {
  return getTrackUnits(curriculumDrafts, track);
}
