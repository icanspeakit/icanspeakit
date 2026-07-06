// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  vite: {
    server: {
      // public/wp-content and public/wp-includes are a static, unchanging
      // asset dump (recovered WordPress backup). Watching its ~20k files
      // makes the dev server's file watcher choke on startup.
      watch: {
        ignored: ['**/public/wp-content/**', '**/public/wp-includes/**'],
      },
    },
  },
});
