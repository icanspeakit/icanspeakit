// @ts-check
import { defineConfig } from 'astro/config';

// icanspeak.it/ — the umbrella page: pick a language course, or the linguistics section.
// Plain static build, served by the icanspeak-hub Worker (assets only, wrangler.jsonc).
// Every other path on icanspeak.it belongs to its own app and Worker route:
//   /english/*  apps/english      /linguistics/*  apps/linguistics
//   /spanish/*, /french/*, /portuguese/*, /italian/*  later course apps
export default defineConfig({
  site: 'https://icanspeak.it',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
