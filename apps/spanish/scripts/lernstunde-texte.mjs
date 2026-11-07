// Learner texts for /lesson: one du-form solo draft per phase template of the Stundenplan
// (the `variant` ids in build(), src/lib/stundenplan.js), next to the teacher's text it
// comes from. Writes src/data/lernstunde-texte.json and prints the review list.
//
//   node scripts/lernstunde-texte.mjs
//
// Production shows a text only once it has "geprueft": true (Edgar sets that in the JSON);
// until then /lesson falls back to a short neutral text per phase (FALLBACK in lernen.js).
// Running this again never overwrites a reviewed text, and keeps a draft that was edited
// by hand in the JSON (only new templates are added; drafts unchanged here stay as they are).
//
// Placeholders, filled per Stunde by lernText() in src/lib/unterricht/lernen.js:
//   {thema} {grammatik} {grammatik3} {woerter} {woerter3} {ziele} {vorher} {pruefung}
// Rules for every text: du-form, alone (no Paare, no Plenum, no Tafel), easy German, at most
// two short sentences. `bruno`: at most 8 words, never guilt („Du hast noch nicht …“).
import fs from "node:fs";

const OUT = "src/data/lernstunde-texte.json";

const DRAFTS = {
  "einstieg.bildimpuls": {
    lehrkraft: "Bildimpuls: Zeig ein Foto zum Thema … Die Lernenden beschreiben in Paaren, was sie sehen.",
    text: "Schau dir das Foto an. Beschreib in drei Sätzen, was du siehst.",
    bruno: "Erst schauen, dann schreiben.",
  },
  "einstieg.wortigel": {
    lehrkraft: "Frage an die Gruppe: Was fällt euch zum Thema … ein? Sammelt Wörter an der Tafel (Wortigel).",
    text: "Was fällt dir zum Thema „{thema}“ ein? Schreib fünf Wörter auf.",
    bruno: "Jedes Wort zählt.",
  },
  "einstieg.blitzlicht": {
    lehrkraft: "Blitzlicht: Jede Person sagt einen Satz mit … Fehler sammelst du kommentarlos an der Tafel.",
    text: "Schreib einen Satz mit {vorher}. Dann lies ihn laut.",
    bruno: "Ein Satz reicht.",
  },
  "einstieg.dreifragen": {
    lehrkraft: "Drei Fragen zur letzten Stunde (…), mündlich im Plenum. Dann ein Satz zum heutigen Ziel.",
    text: "Drei Fragen zur letzten Stunde ({vorher}). Antworte erst im Kopf, dann deck auf.",
    bruno: "Was weißt du noch?",
  },
  "einstieg.wiederholung": {
    lehrkraft: "Wiederholung: Die Lernenden erklären sich in Paaren gegenseitig … mit je einem eigenen Beispielsatz.",
    text: "Wiederhol {grammatik}: Schreib zu jedem Punkt einen eigenen Satz.",
    bruno: "Erst erinnern, dann weiter.",
  },
  "wortschatz.einfuehren": {
    lehrkraft: "Neue Wörter einführen: … Mit Bildern oder Gesten erklären; Artikel und Plural an die Tafel.",
    text: "Neue Wörter: {woerter}. Lern sie mit den Karteikarten – mit Artikel und Plural.",
    bruno: "Eine Runde Karten, dann weiter.",
  },
  "wortschatz.erklaeren": {
    lehrkraft: "Wörter wiederholen (…): Wörter erklären in Paaren – eine Person erklärt, ohne das Wort zu sagen.",
    text: "Wiederhol die Wörter: {woerter}. Mach eine Runde Karteikarten.",
    bruno: "Kennst du sie noch?",
  },
  "wortschatz.kette": {
    lehrkraft: "Wortschatz-Kette: Reihum ein Satz mit einem Wort aus …; wer stockt, bekommt Hilfe aus der Gruppe.",
    text: "Sag einen Satz mit jedem Wort aus {woerter3}. Dann eine Runde Karteikarten.",
    bruno: "Laut sprechen hilft.",
  },
  "grammatik.entdecken": {
    lehrkraft: "Regel entdecken: Zeig 4–5 Beispielsätze zu … Die Lernenden finden das Muster selbst.",
    text: "Schau dir die Sätze zu {grammatik} an. Erkennst du die Regel?",
    bruno: "Erst Beispiele, dann die Regel.",
  },
  "grammatik.erklaeren": {
    lehrkraft: "Kurz erklären (höchstens 10 Minuten), dann gelenkte Übung zu …: erst Lückensätze, dann eigene Sätze.",
    text: "Kurz erklärt: {grammatik}. Schau die Präsentation bis zum Ende an.",
    bruno: "In deinem Tempo.",
  },
  "grammatik.vertiefung": {
    lehrkraft: "Vertiefung: … Typische Fehler aus der letzten Stunde an die Tafel; die Gruppe korrigiert gemeinsam.",
    text: "Noch einmal: {grammatik}. Achte auf die typischen Fehler.",
    bruno: "Zweimal sehen hilft.",
  },
  "uebung.einzelarbeit": {
    lehrkraft: "Einzelarbeit online: Übungen auf der Themenseite, danach Vergleich in Paaren.",
    text: "Mach die Übungen zu {grammatik}. Prüf jede Antwort.",
    bruno: "Fehler sind hier erlaubt.",
  },
  "uebung.partner": {
    lehrkraft: "Partnerübung: Auf der Themenseite „Als Partnerübung“ wählen; zu zweit fragen und antworten.",
    text: "Mach die Übungen zu {grammatik}. Sprich die Sätze dabei laut.",
    bruno: "Laut lernt man doppelt.",
  },
  "uebung.livequiz": {
    lehrkraft: "Live-Quiz mit der ganzen Gruppe (QR-Code): kurze Fragen zu …",
    text: "Teste dich: die Übungen zu {grammatik}. Schnell, aber genau.",
    bruno: "Los geht's!",
  },
  "anwendung.rollenspiel": {
    lehrkraft: "Lernziel … – Rollenspiel in Paaren.",
    text: "Dein Ziel: {ziele} Schreib ein kurzes Gespräch: 5–6 Sätze, zwei Personen.",
    bruno: "Du spielst beide Rollen.",
  },
  "anwendung.kugellager": {
    lehrkraft: "Lernziel … – Kugellager (Innen- und Außenkreis), zwei Runden.",
    text: "Dein Ziel: {ziele} Sprich zwei Minuten dazu – oder schreib 5 Sätze.",
    bruno: "Sprechen ist auch Üben.",
  },
  "anwendung.text": {
    lehrkraft: "Lernziel … – Kurzer Text: 5–6 Sätze, danach Austausch mit dem Nachbarn.",
    text: "Dein Ziel: {ziele} Schreib einen kurzen Text: 5–6 Sätze.",
    bruno: "Kurze Sätze sind gut.",
  },
  "anwendung.block": {
    lehrkraft: "Anwenden, was der Block verspricht: … – Rollenspiel in Paaren oder ein kurzer Text (6–8 Sätze).",
    text: "Zeig, was du kannst: {ziele} Schreib 6–8 Sätze.",
    bruno: "Jetzt kommt alles zusammen.",
  },
  pruefung: {
    lehrkraft: "Prüfungstraining: … Mit Zeitlimit wie in der Prüfung, danach die Lösungen besprechen.",
    text: "Prüfungstraining: {pruefung}. Mach den Teil bis zum Ergebnis.",
    bruno: "Wie in der echten Prüfung.",
  },
  test: {
    lehrkraft: "Kurztest per QR-Code zu …: jede Person am Handy, du siehst die Ergebnisse pro Person.",
    text: "Kurztest: 10 Aufgaben zu {grammatik3}. Danach siehst du dein Ergebnis.",
    bruno: "Nur für dich, ohne Note.",
  },
  "abschluss.hausaufgabe": {
    lehrkraft: "Hausaufgabe: Übungen zu … auf der Themenseite und die Wortliste wiederholen.",
    text: "Für morgen: Wiederhol die Übungen zu {grammatik} und die Wortliste.",
    bruno: "Morgen noch einmal kurz.",
  },
  "abschluss.rueckblick": {
    lehrkraft: "Rückblick: Was kann ich jetzt? Jede Person nennt ein Lernziel, das sie erreicht hat …",
    text: "Was kannst du jetzt? Hak ab, was du kannst.",
    bruno: "Schau, wie weit du bist!",
  },
};

