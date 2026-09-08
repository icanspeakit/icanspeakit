// Client-side toggle between which language's words/sounds an exercise
// drills — independent of the UI locale. The site is statically generated
// (see astro.config.mjs — no `output: 'server'`), so there's no request to
// branch on a `?practice=de` query string server-side; both language
// variants are rendered into the page at build time, and this module shows
// only one at a time. `?practice=de` and localStorage are read purely for
// bookmarking/persistence, and history.replaceState keeps the URL in sync
// without a page reload.
const PARAM = 'practice';
const STORAGE_KEY = 'icanspeakit:practice-lang';

export type PracticeLang = 'en' | 'de';

function isPracticeLang(v: string | null): v is PracticeLang {
  return v === 'en' || v === 'de';
}

export function readPracticeLang(): PracticeLang {
  const fromUrl = new URLSearchParams(location.search).get(PARAM);
  if (isPracticeLang(fromUrl)) return fromUrl;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isPracticeLang(stored)) return stored;
  } catch {
    // Storage blocked — fall through to the default.
  }
  return 'en';
}

function applyPracticeLang(lang: PracticeLang) {
  document.querySelectorAll<HTMLElement>('[data-practice-lang]').forEach((el) => {
    el.hidden = el.dataset.practiceLang !== lang;
  });
  document.querySelectorAll<HTMLButtonElement>('[data-practice-toggle-btn]').forEach((btn) => {
    const active = btn.dataset.practiceToggleBtn === lang;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-current', active ? 'true' : 'false');
  });
}

/** Wires up every `[data-practice-toggle-btn]` on the page to show/hide every `[data-practice-lang]` block. Safe to call once per page. */
export function initPracticeLangToggle() {
  applyPracticeLang(readPracticeLang());

  document.querySelectorAll<HTMLButtonElement>('[data-practice-toggle-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next: PracticeLang = btn.dataset.practiceToggleBtn === 'de' ? 'de' : 'en';
      const url = new URL(location.href);
      if (next === 'en') url.searchParams.delete(PARAM);
      else url.searchParams.set(PARAM, next);
      history.replaceState(null, '', url);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage blocked — the toggle still works for this page view.
      }
      applyPracticeLang(next);
    });
  });
}
