// The "needs a native speaker's review" banner (2026-11-16): the interface in the course's own
// language (es) is a draft until a native speaker has read it (src/lib/languages.js).
// Since 2026-11-16 (later the same day) only on the pages listed in REVIEW_PAGES, never on the
// course home, and not at the top: a note just above the site footer asks for help by email.
// Closing it hides it for this browser. applyLang() in i18n.js calls showReviewBanner() on every
// language change.
import { stripBase } from "./paths.js";
const CODE = "es";
const EMAIL = "hello@icanspeak.it";
const KEY = "isk_review_banner_closed";
const ID = "isk-review-banner";
// The pages that still need a native speaker's review, as paths without the course base
// ("/grammaire/articles", not "/francais/grammaire/articles"). Empty = the note shows nowhere.
const REVIEW_PAGES = [];

function listed() {
  const path = stripBase(location.pathname).replace(/\/+$/, "") || "/";
  return path !== "/" && REVIEW_PAGES.includes(path);
}

function closed() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function showReviewBanner(code) {
  const old = document.getElementById(ID);
  if (code !== CODE || closed() || !listed()) { old?.remove(); return; }
  if (old) return;
  const bar = document.createElement("div");
  bar.id = ID;
  bar.setAttribute("role", "note");
  bar.lang = CODE;
  bar.style.cssText = "display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;max-width:880px;margin:32px auto;padding:12px 48px 12px 18px;background:#FFE29A;color:#172A6E;border:2px solid #172A6E;border-radius:16px;font:500 14px/1.4 Inter,system-ui,sans-serif;text-align:center;position:relative;box-sizing:border-box;width:calc(100% - 32px)";
  const text = document.createElement("span");
  text.textContent = 'Esta versión en español aún tiene que revisarla un hablante nativo. ¿Ves algo raro o quieres ayudarnos?';
  const link = document.createElement("a");
  link.href = `mailto:${EMAIL}?subject=${encodeURIComponent("icanspeak – es")}`;
  link.textContent = `Escríbenos ahora: ${EMAIL}`;
  link.style.cssText = "color:#172A6E;font-weight:700;text-decoration:underline";
  const x = document.createElement("button");
  x.type = "button";
  x.textContent = "×";
  x.setAttribute("aria-label", 'Cerrar');
  x.style.cssText = "position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:none;color:#172A6E;font-size:22px;line-height:1;cursor:pointer;padding:4px 8px";
  x.addEventListener("click", () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    bar.remove();
  });
  bar.append(text, link, x);
  // Just above the site footer; at the end of the page when there is none.
  const footer = document.querySelector("[data-site-footer]");
  if (footer) footer.before(bar); else document.body.append(bar);
}
