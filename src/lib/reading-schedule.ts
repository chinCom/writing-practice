export type LineTiming = { start: number; duration: number };

const pixelsPerMs = 0.9;
const minMs = 900;
const maxMs = 4000;

// One reading cursor moves through the lines in order at one speed, like an eye reading the text.
export function readingSchedule(widths: number[]): { total: number; lines: LineTiming[] } {
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  if (!totalWidth) return { total: 0, lines: [] };
  const total = Math.min(maxMs, Math.max(minMs, totalWidth / pixelsPerMs));
  let start = 0;
  const lines = widths.map((width) => {
    const duration = (width / totalWidth) * total;
    const line = { start, duration };
    start += duration;
    return line;
  });
  return { total, lines };
}
