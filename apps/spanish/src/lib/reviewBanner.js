// The "needs a native speaker's review" banner (2026-11-16): the interface in the course's own
// language (es) is a draft until a native speaker has read it (src/lib/languages.js). While it
// is shown in es, a slim bar at the top says so and asks for help by email. Closing it hides it
// for this browser. applyLang() in i18n.js calls showReviewBanner() on every language change.
const CODE = "es";
const EMAIL = "info@icanspeak.it";
const KEY = "isk_review_banner_closed";
const ID = "isk-review-banner";

function closed() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function showReviewBanner(code) {
  const old = document.getElementById(ID);
  if (code !== CODE || closed()) { old?.remove(); return; }
  if (old) return;
  const bar = document.createElement("div");
  bar.id = ID;
  bar.setAttribute("role", "note");
  bar.lang = CODE;
  bar.style.cssText = "display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;padding:8px 44px 8px 16px;background:#FFE29A;color:#172A6E;font:500 14px/1.4 Inter,system-ui,sans-serif;text-align:center;position:relative";
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
  document.body.prepend(bar);
}
