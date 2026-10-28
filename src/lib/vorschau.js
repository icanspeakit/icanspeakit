// „▶ Vorschau“ in the demo dock (DemoDock.astro): the ten best things on the site, one page
// each, for showing the project to investors. Start writes the demo record first (the same as
// „✱ Demo-Daten“), so progress, streaks and mistakes are filled in where a page shows them.
//
// A small presenter card, bottom right, on every page while it runs: step n/10, what the
// feature is and why it matters, what to tap, ‹ Zurück · Weiter › · ✕. The step lives in
// sessionStorage („da-vorschau“), so it survives the page changes and ends with the tab.
// Only where the dock is (our own devices): mountVorschau is called from the dock's script.
//
// The list is the one place to change the ten.
const KEY = "da-vorschau";

export const STEPS = [
  {
    href: "/einfach",
    title: "Einfach lernen",
    pitch: "Ein Schritt pro Bildschirm, für alle, die ganz neu anfangen. Kein Menü, keine Entscheidung – Bruno führt.",
    tap: "Den ersten Schritt antippen und zeigen, wie wenig auf dem Bildschirm steht.",
  },
  {
    href: "/dativ",
    title: "Grammatik: Regel und Übungen",
    pitch: "Jedes Thema als kurze Regel mit Beispielen, dann Übungen mit sofortiger Rückmeldung – von A1 bis C1.",
    tap: "Eine Lücke falsch füllen: die Erklärung kommt sofort.",
  },
  {
    href: "/wortschatz/a1-04",
    title: "Wortschatz in der eigenen Sprache",
    pitch: "Karteikarten mit Bild, Audio und Übersetzung in die Muttersprache, 2.750 Karten von A1 bis B2, mit Wiederholung nach Plan.",
    tap: "Karte umdrehen, oben eine andere Sprache wählen.",
  },
  {
    href: "/aussprache-check",
    title: "Aussprache-Check",
    pitch: "Satz einsprechen, sofort sehen, welche Wörter gut klingen und welche noch nicht. Läuft im Browser, ohne App.",
    tap: "Mikrofon antippen und einen Satz sprechen.",
  },
  {
    href: "/pruefungen",
    title: "Prüfungstraining Goethe und telc",
    pitch: "Übungssätze im Format der echten Prüfungen, A2 bis C1, mit Zeit und Auswertung – der Grund, warum viele kommen.",
    tap: "Eine Prüfung öffnen und den Aufbau zeigen.",
  },
  {
    href: "/fortschritt",
    title: "Fortschritt",
    pitch: "Jede Zahl kommt aus echter Übung: Serie, Themen, häufige Fehler. Hier mit Demo-Daten gefüllt.",
    tap: "Auf die Fehler-Liste zeigen: daraus wird die nächste Übung.",
  },
  {
    href: "/lehrkraefte/quiz",
    title: "Live-Quiz für die Klasse",
    pitch: "Lehrkraft zeigt den Code am Beamer, die Klasse spielt am Handy – aus jedem Kapitel, ohne Konto für die Lernenden.",
    tap: "Ein Kapitel wählen und das Quiz starten.",
  },
  {
    href: "/lehrkraefte/stundenplan",
    title: "Stundenplan und Unterricht",
    pitch: "Eine ganze Stunde geplant in Phasen, mit Uhr, Präsentation und Übungen – im Unterricht Schritt für Schritt durchklicken.",
    tap: "„Unterricht starten“ und die Uhr zeigen.",
  },
  {
    href: "/lehrkraefte/umfragen",
    title: "Umfragen und Tests per QR-Code",
    pitch: "Die Klasse sagt anonym, was sie lernen will, oder schreibt einen Test – Ergebnisse live, ausgewertet ohne Korrigieren.",
    tap: "Bruno zeigt den Ablauf in drei Schritten.",
  },
  {
    href: "/lehrkraefte/arbeitsblaetter",
    title: "Arbeitsblätter und Spiele zum Drucken",
    pitch: "Fertige Arbeitsblätter zu den Grammatikthemen und Spiele für die Gruppe – zum Ausdrucken oder als PDF.",
    tap: "Ein Blatt öffnen und die Druckansicht zeigen.",
  },
];

