import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    '/api/feedback': ['./src/lib/prompts/*.md'],
    '/api/placement': ['./src/lib/prompts/placement.system.md'],
  },
};
export default withNextIntl(config);
