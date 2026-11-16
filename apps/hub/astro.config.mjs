// @ts-check
import { defineConfig } from 'astro/config';

// icanspeak.it/ — the umbrella page: pick a language course, or the linguistics section.
// Plain static build, served by the icanspeak-hub Worker (assets only, wrangler.jsonc).
// Every other path on icanspeak.it belongs to its own app and Worker route:
//   /english/*  apps/english      /linguistics/*  apps/linguistics
//   /espanol/*, /francais/*, /portugues/*, /italiano/*  later course apps
export default defineConfig({
  site: 'https://icanspeak.it',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  // Dev only: on localhost:4320 the hub's /linguistics/ links jump to the linguistics dev server
  // (`pnpm --filter @icanspeak/linguistics dev`, pinned to port 4310). A path proxy can't work:
  // that dev page loads its modules from root paths (/src/…, /@vite/…) the hub would answer.
  vite: {
    plugins: [{
      name: 'dev-linguistics-redirect',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!/^\/linguistics(\/|$)/.test(req.url ?? '')) return next();
          res.writeHead(302, { Location: `http://localhost:4310${req.url}` }).end();
        });
      },
    }],
  },
});
