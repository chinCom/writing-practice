import type { MetadataRoute } from 'next';
import { tokens } from '@/theme/tokens';

// Learners are mostly on phones, so the app can be added to a home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Writing coach',
    short_name: 'Writing coach',
    description:
      'Practice English writing: the coach marks your mistakes, explains them, and you revise.',
    start_url: '/',
    display: 'standalone',
    background_color: tokens.light.paper,
    theme_color: tokens.light.violet,
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
