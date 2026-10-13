import { describe, it, expect } from 'vitest';
import { countWords, decodeDraft } from '../src/lib/draft';
describe('draft boundary', () => {
  it('counts words without treating empty space as a word', () => {
    expect(countWords(' \n ')).toBe(0);
    expect(countWords('Hi Maria!\nLast weekend I went.')).toBe(6);
  });
  it('rejects corrupt, unversioned or wrong-type saved drafts', () => {
    for (const value of ['{', '{}', '{"version":1,"text":2}', '{"version":2,"text":"old"}'])
      expect(decodeDraft(value)).toBeNull();
    expect(decodeDraft('{"version":1,"text":"My draft"}')).toBe('My draft');
  });
});
