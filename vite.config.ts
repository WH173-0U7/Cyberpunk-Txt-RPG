import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths so the build works from any folder (e.g. GitHub Pages).
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
    // Several tests sweep whole generated cities (the dialogue holes, the people, the buildings): seconds each, longer on a shared CI runner.
    testTimeout: 30_000,
  },
});
