// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

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
    '/progress': '/dashboard/',
    '/category/blog': '/former-site/blog',
    '/exercises/dashboard': '/dashboard/',
    '/exercises/dashboard/articulation': '/dashboard/articulation',
    '/exercises/dashboard/phonology': '/dashboard/phonology',
    '/exercises/dashboard/prosody': '/dashboard/prosody',
    '/exercises/dashboard/voice': '/dashboard/voice',
    '/exercises/dashboard/volume': '/dashboard/volume',
    '/exercises/dashboard/pace': '/dashboard/pace',
    '/de/exercises/dashboard': '/de/dashboard/',
    '/de/exercises/dashboard/articulation': '/de/dashboard/articulation',
    '/de/exercises/dashboard/phonology': '/de/dashboard/phonology',
    '/de/exercises/dashboard/prosody': '/de/dashboard/prosody',
    '/de/exercises/dashboard/voice': '/de/dashboard/voice',
    '/de/exercises/dashboard/volume': '/de/dashboard/volume',
    '/de/exercises/dashboard/pace': '/de/dashboard/pace',
  },

  vite: {
    server: {
      // public/wp-content and public/wp-includes are a static, unchanging
      // asset dump (recovered WordPress backup of the former consulting
      // site, now preserved under /former-site/). Watching its ~20k files
      // makes the dev server's file watcher choke on startup.
      watch: {
        ignored: [
          '**/public/wp-content/**',
          '**/public/wp-includes/**',
          '**/.vercel/**',
          '**/dist/**',
        ],
      },
    },
  },

  adapter: vercel(),
});