let current = {};
try { current = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch {}

const out = { _hinweis: "Lerntexte für /lesson (scripts/lernstunde-texte.mjs). Nur \"geprueft\": true erscheint auf der Website; sonst ein neutraler Text je Phase." };
const review = [];
for (const [id, d] of Object.entries(DRAFTS)) {
  const was = current[id];
  // Reviewed, or edited by hand: keep it as it is.
  const entry = was?.text ? was : { text: d.text, bruno: d.bruno, geprueft: false };
  out[id] = entry;
  const words = entry.bruno ? entry.bruno.split(/\s+/).length : 0;
  if (words > 8) throw new Error(`${id}: Bruno has ${words} words (max 8)`);
  if (/\b(Paar|Partner|Plenum|Tafel|Gruppe|euch|ihr)\b/.test(entry.text)) throw new Error(`${id}: not solo / not du-form: ${entry.text}`);
  review.push(`- [${entry.geprueft ? "x" : " "}] \`${id}\` — ${entry.text}${entry.bruno ? ` · Bruno: „${entry.bruno}“` : ""}\n  Lehrkraft: ${d.lehrkraft}`);
}
for (const id of Object.keys(current)) if (!(id in out)) console.warn(`not a template any more, dropped: ${id}`);
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`${Object.keys(DRAFTS).length} Texte → ${OUT} (${review.filter((r) => r.startsWith("- [x]")).length} geprüft)\n`);
console.log(review.join("\n"));
