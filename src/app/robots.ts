import type { MetadataRoute } from 'next';

// Only the public pages are indexable; everything else is private learner data or tooling.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/$', '/privacy', '/terms'],
      disallow: '/',
    },
  };
}
