// What the pricing surfaces say, derived from the two data files and nothing else
// (PREMIUM-FEATURES Tier 6): src/data/produkte.json (products, display prices) and
// src/data/premium-features.json (what each plan includes, the limits). A limit or price
// changed there changes /preise, the homepage block, /exams and the lock cards alike.
//
// The display price must match the Stripe price behind the product's lookup key; Stripe is
// what is charged. A price change is a Stripe change AND a line in produkte.json.
//
// Features whose tier is not built yet (`live: false`) are left out, never shown as "bald".
import features from "../data/premium-features.json";
import produkte from "../data/produkte.json";
import steuer from "../data/steuer.json";
import de from "../../public/i18n/en.json";

export const PAYWALL = import.meta.env.PUBLIC_PAYWALL === "on";

/* The tax line under every price, and the one on Stripe's invoices: src/data/steuer.json is
   the only place the wording lives (Kleinunternehmer, § 19 UStG — docs/monetization-tax-v1.md).
   The German i18n string must be the same sentence, or the page would switch to an older one
   once the dictionary loads; the build stops if they drift apart. */
export { steuer };
export const TAX_NOTE = steuer.preisHinweis;
if (de["preise.steuerHinweis"] !== steuer.preisHinweis) {
  throw new Error("public/i18n/de.json preise.steuerHinweis differs from src/data/steuer.json preisHinweis");
}

/** 29 → "29 €", 7.99 → "7,99 €" (German format, as on the invoice). */
export const euro = (n) => `${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")} €`;

export const pack = produkte.find((p) => p.id === "pack_dtz");
export const premium = produkte.find((p) => p.id === "premium");
/** Premium yearly, per month, rounded to the cent: 59 → "4,92 €". */
export const yearlyPerMonth = euro(Math.round((premium.price.year.amount / 12) * 100) / 100);
/** How much the year saves against twelve months, in whole percent. */
export const yearlySaving = Math.round((1 - premium.price.year.amount / (premium.price.month.amount * 12)) * 100);

export const liveFeatures = features.filter((f) => f.live);

const UNIT = { sessions: "Sitzungen", reviews: "Wiederholungen", mistakes: "Fehler", weeks: "Wochen", sets: "Übungssätze", players: "Teilnehmende" };

/** A plan's cell for one feature: "2 Sitzungen pro Tag", "unbegrenzt", "—", "✓". */
export function cell(f, plan) {
  const unlocked = plan === "premium" ? f.unlockedBy.includes("premium") || f.unlockedBy.some((p) => p.startsWith("pack_")) : f.unlockedBy.some((p) => p.startsWith("pack_"));
  if (plan !== "free" && !unlocked) return { text: "—", key: "preise.cell.no" };
  const lim = plan === "free" ? f.free : f.paid;
  if (plan === "pack" && f.id === "pruefungssaetze") return { text: "+ 3 DTZ-Sätze", key: "preise.cell.dtz3" };
  if (lim.limit === 0) return { text: "—", key: "preise.cell.no" };
  if (plan !== "free" && f.id === "pruefungsplan") return { text: "ganzer Plan + Kalender", key: "preise.cell.fullPlan" };
  if (lim.limit == null) return { text: "unbegrenzt", key: "preise.cell.unlimited" };
  if (lim.per === "day") return { text: `${lim.limit} ${UNIT[lim.unit]} pro Tag`, key: `preise.cell.perDay.${lim.unit}`, vars: { n: lim.limit } };
  if (f.id === "pruefungsplan") return { text: "Woche 1", key: "preise.cell.week1" };
  if (f.id === "pruefungssaetze") return { text: "Übungssatz 1", key: "preise.cell.set1" };
  return { text: `${lim.limit} ${UNIT[lim.unit]}`, key: `preise.cell.n.${lim.unit}`, vars: { n: lim.limit } };
}

/** One row per live feature: id (the anchor), its name key, and the three cells. */
export const comparison = liveFeatures.map((f) => ({
  id: f.id,
  nameKey: f.i18n,
  descKey: `${f.i18n}.desc`,
  free: cell(f, "free"),
  pack: cell(f, "pack"),
  premium: cell(f, "premium"),
}));

/** The first `n` live features for the compact summaries (homepage, /exams). */
export const topFeatures = (n = 4) => liveFeatures.slice(0, n);

/* The price cards (src/components/PriceCards.astro). The Premium card names what it adds on
   top of the DTZ-Paket — one short line per live feature Premium unlocks, under its own
   preise.card.<id> key, with the paid limit as {n} where there is one (Aussprache 30× am Tag).
   check-premium.mjs fails the build when a live feature has no such key. */
export const premiumCardItems = liveFeatures
  .filter((f) => f.unlockedBy.includes("premium"))
  .map((f) => ({ key: `preise.card.${f.id}`, vars: f.paid.limit != null ? { n: f.paid.limit } : null }));

/** Lookup keys of the two Premium intervals, from produkte.json: { month: "premium_month", year: … }. */
export const premiumLookup = {
  month: premium.lookupKeys.find((k) => k.endsWith("_month")),
  year: premium.lookupKeys.find((k) => k.endsWith("_year")),
};
