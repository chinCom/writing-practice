import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Existing growth tests cover the enabled path; off-path tests stub GROWTH_TARGETS=false.
  test: {
    include: ['tests/**/*.test.ts'],
    env: { GROWTH_TARGETS: 'true' },
    // PGlite suites boot separate WASM databases; avoid saturating fixture startup with workers.
    maxWorkers: 4,
  },
});
