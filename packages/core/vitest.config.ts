import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'lcov'],
      threshold: { lines: 80 },
      exclude: [
        'src/index.ts',    // barrel re-exports only
        'src/scraper.ts',  // network I/O — covered by integration tests
      ],
    },
  },
});
