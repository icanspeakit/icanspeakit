// @ts-check
/* Base path for server-rendered HTML (src/lib/paths.js).
 *
 * The site lives under /english/, but hundreds of templates and data files still write
 * root-absolute links (href="/grammar", src="/assets/…"). Rather than leave any of them
 * pointing at the domain root, every HTML response is passed through rebaseHtml() once:
 * href, src, action, srcset, poster, CSS url() and meta refresh move under the base.
 *
 * Runs in `astro dev` and while the pages are prerendered at build time; there are no
 * on-demand routes (no adapter), so it never runs on a server. The same pass runs again on
 * dist/ after the dictionary strings are filled in (src/integrations/base-language.mjs).
 * New code should still build its URLs with withBase(); this is the safety net, and
 * `pnpm check:base` is the check. */
import { defineMiddleware } from 'astro:middleware';
import { rebaseHtml } from './lib/paths.js';

export const onRequest = defineMiddleware(async (_context, next) => {
  const res = await next();
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('text/html')) return res;
  const html = await res.text();
  return new Response(rebaseHtml(html), { status: res.status, statusText: res.statusText, headers: res.headers });
});
