// @ts-check
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// icanspeak linguistics: the magazine, word cards, speech exercises and dashboard.
// Served at https://icanspeak.it/linguistics/ by its own Cloudflare Worker (wrangler.jsonc);
// every root-relative path in src goes through u() from src/lib/url.ts.
export default defineConfig({
  site: 'https://icanspeak.it',
  base: '/linguistics',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de'],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  // Pages stay prerendered; only the two TTS routes (prerender = false) run in the Worker.
  output: 'static',
  // Images are optimised at build time, so no Cloudflare Images binding is needed.
  adapter: cloudflare({ imageService: 'compile' }),

  env: {
    schema: {
      // Set with `wrangler secret put ELEVENLABS_API_KEY`; locally in .dev.vars or .env.local.
      ELEVENLABS_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },

  // Destinations carry the base (Astro adds it to the source paths only).
  redirects: Object.fromEntries(Object.entries({
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
  }).map(([from, to]) => [from, `/linguistics${to}`])),

  vite: {
    server: {
      watch: {
        ignored: ['**/.wrangler/**', '**/dist/**'],
      },
    },
  },
});
