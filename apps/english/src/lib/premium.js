// What is paid content, by level — the one answer (STRIPE-PREMIUM-CLI-PROMPT.md, Tier 4).
//
// docs/monetization-strategy-v1.md and the decision of 2026-10-02: explanations are always
// free and indexable. Paid are (a) every C1 Übungssatz and the exercises of every C1 grammar
// topic (Premium), and (b) the extra DTZ sets (DTZ-Paket or Premium). The old "nothing is
// Premium" placeholder is gone; this module is plain data, safe for scripts, pages and the
// browser alike.
//
// Paid data lives in src/paid/ and reaches the browser only as /inhalt/**.json after the
// lock check — scripts/build-paid-manifest.mjs. Whether a learner may load it is
// src/lib/access.js's question, not this file's.
export const PAID_LEVELS = ["C1"];

/** Is the practice part of a grammar topic at this level paid? */
export const isPaidLevel = (level) => PAID_LEVELS.includes(level);

/** The registry feature (src/data/premium-features.json) that unlocks a level's practice. */
export const featureForLevel = (level) => (level === "C1" ? "c1" : null);
