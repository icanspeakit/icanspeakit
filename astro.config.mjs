// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://icanspeak.it',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  redirects: {
    '/category/blog': '/former-site/blog',
  },
  vite: {
    server: {
      // public/wp-content and public/wp-includes are a static, unchanging
      // asset dump (recovered WordPress backup of the former consulting
      // site, now preserved under /former-site/). Watching its ~20k files
      // makes the dev server's file watcher choke on startup.
      watch: {
        ignored: ['**/public/wp-content/**', '**/public/wp-includes/**'],
      },
    },
  },
});
