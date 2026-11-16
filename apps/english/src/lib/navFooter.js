// The site footer (src/components/SiteFooter.astro) and what the desktop nav leaves to it,
// since 2026-11-16. Ported from deutschacademy (its commit da6d8f2, 2026-11-14): the nav panels
// keep the core of each section, the rest moves into the footer columns, and the Entdecken menu
// leaves the bar for the footer altogether. Items are named by their catalog titleKey, which is
// the same in all five course apps; only SLUGS and the route patterns below are this course's.
// The phone drawer (NavDrawer.astro) keeps everything, as on deutschacademy.
import * as catalog from "./catalog.js";

/** This course's slugs for the pages the catalog does not list (base-less, like every href). */
export const SLUGS = {
  placement: "/placement-test",
  about: "/about",
  progress: "/progress",
  imprint: "/legal-notice",
  privacy: "/privacy",
  terms: "/terms",
  account: "/account"
};

/** Footer size by route (base-less, no trailing slash). none: screens a class or a learner works
    in (live quiz, a running lesson, joining a game); slim: games, exam sets, skill exercises and
    trainers, where a big footer only distracts; full: everything else. */
export const FOOTER_NONE = /^\/game(\/|$)|^\/teachers\/(lesson|quiz\/|surveys\/|tests\/)/;
export const FOOTER_SLIM = /^\/games\/[^/]+|^\/(trinity|cambridge|ielts|life-in-the-uk)\/[^/]+\/.|^\/(listening|reading|writing|speaking)\/.|^\/(lesson|placement-test)(\/|$)/;
export function footerFor(route) {
  if (FOOTER_NONE.test(route)) return "none";
  if (FOOTER_SLIM.test(route)) return "slim";
  return "full";
}

/** Taken out of the desktop nav panels (NavMenubar.astro). Each is in a footer column below,
    or (an anchor on a page the nav still links) one click away on that page. */
export const NAV_FOOTER_ONLY = new Set([
  // Üben
  "biz.title", "dgt.title",
  "nav.skill.ausspracheCheck", "nav.skill.zungenbrecher", "nav.skill.satzmelodie",
  // Wissen
  "nav.kultur.fehler", "nav.kultur.lidFakten", "nav.kultur.auto",
  "wissen.cat.pruefungen.name", "wissen.official.title", "nav.wissen.lernen",
  "sprachen.map.title", "nav.wissen.wortfallen", "nav.wissen.bildwoerterbuch", "nav.wissen.zitate",
]);
/** Whole menus the desktop bar no longer shows (data-menu values). */
export const NAV_HIDDEN_MENUS = new Set(["entdecken"]);

// Every catalog entry with a link and a key, first one wins: label, href and i18n vars of a
// footer link come from the same place as the nav's, so a renamed slug moves in both.
const byKey = new Map();
const seen = new Set();
(function walk(v) {
  if (!v || typeof v !== "object" || seen.has(v)) return;
  seen.add(v);
  if (Array.isArray(v)) { v.forEach(walk); return; }
  const key = v.titleKey ?? v.nameKey;
  if (typeof v.href === "string" && key && !byKey.has(key)) {
    byKey.set(key, { h: v.href, t: v.title ?? v.name, k: key, v: v.titleVars });
  }
  Object.values(v).forEach(walk);
})(Object.values(catalog));

const pick = (...keys) => keys.map((k) => byKey.get(k)).filter(Boolean);
const exams = catalog.navSections.find((s) => s.id === "pruefungen");

/** The footer's columns: { title, k, links: [{ h, t, k?, v? }] }. */
export const FOOTER_GROUPS = [
  { title: "Practise", k: "home.footer.col.practise", links: [
    ...pick("nav.subject.grammatik", "nav.subject.wortschatz", "nav.skill.aussprache",
      "nav.skill.ausspracheCheck", "nav.skill.zungenbrecher", "nav.skill.satzmelodie", "biz.title", "dgt.title"),
    { h: SLUGS.placement, t: "Placement test", k: "home.footer.link.placement" },
  ] },
  { title: "Exams", k: "nav.exams", links: [
    ...(exams?.items ?? []).map((i) => ({ h: i.href, t: i.title ?? i.name, k: i.titleKey ?? i.nameKey })),
  ] },
  { title: "Library", k: "nav.subject.wissen", links: pick(
    "nav.kultur.fehler", "nav.kultur.lidFakten", "nav.kultur.auto", "wissen.official.title",
    "nav.wissen.lernen", "nav.wissen.wortfallen", "nav.wissen.bildwoerterbuch", "nav.wissen.zitate",
  ) },
  { title: "For teachers", k: "nav.subject.lehrkraefte", links: pick(
    "nav.lk.all", "lk.quiz.title", "lk.ab.title", "nav.lk.kl", "nav.lk.stundenplan",
  ) },
  { title: "Explore", k: "nav.entdecken", links: [
    ...pick("nav.entdecken.crew", "nav.entdecken.filme", "nav.merch"),
    { h: SLUGS.progress, t: "Your progress", k: "home.footer.link.dashboard" },
    { h: SLUGS.about, t: "About me", k: "home.footer.link.about" },
  ] },
].map((g) => ({ ...g, links: g.links.filter((l) => l.h) })).filter((g) => g.links.length);
