import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths so the build works from any folder (e.g. GitHub Pages).
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
