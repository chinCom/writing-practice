import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
