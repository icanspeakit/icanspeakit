// Which switches on the site animate (src/lib/segSwitch.js), in one list. Loaded on every
// page by Layout.astro; each entry only acts where its selector matches, including switches
// a page renders later (the exam dashboard, the Wortschatz language tabs).
//
// A new switch gets a line here: its container, and, if the switch shows and hides panels,
// the panels, so they come in with the switch. Switches whose content already has its own
// entrance (the Wortschatz trainer, the Artikel sessions, the Aussprache-Check slide) only
// get the sliding marker.
import { enhanceSwitch } from "./segSwitch.js";

/** @type {Array<{ sel: string, content?: string, options?: string }>} */
const SWITCHES = [
  // Übungen
  { sel: "#hub-mode-tabs", content: "#view-grid-mode, #view-dashboard-mode" },
  { sel: ".uv-lvl-tabs", content: ".uv-wk-grid[data-wk-view]" },
  { sel: "#dash-tabs", content: ".dash-view" },
  // Fortschritt, Konto
  { sel: ".fs-tabs", content: "[data-view-panel]" },
  { sel: ".fs-viewtabs" },
  { sel: ".kt-tabs", content: "#kt-panel-profil, #kt-panel-einstellungen" },
  // Wortschatz trainer and picker
  { sel: "#vt-tabs" },
  { sel: ".vt-list-scope" },
  { sel: ".ls-cuts" },
  // Artikel, Akkusativ, Präpositionen
  { sel: ".akk-mode", options: ":scope > button" },
  { sel: ".akk-tabs" },
  { sel: ".akk-difficulty" },
  // Satzmelodie: the four exercises
  { sel: ".sm-tabs", content: "#sm-p-hoeren, #sm-p-quiz, #sm-p-akzent, #sm-p-labyrinth" },
  // Aussprache-Check
  { sel: ".ac-mode" },
  { sel: ".ac-levels" },
  // Grammar topics, Aktiv mode
  { sel: ".ak-beats", content: "[data-beat-panel]" },
  // Level rails (Wortschatz, grammar topics, Fortschritt, Artikel, Aussprache, Präpositionen)
  { sel: ".nvb-rail" },
  // Prüfungen, Leben in Deutschland
  { sel: ".sb-setpicker" },
  { sel: ".fl-chips", content: ".fl-card" },
  // Typische Fehler (/kultur/fehler)
  { sel: ".ft-tabs" },
  // Für Lehrkräfte
  { sel: ".abi-levels", content: ".abi-sec" },
  { sel: ".ab-seg" },
  { sel: ".ab-langs", options: ":scope > button" },
  { sel: ".sp-seg", options: ":scope > label", content: "[data-sp-sheets]" },
  // Wortgeschichte: wöchentlich/täglich (subscribe box), Aus/Wöchentlich/Täglich (/konto)
  { sel: ".wg-freq", options: ":scope > label" },
  { sel: ".kt-wort-freq", options: ":scope > button" },
  // Merch: Motive by kind, and by product (the grid is redrawn on each change)
  { sel: ".mx-kinds[data-mx-filters]", content: "[data-grid]" },
  { sel: ".mx-tiles[data-mx-prodfilters]", content: "[data-grid]" },
  // Preise: Monatlich | Jährlich (homepage, /pruefungen, /preise)
  { sel: ".pc-switch", content: ".pc-price[data-show]" },
];

function scan(root = document) {
  for (const { sel, content, options } of SWITCHES) {
    const found = root.matches?.(sel) ? [root] : [...root.querySelectorAll(sel)];
    for (const el of found) {
      enhanceSwitch(el, {
        ...(options ? { options } : {}),
        content: content ? [...document.querySelectorAll(content)] : null,
      });
    }
  }
}

const ALL = SWITCHES.map((s) => s.sel).join(", ");

function start() {
  scan();
  // Switches that appear later: checked only in what was added, and only when it matches.
  new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches(ALL) || n.querySelector(ALL)) scan(n);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
