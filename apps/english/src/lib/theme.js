// Theme (light/dark) — mirrors the shape of i18n.js so both switchers in the nav
// behave the same way: read once, write to localStorage, notify subscribers.
//
// Stored value is "light" | "dark" | "system". Absent means light: the site opens light
// even on a dark OS or browser (THEME-HELL-STANDARD-PROMPT.md). Only an explicit
// "system" (Konto → Darstellung, the app's „Wie das Handy“) follows the OS.
// The actual applied theme always lands on <html data-theme="…"> so CSS only ever
// has to match one selector; the pre-paint snippet in Layout.astro sets it before
// first paint so there is no white flash on a dark-mode reload.

const STORAGE_KEY = "da-theme";
const THEMES = ["light", "dark"];
const CHOICES = [...THEMES, "system"];
const listeners = new Set();

// Browser chrome (address bar on mobile, PWA titlebar) follows these.
// Light is the brand teal, the colour the <meta> in Layout.astro starts with.
const THEME_COLOR = { light: "#0d9488", dark: "#0f141b" };

function systemTheme() {
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function stored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return CHOICES.includes(v) ? v : null;
  } catch {
    return null; // private mode / storage blocked — light, like a first visit
  }
}

/** "light" | "dark" | "system": what was chosen. Nothing chosen counts as light. */
export function themeChoice() {
  return stored() ?? "light";
}

const resolve = (choice) => (choice === "system" ? systemTheme() : choice === "dark" ? "dark" : "light");

function paint(next) {
  document.documentElement.dataset.theme = next;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[next]);
  listeners.forEach((fn) => fn(next));
}

/** The theme actually in effect right now. */
export function getTheme() {
  return document.documentElement.dataset.theme || resolve(themeChoice());
}

/** True when the user picked light or dark (not "system", not nothing). */
export function hasExplicitTheme() {
  const v = stored();
  return v === "light" || v === "dark";
}

export function setTheme(theme) {
  const next = THEMES.includes(theme) ? theme : "light";
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore — the theme still applies for this page view */
  }
  paint(next);
  return next;
}

/** Follow the OS from now on ("System" on /konto, „Wie das Handy“ in the app). Stored
 *  as "system", not as a missing key: missing means light. */
export function setSystemTheme() {
  try {
    localStorage.setItem(STORAGE_KEY, "system");
  } catch {
    /* ignore */
  }
  const next = systemTheme();
  paint(next);
  return next;
}

export function toggleTheme() {
  return setTheme(getTheme() === "dark" ? "light" : "dark");
}

export function onThemeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Follow the OS live, but only while the stored choice is "system". Called once per page
 * by the toggle component and the app; safe to call more than once.
 */
let watching = false;
export function watchSystemTheme() {
  if (watching || typeof matchMedia !== "function") return;
  watching = true;
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (stored() !== "system") return;
    paint(e.matches ? "dark" : "light");
  });
}
