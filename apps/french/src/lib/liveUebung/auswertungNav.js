// In the site nav (SiteNav.astro): kept live-practice results show their corner button on every
// page. Without any, nothing more is loaded. See auswertung.js.
try {
  if (sessionStorage.getItem("da-lu-auswertung")) import("./auswertung.js").then(({ showChip }) => showChip());
} catch {}
