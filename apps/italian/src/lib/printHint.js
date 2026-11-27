// window.print() with a word when nothing happens. In-app browsers (Instagram, Facebook …) and
// some iPhones ignore print() silently, and learners tapped "Print" again and again. No
// beforeprint soon after the call means no print dialog came up, so a line under the button
// says what to do instead.
import { t } from "./uiText.js";

export function showPrintHint(btn) {
  if (!btn?.parentElement || btn.parentElement.querySelector(".ab-print-hint")) return;
  const p = document.createElement("p");
  p.className = "ab-print-hint";
  p.setAttribute("role", "status");
  p.setAttribute("data-i18n", "ab.printHint");
  p.style.cssText = "flex-basis:100%;margin:8px 0 0;font-size:.9rem;color:var(--muted)";
  p.textContent = t("ab.printHint", "No print window? In your browser, tap “Share” and then “Print”. This doesn’t work inside apps such as Instagram: open the page in Safari or Chrome first.");
  btn.parentElement.appendChild(p);
}

/** Calls window.print(); if no print dialog opened within 1.5 s, shows the hint under btn. */
export function printWithHint(btn) {
  let opened = false;
  const mark = () => { opened = true; };
  addEventListener("beforeprint", mark, { once: true });
  window.print();
  setTimeout(() => {
    removeEventListener("beforeprint", mark);
    if (!opened) showPrintHint(btn);
  }, 1500);
}
