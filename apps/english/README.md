# icanspeak English

Static Astro site for learning English, built on the deutschacademy architecture.
No backend and no integrations yet: everything runs in the browser.

```sh
pnpm install
pnpm dev            # http://localhost:4321
pnpm build          # → dist/ (plain static files, any host)
pnpm preview
pnpm check:content  # content validators (opt-in)
```

Set `SITE_URL` for the real domain (default `https://icanspeak.it/english`, a placeholder).

See **ARCHITECTURE.md** for the structure, the backend seam (`src/lib/backend.js`) and the
content-migration plan.
