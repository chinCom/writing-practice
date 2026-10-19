import { z } from 'zod';
import { performanceRoute } from './routes';

export const webVitalSchema = z.strictObject({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  name: z.enum(['LCP', 'INP', 'CLS', 'TTFB', 'FCP']),
  value: z.number().finite().nonnegative().max(86400000),
  route: z
    .string()
    .max(100)
    .refine((route) => performanceRoute(route) === route),
  device: z.enum(['mobile', 'desktop']),
  navigationType: z.enum([
    'navigate',
    'reload',
    'prerender',
    'back-forward',
    'back-forward-cache',
    'restore',
    'soft-navigation',
  ]),
});
