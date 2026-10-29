import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');
// A baseline that cannot break rendering. A script/style CSP needs per-request nonces for
// MUI's Emotion styles and color-scheme script, so it is a separate change.
// `form-action` is omitted: the Google sign-in form posts here and is redirected to the provider.
const contentSecurityPolicy = ["frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'"];
const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy.join('; ') },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  headers: async () => [{ source: '/:path*', headers: securityHeaders }],
  typescript: {
    // `pnpm run build` checks types with tsrs before starting the Next.js build.
    ignoreBuildErrors: true,
  },
  outputFileTracingIncludes: {
    '/api/feedback': ['./src/lib/prompts/*.md'],
    '/api/placement': ['./src/lib/prompts/placement.system.md'],
    '/api/development': ['./src/lib/prompts/development.system.md'],
    '/api/explanation': ['./src/lib/prompts/explanation.system.md'],
  },
};
export default withNextIntl(config);
