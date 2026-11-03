# data/partneruebungen — interne Planungsdaten

`menschen-a1-katalog.json` listet die 131 Partner- und Gruppenübungen aus dem Kursbuch
Menschen A1 (Lektion, Seite, Aufgabe, Titel, Übungsform). Die Liste ist **intern**:

- **Katalog = Ideenliste, nie Inhalt.** Sie zeigt nur, welche Grammatikziele und
  Übungsformen auf A1 vorkommen. Kein Satz, keine Person, keine Situation daraus geht auf die
  Website. Unsere Blätter (`src/data/partneruebungen/*.json`) sind eigene Texte mit
  Veränderungsgrad 2 (Skill `partner-arbeitsblatt`, §1).
- Nichts unter `src/` importiert diese Datei, nichts davon kommt nach `public/`, nichts wird
  gerendert. `scripts/check-lehrwerk-leak.mjs` (postbuild) bricht den Build ab, wenn eine
  Katalog-Id oder der Lehrwerkname in `dist/` auftaucht, und prüft, dass `src/` die Datei nicht
  importiert.
- Die Buch-Screenshots (`Downloads\Partneruebungen A1 Kursbuch`) liegen nur auf Edgars Laptop,
  nie im Repo. Das Feld `datei` verweist auf diesen lokalen Ordner.

## Format

```json
{ "id": "mA1-kb-s141-6d-a", "lektion": "01", "seite": 141, "aufgabe": "6d",
  "titel": "…", "quelle": "Aktionsseite", "partner": "A" | "B" | null,
  "format": "infogap-ab", "datei": "Lektion 01/…png" }
```

`partner` ist gesetzt, wenn das Buch die Übung auf zwei Seiten (Partner A / Partner B) teilt.

## Verteilung der Übungsformen

| Form | Anzahl |
|---|---|
| dialog-muster | 52 |
| infogap-ab | 18 |
| interview | 14 |
| rollenspiel | 9 |
| schreiben-zu-zweit | 9 |
| spiel | 8 |
| bingo-umfrage | 8 |
| bildvergleich | 4 |
| wuerfel | 1 |
| verweis (auf Aktionsseiten) | 8 |
| **gesamt** | **131** |

Ein Blatt darf in `quelle.intern` die Katalog-Id nennen, aus der die Idee stammt; das Feld wird
nie gerendert (`src/lib/partneruebungen/schema.js` hält es aus allem heraus, was Seiten und PDFs
bekommen).
