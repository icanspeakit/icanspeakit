# Release-Notes November 2026

Das geht mit dem Push von `monorepo` live. Grundlage: die Commits seit `origin/monorepo` (rund 400) und die Queue-Berichte.

## Portugiesisch (größter Block)
- Der Portugiesisch-Kurs ist jetzt ein eigener Kurs für europäisches Portugiesisch (pt-PT) und nicht mehr ein Spanisch-Klon.
- Grammatik A1 bis C1 als pt-PT-Themen, mit Hinweisen zu brasilianischen Formen.
- Neue Inhalte: Aussprache, Lesen und Schreiben, Sprechen im CAPLE-Stil, Redewendungen, falsche Freunde, Wortschatz, Konjugationstrainer, Hörverstehen mit 16 Dialogen in pt-PT.
- Neue Landeskunde-Module: Staatsbürgerschaftsweg, Bürgerkunde Portugals, AIMA- und Finanças-Simulator, Portugiesisch für die Arbeit.
- Spiele: Hörsafari und der Artikel-Trainer (o/a) mit portugiesischen Regeln.

## Russisch als Oberflächensprache
- Alle fünf Kurse (Englisch, Spanisch, Französisch, Italienisch, Portugiesisch) lassen sich auf Russisch bedienen, mit eigenen kyrillischen Schriften.
- Der Portugiesisch-Kurs hat eine neu übersetzte russische Oberfläche.

## Alle Kurse
- Deutsche Reste in Oberflächen, Beschriftungen und Prüftexten sind bereinigt. Das Löschen-Bestätigungswort ist überall `DELETE`.
- Reste des Spanisch-Kurses in anderen Kursen sind entfernt, und tote Weiterleitungen wurden aufgeräumt.
- Datumsangaben erscheinen in der Sprache der Oberfläche.
- Rechtstexte gibt es im Englischen mit Übersetzung, und die Seitensuche ist neu aufgebaut.
- Die Startseiten verlinken jetzt den Italienisch-Kurs.

## Englisch
- Neue Audios für Grammatik, Aussprache und Zungenbrecher (en-GB).
- Sachfehler in den Landeskunde-Karten sind korrigiert, zum Beispiel die Volkszählung in Schottland.

## Französisch und Italienisch
- Neue Wortfallen-Audios (Italienisch: 112 Clips).
- Landeskunde-Fehler sind korrigiert: Korsika-Postleitzahlen, Trento und Bozen, die Ausspracheregel zu *sera*.
- Fehlende Icons ergänzt.

## Intern (kein Besucher sieht es)
- Admin-Dashboard mit Übersichten zu Features, Ideen, Audits, Marketing und Partnern.
- Neue Prüfskripte `check:i18n` und `check:parity` (halten ru.json und die übrigen Sprachdateien synchron), dazu Brand-Kit und Deploy-README.

## Bitte nach dem Push kurz ansehen
1. https://icanspeak.it/ (Hub) und die Kursstartseiten /portugues/, /espanol/
2. https://icanspeak.it/portugues/ru/ (Russisch)
3. https://icanspeak.it/portugues/ (Hörverstehen und die Grammatik-Seite)
4. https://icanspeak.it/english/privacy (Rechtstexte, wird auch von /linguistics verlinkt)
5. https://icanspeak.it/francais/ (Startseite in einer Nicht-Heimat-Sprache)

## Bewusst nicht geändert
- `check:i18n` und `check:parity` melden weiter Befunde im Portugiesisch-Kurs (343 fehlende, 482 überzählige pt-Schlüssel, Platzhalter-Abweichungen in pt.json) und die Warnung, dass die Kurssprache zugleich Oberflächensprache ist. Die Build-Gates sind grün, die Seiten zeigen keine rohen Schlüssel, aber pt.json im Portugiesisch-Kurs gehört einmal aufgeräumt.
- `check:base` für `apps/linguistics` schlägt fehl, weil dort 78-mal `/english/privacy` verlinkt ist. Das ist gewollt (geteilte Datenschutzseite) und der Link funktioniert.
- Französisch hat 30 Wortgeschichten im Status „Entwurf". Sie werden nicht veröffentlicht, bis sie auf „geprueft" stehen. Es sind noch 0 von 60 für die Tagesmail eingeplant.
- `llms.txt` ist mit 11,7 KB etwas über der 10-KB-Marke (nur eine Build-Warnung).
- Die Sichtprüfung im Browser bei 390 und 1440 px und die Konsolenprüfung ließen sich in diesem Lauf nicht machen (kein Browser-Werkzeug im unbeaufsichtigten Betrieb). Stattdessen wurden alle gebauten Seiten per Skript geprüft.