// The pages' one-time intros (each stores "1" once seen; „✦ Tour neu“ clears them). A
// Vorschau marks them all seen, so no tour bubble cuts into the presenter's flow. A new
// tour joins this list (keys end in -seen or -peek).
const TOURS = [
  "da-artikel-hint-seen", "da-artikel-rule-peek", "da-aussprache-regel-peek", "da-ex-rule-peek",
  "da-fakten-easy-seen", "da-grammatik-ex-rule-peek", "da-grammatik-rule-peek", "da-lq-help-seen",
  "da-lq-lernsets-seen", "da-lu-fold-seen", "da-praep-rule-peek", "da-pruefung-info-seen",
  "da-satzmelodie-tour-seen", "da-stufen-foldtab-seen", "da-ut-leiste-seen", "da-vb-rule-seen",
  "da-wortschatz-lernsets-seen",
];
const quietTours = () => { try { TOURS.forEach((k) => localStorage.setItem(k, "1")); } catch {} };

const read = () => { try { const v = sessionStorage.getItem(KEY); return v == null ? null : Number(v); } catch { return null; } };
const write = (i) => { try { i == null ? sessionStorage.removeItem(KEY) : sessionStorage.setItem(KEY, String(i)); } catch {} };

function go(i) {
  write(i);
  location.assign(STEPS[i].href);
}

/** From the dock's „▶ Vorschau“: demo data in (seed), then step 1. */
export function startVorschau(seed) {
  seed();
  quietTours();
  go(0);
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** On every page with the dock: the presenter card, while a Vorschau runs. */
export function mountVorschau() {
  const i = read();
  if (i == null || !STEPS[i]) return;
  quietTours(); // again: „✦ Tour neu“ may have been pressed mid-run
  const s = STEPS[i];
  const last = i === STEPS.length - 1;
  const card = document.createElement("aside");
  card.className = "vs-card";
  card.setAttribute("aria-label", "Vorschau");
  card.innerHTML = `
    <div class="vs-top">
      <span class="vs-step">Vorschau · ${i + 1}/${STEPS.length}</span>
      <button type="button" class="vs-x" data-vs-end aria-label="Vorschau beenden" title="Vorschau beenden">✕</button>
    </div>
    <ol class="vs-dots" aria-hidden="true">${STEPS.map((_, k) => `<li class="${k === i ? "is-on" : k < i ? "is-done" : ""}"></li>`).join("")}</ol>
    <h2 class="vs-title">${esc(s.title)}</h2>
    <p class="vs-pitch">${esc(s.pitch)}</p>
    <p class="vs-tap"><span aria-hidden="true">👆</span> ${esc(s.tap)}</p>
    <div class="vs-nav">
      <button type="button" class="vs-btn" data-vs-prev ${i === 0 ? "hidden" : ""}>‹ Zurück</button>
      <button type="button" class="vs-btn vs-btn--main" data-vs-next>${last ? "Fertig" : "Weiter ›"}</button>
    </div>`;
  document.body.append(card);
  // a page reached by hand (not this step's): one tap back to the step's page
  if (location.pathname.replace(/\/$/, "") !== s.href) {
    const back = document.createElement("a");
    back.className = "vs-here";
    back.href = s.href;
    back.textContent = "Zur Seite dieses Schritts";
    card.querySelector(".vs-tap").after(back);
  }
  const end = () => { write(null); card.remove(); };
  card.querySelector("[data-vs-end]").addEventListener("click", end);
  card.querySelector("[data-vs-prev]").addEventListener("click", () => go(i - 1));
  card.querySelector("[data-vs-next]").addEventListener("click", () => (last ? end() : go(i + 1)));
}
