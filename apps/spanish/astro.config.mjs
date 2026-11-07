// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import postcssRTLCSS from 'postcss-rtlcss';
import { topicSlug, refSlug } from './src/lib/routes.js';
import sitemap from './src/integrations/sitemap.mjs';
import baseLanguage from './src/integrations/base-language.mjs';
import entryPages from './src/integrations/entry-pages.mjs';
import llmsTxt from './src/integrations/llms-txt.mjs';
import { SITE_ORIGIN, BASE_PATH } from './src/lib/paths.js';

const r301 = (destination) => ({ status: 301, destination });

/* A grammar topic lives at /<slug>, but /grammar/<slug> is the address people guess. Pages and
 * reference tables under /grammar win over a guessed topic address. Keys are the workspaces'
 * `slug ?? id`. The site at /spanish is new, so this is the only redirect it has: nothing was
 * ever public under an earlier address (docs/content-plan.md §7, §8). */
function grammarTopicRedirects() {
  const dir = new URL('./src/data/grammatik/', import.meta.url);
  const keys = readdirSync(dir).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')))
    .map((w) => w.slug ?? w.id);
  const taken = new Set([
    ...readdirSync(new URL('./src/data/nachschlagen/', import.meta.url)).flatMap((f) => [f.replace(/\.json$/, ''), refSlug(f.replace(/\.json$/, ''))]),
    ...readdirSync(new URL('./src/pages/grammar/', import.meta.url)).map((f) => f.replace(/\.astro$/, '')),
  ]);
  const out = {};
  for (const key of keys) {
    if (!taken.has(topicSlug(key))) out[`/grammar/${topicSlug(key)}`] = r301(`/${topicSlug(key)}`);
  }
  return out;
}

/* The live address: https://icanspeak.it/spanish/ (src/lib/paths.js owns both values; the
 * domain root is a separate site). Canonical URLs, og:url, hreflang, /sitemap.xml and
 * llms.txt are built from them. Redirect sources and destinations stay site paths: Astro
 * writes the stubs under the base, and the destinations are moved under it by the base-path
 * pass (src/middleware.js, src/integrations/base-language.mjs), checked by `pnpm check:base`. */
export default defineConfig({
  site: SITE_ORIGIN,
  base: BASE_PATH,
  // Static stays the default: every one of the ~670 content pages is still prerendered
  // to HTML at build time and served from the CDN with no server involved. The adapter
  // does not change that — it only makes it *possible* for an individual route to opt
  // out with `export const prerender = false`, which the handful of auth routes do and
  // nothing else should. If the prerendered page count ever drops after a change here,
  // the change is wrong: the build will still succeed and the site will still work, it
  // will just be rendering on demand what it used to serve from the edge.
  output: 'static',
  // No adapter: a plain static build (dist/), deployed as a Cloudflare Worker with static
  // assets only (README.md). Add an adapter only when the first on-demand route arrives.

  // React is available for islands; the site itself is vanilla .astro plus the JS modules in
  // src/lib/ — the zero-JS default on content pages is deliberate.
  integrations: [react(), baseLanguage(), entryPages(), sitemap(), llmsTxt()],

  redirects: grammarTopicRedirects(),
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
