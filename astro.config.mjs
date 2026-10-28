// @ts-check
import { readdirSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import postcssRTLCSS from 'postcss-rtlcss';
import { legacyRedirects } from './src/lib/routes.js';
import sitemap from './src/integrations/sitemap.mjs';
import baseLanguage from './src/integrations/base-language.mjs';
import entryPages from './src/integrations/entry-pages.mjs';
import llmsTxt from './src/integrations/llms-txt.mjs';

/** /grammatik/<thema> → /<thema>, for topics with no page of their own under /grammatik. */
function grammarTopicRedirects() {
  const slugs = (dir) => readdirSync(new URL(dir, import.meta.url)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  const taken = new Set([
    ...slugs('./src/data/nachschlagen/'),
    ...readdirSync(new URL('./src/pages/grammatik/', import.meta.url)).map((f) => f.replace(/\.astro$/, '')),
  ]);
  return Object.fromEntries(
    slugs('./src/data/grammatik/').filter((s) => !taken.has(s)).map((s) => [`/grammatik/${s}`, { status: 301, destination: `/${s}` }]),
  );
}

/* The live domain: canonical URLs, og:url, /sitemap.xml. Set SITE_URL when the real domain
 * is known; the default is a placeholder. */
/* Account, sign-in, purchase and merch routes of englishacademy that are not part of this
 * build (no backend yet, src/lib/backend.js): every old link lands on /account instead of 404. */
const ACCOUNT_REDIRECTS = Object.fromEntries(
  ['/anmelden', '/konto', '/konto-loeschen', '/passwort-neu', '/preise', '/kuendigen', '/widerrufen', '/widerruf',
   '/mein-zugang', '/einladung', '/merch', '/live-fragestunde', '/newsletter-bestaetigt', '/kaufen/start', '/kaufen/danke',
   '/lehrkraefte/karten/drucken']
    .map((from) => [from, { status: 302, destination: '/account' }]),
);

const SITE_URL = process.env.SITE_URL ?? 'https://englishacademy.com';

export default defineConfig({
  site: SITE_URL,
  // Static stays the default: every one of the ~670 content pages is still prerendered
  // to HTML at build time and served from the CDN with no server involved. The adapter
  // does not change that — it only makes it *possible* for an individual route to opt
  // out with `export const prerender = false`, which the handful of auth routes do and
  // nothing else should. If the prerendered page count ever drops after a change here,
  // the change is wrong: the build will still succeed and the site will still work, it
  // will just be rendering on demand what it used to serve from the edge.
  output: 'static',
  // No adapter: a plain static build (dist/) that any static host serves. Add an adapter
  // (Cloudflare, Vercel, Netlify, Node) only when the first on-demand route arrives.

  // React is available for islands; the site itself is vanilla .astro plus the JS modules in
  // src/lib/ — the zero-JS default on content pages is deliberate.
  integrations: [react(), baseLanguage(), entryPages(), sitemap(), llmsTxt()],

  // /dashboard and /fortschritt were two pages answering the same question under two
  // names. They are now one page at /fortschritt; this keeps old links, bookmarks and
  // anything already shared working instead of 404ing.
  redirects: {
    '/dashboard': '/fortschritt',
    // /v2 tested practising inside the dashboard (the focus layout). Retired with the
    // inline exercises — see FORTSCHRITT-KARTE-PROMPT.md.
    '/v2': '/fortschritt',
    // The easy-mode prototype became „Einfach lernen" (EINFACH-LERNEN-TIERED-PROMPT.md,
    // Tier 0). A real 301 keeps the #/… screen: browsers carry the fragment across it.
    '/leicht': { status: 301, destination: '/einfach' },
    // The films of how it all works were a dock-only page first; now they sit under Entdecken.
    '/intern/filme': { status: 301, destination: '/entdecken/filme' },
    // The flat URLs (/uebungen/grammatik/artikel → /artikel, /pruefungen/telc → /telc …):
    // every old address keeps working as a 301. The table lives in src/lib/routes.js.
    // /aussprache used to redirect to the scored check; it is the Aussprache page itself now,
    // and the check is at /aussprache-check.
    ...legacyRedirects(),
    // A grammar topic lives at /<thema>, but /grammatik/<thema> is the address people
    // guess. Every topic that isn't also a page under /grammatik (the Nachschlagewerk
    // tables, Wortarten, Verben) redirects instead of 404ing.
    ...grammarTopicRedirects(),
    ...ACCOUNT_REDIRECTS,
  },
  server: {
    // Listen on every interface, not just 127.0.0.1, so the dev server is reachable
    // from a phone on the same Wi-Fi — and from a tunnel — without passing --host
    // every time.
    host: true,
    // Dev-server requests carry the tunnel's hostname, which Astro rejects by default
    // as a DNS-rebinding guard. This only affects `astro dev`; the built site is
    // unaffected.
    allowedHosts: true,
  },
  vite: {
    // A Gradle build drops ~6,600 copies of the site into android/app/build; watching
    // them floods the dev server until module loads time out.
    server: {
      watch: { ignored: ['**/android/**', '**/ios/**', '**/dist/**', '**/dist-app/**', '**/.t/**'] },
    },
    css: {
      // Arabic is the only RTL language we ship (see LANGUAGES in src/lib/i18n.js), and
      // the stylesheets are written left-to-right: ~340 physical direction declarations
      // against ~18 logical ones. Converting them all by hand would be an enormous diff
      // and a trap — a `left: 50%` paired with `translateX(-50%)`, or the
      // `border-left: 11px solid` of a CSS triangle, must not flip naively, and a regex
      // cannot tell those apart. postcss-rtlcss reads each declaration in context and
      // appends a [dir="rtl"] rule wherever one is needed, for both src/styles/*.css and
      // the scoped <style> blocks in .astro files.
      //
      // One stylesheet serves both directions, so switching language needs no reload and
      // no second CSS file — which matters because setLang() flips documentElement.dir
      // live, and the pre-paint script in Layout.astro has already set it before the
      // first frame.
      //
      // Declared here rather than in a postcss.config.mjs: Astro's Vite root does not
      // pick that file up, and a config that silently does nothing is worse than none.
      postcss: {
        plugins: [
          postcssRTLCSS({
            // "override" on purpose. In "combined" mode the plugin also prefixes the LTR
            // rules with [dir="ltr"], which would blank the styling of any page that does
            // not carry a dir attribute. "override" leaves every existing rule
            // byte-identical and only adds RTL rules after it, so de/en/tr/uk cannot
            // regress: the worst case is an Arabic rule that loses on specificity, not a
            // page with no CSS.
            mode: 'override',
            // Mirror the keyframes of slide-in animations (nav drawer, picker panels)
            // instead of leaving them entering from the wrong edge.
            processKeyFrames: true,
            // Flip asymmetric shorthands with calc() rather than dropping them.
            useCalc: true,
            // Background images and icons here are direction-neutral; rewriting url()
            // would only look for -rtl files that do not exist.
            processUrls: false,
          }),
        ],
      },
    },
  },
});
