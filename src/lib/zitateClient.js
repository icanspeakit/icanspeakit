// Browser side of the quote cards (src/components/zitate/ZitatCard.astro).
import { getLang, retranslate } from "./i18n.js";
import { t } from "./uiText.js";
import { enhanceSwitch } from "./segSwitch.js";

const MODE_KEY = "da_zitat_modus";
const RTL = new Set(["ar", "fa"]);

function getMode() {
  try { return localStorage.getItem(MODE_KEY) === "einfach" ? "einfach" : "original"; } catch { return "original"; }
}
function setMode(m) {
  try { localStorage.setItem(MODE_KEY, m); } catch {}
}

const setText = (el, text, code) => {
  el.textContent = text;
  el.lang = code;
  el.dir = RTL.has(code) ? "rtl" : "auto";
};

/**
 * Everything that follows the header language: the word glosses (English when that
 * language has none), the explanation, and whether the translate button is offered.
 * German UI: none of it — the hints and the explanation are German already.
 * @param {ParentNode} [root]
 */
export function fillTr(root = document) {
  const lang = getLang();
  root.querySelectorAll("[data-tr]").forEach((el) => {
    const tr = JSON.parse(el.dataset.tr);
    const code = tr[lang] ? lang : "en";
    el.hidden = lang === "de";
    if (el.hidden) el.textContent = "";
    else setText(el, tr[code], code);
  });
  root.querySelectorAll("[data-zitat]").forEach((card) => {
    const tl = JSON.parse(card.dataset.tl || "{}")[lang];
    const mean = card.querySelector("[data-mean-tl]");
    const wrap = card.querySelector("[data-tl-wrap]");
    const bio = card.querySelector("[data-bio-name]");
    if (bio) bio.setAttribute("aria-label", t("zitate.card.bioAria", "Über {name}", { name: bio.dataset.bioName }));
    mean.hidden = !tl;
    wrap.hidden = !tl;
    if (!tl) return;
    setText(mean, tl.meaning, lang);
    // The quote text: verse breaks as line breaks.
    const box = card.querySelector("[data-tl-text]");
    box.replaceChildren(...tl.text.split(" / ").flatMap((line, i) => (i ? [document.createElement("br"), line] : [line])));
    box.lang = lang;
    box.dir = RTL.has(lang) ? "rtl" : "auto";
  });
}

function applyMode(card, mode) {
  card.querySelectorAll("[data-mode-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modeBtn === mode)));
  card.querySelector("[data-original]").hidden = mode === "einfach";
  card.querySelector("[data-easy]").hidden = mode !== "einfach";
  // In easy mode the explanation is already where the quote was.
  card.querySelector("[data-mean]").hidden = mode === "einfach";
}

/**
 * Wire one or more cards: the Original/Einfach switch and the translate button.
 * Safe to call again on a new fragment.
 * @param {ParentNode} [root]
 */
export function initCards(root = document) {
  root.querySelectorAll("[data-zitat]").forEach((card) => {
    if (card.dataset.ready) return;
    card.dataset.ready = "1";
    applyMode(card, getMode());
    const sw = card.querySelector("[data-mode]");
    sw.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-mode-btn]");
      if (!b) return;
      setMode(b.dataset.modeBtn);
      applyMode(card, b.dataset.modeBtn);
    });
    enhanceSwitch(sw, { content: [card.querySelector("[data-original]"), card.querySelector("[data-easy]")] });

    const btn = card.querySelector("[data-tl-btn]");
    const box = card.querySelector("[data-tl-box]");
    btn.addEventListener("click", () => {
      const open = box.hidden;
      box.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      // The key goes along, so a later language switch repaints the right label.
      const key = open ? "tt.hide" : "tt.show";
      btn.dataset.i18n = key;
      btn.textContent = t(key, open ? "Übersetzung ausblenden" : "Übersetzung zeigen");
    });
  });
  // A fragment fetched after the page was translated (the hub's card of the day).
  if (root !== document) retranslate();
  fillTr(root);
}
