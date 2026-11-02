// Client side of /culture/mistakes and its side-nav test /test123: the language picker, the
// deep links from the Aussprache-Check, and the pronunciation drills.
//
// The chosen language is the learner's first language (src/lib/muttersprache.js), shared
// with the Check's picker. #<mistake> lands on that mistake and lights it up; #drill-… opens
// that drill; ?lang= or the stored choice picks the language.
import { mountFuerDich } from "./ausspracheFuerDich.js";
import { mutterspracheFromUrl, setMuttersprache, onMutterspracheChange, syncMutterspracheFromAccount } from "./muttersprache.js";

/**
 * @param {HTMLElement} page
 * @param {{ fallback?: string, onShow?: (id: string) => void, onReveal?: (el: HTMLElement) => void }} [opts]
 *   fallback  the language shown when none is chosen ("alle" on the hub, the first one on a
 *             page that shows one language at a time)
 *   onReveal  called before a deep-linked mistake or drill is scrolled to, so a page with
 *             tabs can open the tab it sits in
 */
export function mountFehlerSeite(page, { fallback = "alle", onShow, onReveal } = {}) {
  const info = JSON.parse(document.getElementById("fe-muttersprache")?.textContent || "{}");
  const known = info.languages.map((l) => l.id);
  const chips = [...page.querySelectorAll("[data-lang]")];
  const sections = [...page.querySelectorAll("[data-lang-section]")];
  const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function show(id) {
    const ok = id && (id === "alle" ? fallback === "alle" : sections.some((s) => s.dataset.langSection === id));
    const pick = ok ? id : fallback;
    for (const c of chips) {
      const on = c.dataset.lang === pick;
      c.classList.toggle("is-on", on);
      c.setAttribute("aria-pressed", String(on));
    }
    for (const s of sections) s.hidden = pick !== "alle" && s.dataset.langSection !== pick;
    onShow?.(pick);
  }

  function reveal(hash) {
    const el = hash ? document.getElementById(decodeURIComponent(hash)) : null;
    if (el instanceof HTMLDetailsElement && el.classList.contains("md-drill")) {
      show(el.closest("[data-lang-section]")?.dataset.langSection ?? null);
      onReveal?.(el);
      el.open = true;
      el.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" });
      return true;
    }
    if (!el?.classList.contains("fe-mistake")) return false;
    show(el.closest("[data-lang-section]")?.dataset.langSection ?? null);
    onReveal?.(el);
    el.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "center" });
    el.classList.remove("is-flash");
    void el.offsetWidth;
    el.classList.add("is-flash");
    return true;
  }

  // Choosing a language is choosing the first language: the Check's picker follows.
  for (const c of chips) {
    c.addEventListener("click", () => {
      const id = c.dataset.lang;
      const q = new URLSearchParams(location.search);
      if (id === "alle") q.delete("lang");
      else q.set("lang", id);
      const qs = q.toString();
      history.replaceState(null, "", `${location.pathname}${qs ? `?${qs}` : ""}`);
      show(id);
      if (id !== "alle") setMuttersprache(id);
      c.dispatchEvent(new CustomEvent("fe:pick", { bubbles: true, detail: id }));
    });
  }
  onMutterspracheChange((id) => show(id));

  // #<mistake> wins, then the old #<language> links, then ?lang= or the stored choice.
  const hash = location.hash.slice(1);
  if (!reveal(hash)) show(known.includes(hash) ? hash : mutterspracheFromUrl(known));
  addEventListener("hashchange", () => reveal(location.hash.slice(1)));
  // „Jetzt üben" to the same hash twice fires no hashchange; handle the click itself.
  page.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest("a.fe-practice, a.af-link--quiet") : null;
    if (a && a.hash && a.hash === location.hash) { e.preventDefault(); reveal(a.hash.slice(1)); }
  });
  syncMutterspracheFromAccount();

  mountFuerDich(page, {
    info,
    // The reason is on this page: „Warum passiert das?" jumps to it instead of reloading.
    onFindings: (box) => {
      for (const a of box.querySelectorAll(".af-link--quiet")) a.href = a.hash;
    },
  });
  return { show, reveal };
}
