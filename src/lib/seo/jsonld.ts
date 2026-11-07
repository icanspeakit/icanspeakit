// Structured data (schema.org JSON-LD) for search and answer engines, built in one place and
// rendered by Layout.astro. Only what is true and visible on the site: no ratings, no author
// credentials, no prices, no FAQPage, no profiles we do not control.
//
// Organization and WebSite go on the homepage only; every other page points at them by @id
// (a page's LearningResource names the organisation as its provider). BreadcrumbList goes on
// every nested page. SEO-BRAND-TIERED-PROMPT.md, Tier 1.
import { LEGAL } from "../legal.js";

/** Official profiles that belong to icanspeak Spanish. Only accounts we control; the English
    course's Instagram is not this site's. Empty → no sameAs at all. */
export const SAME_AS: string[] = [];

export const orgId = (site: string) => `${site}/#organization`;
export const websiteId = (site: string) => `${site}/#website`;

export function organizationLd(site: string) {
  return {
    "@type": "Organization",
    "@id": orgId(site),
    name: "icanspeak Spanish",
    alternateName: ["icanspeak", "icanspeak.it/spanish"],
    url: `${site}/`,
    // Square, ≥ 112 px: what Google needs for the logo next to the result. The course mark
    // from the icanspeak.it kit (docs/brand/BRAND.md); the wide wordmark does not qualify.
    logo: { "@type": "ImageObject", url: `${site}/logos/icanspeak-spanish-mark-1024.png`, width: 1024, height: 1024 },
    // Part of the icanspeak.it family (the domain root is the umbrella site).
    parentOrganization: { "@type": "Organization", name: "icanspeak.it", url: "https://icanspeak.it/" },
    description:
      "icanspeak Spanish is a free website for learning the Spanish of Spain, from A1 to C1, and preparing for the DELE, the SIELE and the CCSE.",
    // Already public on /legal-notice. The operator's name and address stay there: they are a
    // private person's, not an organisation's.
    email: LEGAL.contactEmail,
    ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
  };
}

// No SearchAction: the site search is a client-side palette over /suche.json, there is no
// results URL that takes a query parameter.
export function websiteLd(site: string) {
  return {
    "@type": "WebSite",
    "@id": websiteId(site),
    name: "icanspeak Spanish",
    alternateName: "icanspeak",
    url: `${site}/`,
    inLanguage: "en",
    publisher: { "@id": orgId(site) },
  };
}

export interface Crumb {
  name: string;
  /** Site-relative path, "/" for the start page. */
  path: string;
}

export function breadcrumbLd(site: string, items: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.path === "/" ? `${site}/` : `${site}${c.path}`,
    })),
  };
}

// Pages with a URL of their own that a nested route sits under, named like the pages
// themselves (short). A step that is not a page (/speaking/set) is left
// out of the trail rather than pointing at a 404; a dynamic one (/english-for-work/care-work) is named by
// the page through Layout's `breadcrumb` prop.
export const SECTION_PAGES: Record<string, string> = {
  "/grammar": "Grammar",
  "/vocabulary": "Vocabulary & phrases",
  "/exams": "Exams",
  "/cambridge": "DELE",
  "/trinity": "SIELE by level",
  "/trinity/ise-1": "DELE A2 for nationality",
  "/ielts": "SIELE",
  "/english-for-work": "Spanish for work",
  "/life-in-the-uk": "CCSE",
  "/knowledge": "Knowledge base",
  "/knowledge/word-stories": "Word stories",
  "/culture": "Culture",
  "/culture/insider": "Spain from the inside",
  "/teachers": "For teachers",
  "/teachers/worksheets": "Worksheets",
  "/teachers/games": "Printable games",
  "/teachers/classes": "Classes",
  "/teachers/surveys": "Surveys",
  "/teachers/tests": "Placement test for the class",
  "/teachers/quiz": "Live quiz",
  "/speaking": "Speaking",
  "/listening": "Listening",
  "/reading": "Reading",
  "/writing": "Writing",
  "/intonation": "Intonation",
  "/live-fragestunde": "Live Q&A",
};

/** The trail for `route` (no trailing slash): Start, each known parent page, the page itself.
    `override` replaces the parents (not Start, not the page). Null for "/" and top-level pages
    without an override. */
export function trailFor(route: string, pageName: string, override?: Crumb[]): Crumb[] | null {
  const segments = route.split("/").filter(Boolean);
  if (!segments.length) return null;
  const parents = override ?? segments.slice(0, -1).flatMap((_, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    return SECTION_PAGES[path] ? [{ name: SECTION_PAGES[path], path }] : [];
  });
  if (!parents.length && !override) return null;
  // "Pflege — die ersten Wörter – Pflege — kurz" under "Pflege — kurz": the trail already
  // says where the page sits, so its own step drops a trailing parent name.
  const parent = parents.at(-1)?.name;
  const name = parent && pageName.endsWith(` – ${parent}`) ? pageName.slice(0, -parent.length - 3) : pageName;
  return [{ name: "Home", path: "/" }, ...parents, { name, path: route }];
}
