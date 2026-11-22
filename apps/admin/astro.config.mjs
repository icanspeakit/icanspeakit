// @ts-check
import { defineConfig } from 'astro/config';

// icanspeak.it/intern: Edgar's ops board. Static build, served by the icanspeak-admin Worker.
// Access is NOT in this code: Cloudflare Access (Zero Trust) guards icanspeak.it/intern* and
// lets in only Edgar's email (see README.md). Without that rule the page is public, so set
// it up before the first deploy.
export default defineConfig({
  site: 'https://icanspeak.it',
  base: '/intern',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
