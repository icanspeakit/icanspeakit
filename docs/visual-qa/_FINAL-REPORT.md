# Visual-QA: Abschlussbericht (24.11.2026)

Stand: Branch `icanspeak-visual-qa`. Alles gebaut, im Browser (Chromium, 390 und 1440 px) auf den fertigen Seiten (dist) geprüft. Nichts gepusht, nichts deployt.

## Prüfungen und Build

- Voller Build `pnpm build` (alle Apps): bestanden, inkl. Leak-Checks der Kurse. Nach dem letzten Fix zusätzlich `build:french` neu gebaut: bestanden.
- `check-parity`: ok (nur die bekannte Warnung: Kurssprache ist zugleich UI-Sprache bei es/fr/pt).
- `check:i18n`: 0 Funde in allen 5 Kursen. `check:untranslated`: ok (unter den Limits).
- `check:base`: ok in allen Apps (siehe Fix bei Linguistics unten).
- `check:links` nicht neu gelaufen (braucht pro App eine lange Laufzeit; Build-Zeit war das Limit).

## Visual-Pass: Ergebnis dieses Laufs (Stichprobe 40 Seiten je Kurs, Hub und Linguistics alle Seiten)

| App | Prüfungen | Auffälligkeiten |
|---|---|---|
| hub | 2 | 0 |
| english | 80 | 0 |
| spanish | 80 | 2: "administracion.gob.es" wird als Roh-Key erkannt (Fehlalarm, es ist eine Web-Adresse im Text) |
| french | 80 | 0 (nach Fix, vorher 2: `itemKey is not defined`) |
| italian | 80 | 0 |
| portuguese | 80 | 2: "caple.letras.ulisboa.pt" wird als Roh-Key erkannt (Fehlalarm, Web-Adresse) |
| linguistics | 160 | 18, alles Fehlalarme: `/api/tts` und `/api/tts-timestamps` sind Worker-Routen, mein statischer Testserver kann sie nicht bedienen; dazu `/__mobile-preview` (Dev-Seite) |

Vergleich mit den Einzelläufen je Kurs: Alle dort behobenen Fehler sind weg (kein Überlauf auf Mobilgeräten, keine fehlenden Imports mehr). Ein neuer Fehler tauchte nur in French auf (siehe unten), weil er in der kleineren Stichprobe damals nicht dabei war.

## Pro Kurs: gefunden, behoben, offen

**English**
- Behoben: falsche Basispfade, Fehler im Insider-Quiz (fehlender Import), Überlauf auf Mobil bei `/exams`.
- Offen: nichts.

**Spanish**
- Behoben: Überlauf auf Mobil bei `/examenes`.
- Offen: nichts (Fehlalarm Web-Adresse bleibt, kein Fehler).

**French**
- Behoben (früher): Überlauf bei `/examens` und `/plan-d-examen`.
- Neu behoben: `/culture/codes-sociaux/<thema>`: Das Quiz-Skript brach mit "itemKey is not defined" ab (Import im Skript fehlte, gleicher Fehler wie in Italian und Portuguese). Jetzt importiert, neu gebaut, geprüft: 0 Probleme.
- Offen: nichts.

**Italian**
- Behoben: fehlender Import auf `/cultura/dietro-le-quinte/...`, Überlauf bei `/esami` und `/scioglilingua`.
- Offen: Im ersten Lauf dieser Runde brach eine Audiodatei ab (`b2-beschwerde-versicherung.mp3`, ERR_ABORTED). Im Wiederholungslauf kein Fehler, wirkt wie ein Abbruch durch die Seitennavigation im Test, kein defekter Link.

**Portuguese** (seit 23.11. live, Europäisches Portugiesisch)
- Behoben: fehlender Import auf `/cultura/por-dentro/...`, Überlauf bei `/exames` und `/plano-de-exame`.
- Behoben: pt.json (482 übrig gebliebene Spanisch-Schlüssel entfernt, 343 fehlende pt-PT-Texte ergänzt, 11 Platzhalter angeglichen).
- Offen: nichts.

**Hub**
- 1 Seite, 0 Probleme. Alle fünf Kurse sind verlinkt, Portugiesisch inklusive.

**Linguistics**
- Behoben: Überlauf auf Mobil bei `/exercise-sketches` (91 px).
- Behoben in diesem Lauf: `check:base` schlug fehl wegen des Links `/english/privacy` im Cookie-Banner. Der Link ist Absicht (gemeinsame Datenschutzseite), `/english` ist jetzt in `apps/linguistics/package.json` als erlaubt eingetragen.
- Offen: `/api/tts`-Routen lassen sich nur im echten Worker testen; nicht im statischen Test.

## Russische Texte (separat geprüft, siehe Commits `russian-review-*`)
- Bereinigt: English 89, Spanish 108, French 200, Italian 157, Portuguese 270 Strings (Reste aus anderen Kursen, Lehnübersetzungen, Begriffe vereinheitlicht, ty/vy). Zusätzlich Glossar für Russisch.

## Bewusst nicht gemacht
- Keine Neugestaltung, keine Inhalte gelöscht.
- Keine vollständige Prüfung aller Seiten je Kurs (Stichprobe 40 von je 1500 bis 3000 Seiten).
- Kein Link-Crawl auf tote interne Links in diesem Lauf.
- Keine inhaltliche Sprachprüfung über die Rohschlüssel-/Platzhalter-Checks hinaus.

## Hinweis für Wiederholung
- Linguistics (Adapter-Build) so prüfen: `node scripts/visual-pass.mjs --dist <abs>/apps/linguistics/dist/client/linguistics --base linguistics --all` (Basis ohne führenden Slash, sonst ändert Git Bash den Pfad).
- `scripts/visual-pass.mjs` hat zusätzlich einen Fix: bei der Stichprobe konnte eine Route `undefined` entstehen (kam bei Italian vor).
- Ergebnisse: `docs/visual-qa/final/<app>/` (results.json, summary.md, Screenshots nur von Auffälligkeiten).
