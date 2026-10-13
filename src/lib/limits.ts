import type { z } from 'zod';
import type { Level } from './feedback/schema';
export const textLimits: Record<z.infer<typeof Level>, number> = {
  PRE_A1: 300,
  A1: 600,
  A2: 1200,
  B1: 2000,
  B2: 3500,
  C1: 5000,
  C2: 6500,
};
export const freeDailySubmissions = 3;
