import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
/** Which build this is: the stable release (the site's root, from `main`) or the beta (`/beta/`, from `beta`), with its own save. */
const channel = process.env.CHANNEL === 'beta' ? 'beta' : 'stable';
const sha = (process.env.BUILD_SHA ?? process.env.GITHUB_SHA ?? '').slice(0, 7);

export default defineConfig({
  // Relative asset paths so the build works from any folder (e.g. GitHub Pages, and its /beta/).
  base: './',
  define: {
    __CHANNEL__: JSON.stringify(channel),
    __BUILD__: JSON.stringify(`${pkg.version}${sha ? ` (${sha})` : ' (dev)'}`),
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // Several tests sweep whole generated cities (the dialogue holes, the people, the buildings): seconds each, longer on a shared CI runner.
    testTimeout: 30_000,
  },
});
