// LOCAL DEVELOPMENT ONLY — there is no production build step.
// JS files are served raw from GitHub Pages.
// Uses port 8000 for local dev.
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 8000,
    open: '/dev/',
  },
});
