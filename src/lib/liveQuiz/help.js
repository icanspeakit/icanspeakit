/* The setup form's "what does each setting do" panel.
 *
 * First visit: it stands open above the form, so a teacher sees every setting explained
 * once without asking. It folds away into its ? as soon as they start choosing (or after
 * a while, unless they are reading it), and the ? gives a short pulse so the eye follows
 * it there. After that it opens only on request: the ? opens it for this visit, and the
 * next visit starts folded again. (It used to stay pinned open across visits once the ?
 * had opened it, so the form was never seen without it; only a new user, or "Tour neu",
 * gets it unasked now.)
 *
 * While it peeks, a small countdown ring sits beside the chevron, so the fold that follows
 * is expected rather than a surprise. The ring's CSS animation IS the timer: its
 * animationend folds the panel, and CSS pauses it while the panel is hovered or focused,
 * so the time shown and the time left can never disagree. Fold it by hand and the ring
 * goes with it.
 *
 * Flag: "da-lq-help-seen" (the first-visit peek happened — "…seen" so DemoDock's
 * "Tour neu" clears it). ?intro forces the peek without spending the flag.
 *
 * Markup contract, inside `form`:
 *   [data-help-toggle]  the ? button (aria-controls the panel)
 *   [data-help]         the panel, folded unless it carries .is-open
 *   [data-help-close]   optional, inside the panel: folds it (the title)
 */
const SEEN = "da-lq-help-seen";
// The old pin, cleared on sight so a panel pinned before this change stops opening.
const OLD_PIN = "da-lq-help-open";
const PEEK_MS = 12000;

const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };

export function mountSetupHelp(form) {
  const btn = form?.querySelector("[data-help-toggle]");
  const panel = form?.querySelector("[data-help]");
  if (!btn || !panel) return;

  const setOpen = (open) => {
    panel.classList.toggle("is-open", open);
    panel.inert = !open;
    btn.setAttribute("aria-expanded", String(open));
  };

  let peeking = false;
  let clock = null;
  let tick = null;
  // The countdown is over (or no longer wanted): the ring leaves, the panel stays as it is.
  const stopClock = () => {
    peeking = false;
    clearInterval(tick);
    clock?.remove();
    clock = null;
    form.classList.remove("is-peeking");
  };
  const endPeek = () => {
    if (!peeking) return;
    stopClock();
    setOpen(false);
    btn.classList.remove("is-pulse");
    void btn.offsetWidth;
    btn.classList.add("is-pulse");
  };

  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") !== "true";
    stopClock();
    setOpen(open);
  });

  // The title folds it as well, so the panel reads as a section that collapses.
  panel.querySelector("[data-help-close]")?.addEventListener("click", () => {
    stopClock();
    setOpen(false);
    btn.focus();
  });

  set(OLD_PIN, null);

  const forced = new URLSearchParams(location.search).has("intro");
  if (get(SEEN) === "1" && !forced) return setOpen(false);

  setOpen(true);
  peeking = true;
  if (!forced) set(SEEN, "1");

  // Choosing a setting says "I've got it". The panel's own clicks do not count.
  form.addEventListener("change", endPeek, { once: true });
  form.querySelector("[data-vocab-toggle]")?.addEventListener("click", endPeek, { once: true });
  // Time alone never folds it under a pointer or focus that is reading it: CSS pauses the
  // ring then (live-quiz.css, .lq-form:has(.lq-help:hover)).
  const secs = Math.round(PEEK_MS / 1000);
  clock = document.createElement("span");
  clock.className = "lq-help-timer";
  clock.setAttribute("aria-hidden", "true");
  clock.style.setProperty("--peek", `${PEEK_MS}ms`);
  clock.innerHTML =
    '<svg viewBox="0 0 28 28" width="28" height="28"><circle class="lq-help-timer-track" cx="14" cy="14" r="11"/>' +
    '<circle class="lq-help-timer-ring" cx="14" cy="14" r="11"/></svg>' +
    `<b>${secs}</b>`;
  form.append(clock);
  form.classList.add("is-peeking");
  const ring = clock.querySelector(".lq-help-timer-ring");
  const num = clock.querySelector("b");
  ring.addEventListener("animationend", endPeek, { once: true });
  // The number reads the same animation, so it pauses with it.
  tick = setInterval(() => {
    const t = ring.getAnimations?.()[0]?.currentTime;
    if (typeof t === "number") num.textContent = String(Math.max(1, Math.ceil((PEEK_MS - t) / 1000)));
  }, 200);
}
