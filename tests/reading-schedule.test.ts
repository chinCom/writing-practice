import { describe, expect, it } from 'vitest';
import { readingSchedule } from '@/lib/reading-schedule';

describe('reading schedule', () => {
  it('starts each line when the previous line ends', () => {
    const { lines } = readingSchedule([400, 300, 100]);
    expect(lines[0].start).toBe(0);
    for (let index = 1; index < lines.length; index++) {
      const previous = lines[index - 1];
      expect(lines[index].start).toBeCloseTo(previous.start + previous.duration, 6);
    }
  });

  it('moves at the same speed on every line', () => {
    const widths = [400, 300, 100];
    const { lines } = readingSchedule(widths);
    const speeds = lines.map((line, index) => widths[index] / line.duration);
    for (const speed of speeds) expect(speed).toBeCloseTo(speeds[0], 6);
  });

  it('keeps short and very long drafts inside the time bounds', () => {
    expect(readingSchedule([20]).total).toBe(900);
    expect(readingSchedule(Array(80).fill(450)).total).toBe(4000);
    const { total, lines } = readingSchedule(Array(80).fill(450));
    const last = lines[lines.length - 1];
    expect(last.start + last.duration).toBeCloseTo(total, 6);
  });

  it('returns no lines for empty text', () => {
    expect(readingSchedule([])).toEqual({ total: 0, lines: [] });
  });
});
