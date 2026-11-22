# icanspeak Spanish: suggestions to curated material lists, drafts v1 (2026-11-17)

Lane `outreach` of the batch `traction-es-fr` (`prompts/traction-es-fr/outreach.md`). Claude researched the
lists and wrote the drafts. **Edgar sends.** When one has gone out, put the date in the tracking table, and
later the answer. Same method as `outreach-english-v1.md` (read its "why" first); this file applies it to
https://icanspeak.it/espanol/. The French twin is `outreach-french-v1.md`.

Rules for every draft (same as the English file):
- Each mail goes out on its own, to the person named on the page if there is one. No mail merge, no BCC.
- Each one says openly that it comes from the person who made the site, and proposes exactly one page.
- No paid listings, no link swaps, no "write for us" blogs, no Reddit/forum posts.
- No numbers in the drafts on purpose. Counts change; if you want one ("fichas para N temas"), read it off
  the live page on the day you send.
- Before each mail, open the list page once. Check it is still maintained and the contact is still the one in
  the table.
- Send from the icanspeak address, not a private one. Signature on every mail:
  `Edgar Kretschmann · https://icanspeak.it/espanol/`.

## ⛔ Before sending anything

Send only **after the release** of this batch, once these pages are live and look right. The page names below
are the paths the `spanish` lane builds (`prompts/traction-es-fr/course.md`); all of them answered HTTP 200 on
2026-11-17, but the content behind `/espanol/conocimientos` was still the old one then.

| Page | Built by | Check before sending |
|---|---|---|
| https://icanspeak.it/espanol/conocimientos | `spanish` lane | The German leftovers (`grammatik-*.pdf`, German headings) are gone. Spanish grammar PDFs by level, word lists and the official sample-paper links (DELE, SIELE, Instituto Cervantes) are there. The heading says in Spanish what it is (free PDFs to learn Spanish). Every PDF opens. |
| https://icanspeak.it/espanol/profesores/fichas/ and the sheets below it (`gramatica/…`, `vocabulario/…`) | `spanish` lane | Titles and text are Spanish, not the inherited German topics. Print preview puts the answer key on its own page. "Nueva versión" (or whatever the lane calls the button) works. |
| https://icanspeak.it/espanol/prueba-de-nivel | exists (200 on 2026-11-17) | Opens without an account. |
| https://icanspeak.it/espanol/dele | exists (200 on 2026-11-17) | Opens without an account; practice sets work. The official DELE sample-paper links answer 200. |
| Bing and Google know the site | `indexing` lane of the English batch + Edgar | `https://icanspeak.it/sitemap.xml` is submitted in Bing Webmaster Tools. An editor who checks the link should find the site in a search. |

If a page does not ship something a draft mentions (e.g. the word lists), delete that half-sentence before
sending.

Page codes used in the table: **K** `/espanol/conocimientos`, **F** `/espanol/profesores/fichas/`,
**P** `/espanol/prueba-de-nivel`, **D** `/espanol/dele`.

## Tracking table (Spanish course)

All list URLs returned HTTP 200 on 2026-11-17 (curl), except where noted. "Last update" is the date shown on the
page that day; "none visible" means the page shows none (HTTP headers say nothing useful, they carry the
time of the request). Order = order of the list below, not the sending order (see "Send first").

| # | Target | Lang | Contact | Last update | Page | Status | Date sent | Answer |
|---|---|---|---|---|---|---|---|---|
| 1 | todoELE, Recursos (ELE materials database) | es | todoele@gmail.com; also "Enviar materiales" https://todoele.net/node/add/recursos (whether it needs an account: not found) | none visible | F | draft | | |
| 2 | todoELE, ELE en la red (sites for teachers) | es | same address as #1, send only after #1 is answered | none visible | K | draft | | |
| 3 | Consejería de Educación Bélgica/Países Bajos/Luxemburgo, Recursos ELE | es | form https://www.educacionfpydeportes.gob.es/belgica/contacto.html (the page shows dpd@mecd.es, data protection, not for this) | newest item Nov 2025 (checked 2026-11-15) | K | draft | | |
| 4 | Consejería de Educación Francia, Recursos ELE | es | form https://www.educacionfpydeportes.gob.es/francia/contacto.html | none visible | K | draft | | |
| 5 | Deutscher Bildungsserver, Spanisch | de | Caroline.Hartmann@fwu.de (named on the page) · "Link vorschlagen" https://www.bildungsserver.de/eintragen.html | 11.12.2025 | F | draft | | |
| 6 | LMU München Sprachenzentrum, Online-Lernangebote Spanisch | de | form https://www.lmu.de/sprachenzentrum/de/kontakt/kontaktformular/ | none visible | K | draft | | |
| 7 | Uni Marburg Sprachenzentrum, Self-Study Center Spanish | de | sz@staff.uni-marburg.de | none visible | K | draft | | |
| 8 | KU Eichstätt-Ingolstadt Sprachenzentrum, Virtuelles Regal Spanisch | de | form https://www.ku.de/die-ku/kontakt | none visible | K | draft | | |
| 9 | Uni Köln Sprachlabor, DELE preparation: online platforms | en | no address on the page; general contact https://www.uni-koeln.de/en/contact, ask for the Sprachlabor | changed 15 Dec 2025 | D | draft | | |
| 10 | University of Liverpool Language Lounge, Spanish online resources | en | Language.Lounge@liverpool.ac.uk | none visible | D | draft | | |
| 11 | University of Illinois library, Spanish Language: A Learner's Guide | en | litlan@library.illinois.edu (Literatures and Languages Library) | 16 Nov 2026 | K | draft | | |
| 12 | UTRGV library, Spanish: Open Educational Resources | en | researchandinstruction@utrgv.edu | 10 Nov 2026 | K | draft | | |
| 13 | Durham Technical Community College library, Spanish: Web Resources | en | library@durhamtech.edu ("Report a problem" link on the page) | 2 Jun 2026 | K | draft | | |
| 14 | Tarleton State University library, Spanish: Web | en | quinnell@tarleton.edu ("Report a problem" link on the page; no full name shown) | 24 Aug 2026 | K | draft | | |
| 15 | University of Warwick, links for teachers KS4 (French and Spanish) | en | email form on the page ("techsupport.language, Resource"); also SMLCOffice at warwick.ac.uk | 10 Nov 2026 | F | draft | | |

List pages (one per row, same numbers):

1. https://todoele.net/recursos
2. https://todoele.net/ele-en-la-red
3. https://www.educacionfpydeportes.gob.es/belgica/formacion-profesorado-ele/recursos-ele.html
4. https://www.educacionfpydeportes.gob.es/francia/recursos/ele-a-distancia.html
5. https://www.bildungsserver.de/Spanisch-9555-de.html (loads for a browser; curl timed out from here, read through the fetch tool)
6. https://www.lmu.de/sprachenzentrum/de/selbstlernen/online-lernangebote/spanisch/
7. https://www.uni-marburg.de/en/language-center/self-study-center/available-learning-resources/spanish
8. https://www.ku.de/sprachenzentrum/service-fuer-studierende/sprachen-lernen-online/virtuelles-regal/spanisch
9. https://sprachlabor.phil-fak.uni-koeln.de/en/language-learning/self-study/language-test-preparation-spanish/online-learning-platforms
10. https://www.liverpool.ac.uk/language-lounge/modern-languages/spanish/online-resources/
11. https://guides.library.illinois.edu/spanishlanguage
12. https://utrgv.libguides.com/spanish/OER
13. https://durhamtech.libguides.com/SPA/web
14. https://tarleton.libguides.com/languages/web
15. https://warwick.ac.uk/fac/arts/modernlanguages/about/contact/schools/linksforteachers/keystage4/

Notes per target, where it matters:
- **1, 2** todoELE takes materials from teachers and shares them under Creative Commons; the Recursos page has a
  filter by format and source. The footer address was hidden behind email protection; it decodes to
  todoele@gmail.com. Send #1 first with the worksheets (teachers' material). #2 (a list of sites) only after
  #1 has an answer, with the knowledge page, so the same inbox does not get two proposals at once.
- **3, 4** Spanish ministry offices abroad. Both pages are lists of free ELE sites for teachers. The forms ask
  for name, e-mail, subject and text. Spanish is the right language, formal register.
- **5** The same editor listed deutschacademy's `/wissen`, and she is also on the English-course mail
  (`outreach-english-v1.md` #1). Wait for her answer there. The page already holds eTwinning, Verbito and
  mundo.schule links, mostly for school teachers: propose the worksheets, not the downloads.
- **6, 7, 8** University language centres: the Spanish pages are lists of free outside sites (Instituto
  Cervantes, RAE, podcasts, Lingolia). Same maintainers as the English pages in the English file. Low effort
  for them, so decent odds.
- **9** The page compares platforms and has a row "Free of charge?". It is about DELE preparation, so propose
  `/espanol/dele`, not the downloads. No named contact: use the general contact form and ask for the Sprachlabor.
- **10** The page already links sample DELE exams, so the DELE practice page is the natural next link.
- **11–14** Library guides in the US. The address is the library's general or "Report a problem" inbox, so each
  mail asks to pass it on to the guide's owner. Lower odds than a named librarian, but the guides are updated
  often. Illinois lists apps; UTRGV lists open grammar and podcast sites (best fit); Durham and Tarleton list
  free sites and podcasts.
- **15** Warwick's Spanish links are few and commercial; weak fit. Send last.

Not included, checked 2026-11-17: UT San Antonio library guide (most items need a UTSA login), Bodleian
Libraries (dictionaries and journals, no learner list), Cambridge MML guide (points to another page, no list on
this one), Consejería Reino Unido and Países Nórdicos "recursos" pages (institutional links, no way to suggest),
Consejería EE. UU. Boston links (institutional, weak), Consejería Alemania "enlaces de interés" (Cervantes and EU
portals only). Centro Virtual Cervantes was in maintenance on 2026-11-15 and is not a place that takes
suggestions. ASELE has no list page, redELE has no outside links (both checked 2026-11-15).

Not verified: **Deutscher Spanischlehrerverband** (DSV, `hispanorama.de`) and the Brazilian and Italian
associations of Spanish teachers (APEERJ, APEDF, AISPI): searched on 2026-11-17, no links page with a way to
suggest was found, so they are not in the table. Worth a look in a real browser if the first batch lands.

Gaps: nothing usable found for Brazil, Italy or Latin America. The big ELE portals host their own material.

---

## The drafts

### 1. todoELE, Recursos (es)

**Asunto:** Propuesta de recurso para todoELE: fichas de gramática para imprimir

> Buenos días:
>
> les propongo un recurso gratuito para la sección Recursos: https://icanspeak.it/espanol/profesores/fichas/
>
> Hay una ficha para imprimir por cada tema de gramática, con cuadro de la regla, ejercicios de distintos
> tipos y las soluciones en una página aparte. Un botón de «nueva versión» baraja los ejercicios, por ejemplo
> para otro grupo. Sin registro y sin coste.
>
> La web es mía, así que les escribo como autor. Si prefieren que lo envíe por el formulario de «Enviar
> materiales», dígamelo y lo hago.
>
> Un saludo cordial,
> Edgar Kretschmann

*Relies on: `spanish` lane (Spanish worksheets, "nueva versión"). Use the form if the account step is simple; the mail is the fallback.*

### 2. todoELE, ELE en la red (es), only after #1 is answered

**Asunto:** Un sitio más para «ELE en la red»: PDF de gramática y enlaces a los exámenes oficiales

> Buenos días:
>
> hace poco les propuse unas fichas para imprimir; ahora les sugiero una página para ELE en la red:
> https://icanspeak.it/espanol/conocimientos
>
> Reúne la gramática del español por niveles en PDF, con ejercicios y soluciones, y enlaces a los modelos de
> examen oficiales y gratuitos del Instituto Cervantes. Sin registro.
>
> Es mi web. Si no encaja, no hay problema.
>
> Un saludo cordial,
> Edgar Kretschmann

*Relies on: `spanish` lane (grammar PDFs, official links). Rewrite the first sentence if #1 got no answer.*

### 3. Consejería de Educación Bélgica, Países Bajos y Luxemburgo (es, formulario)

**Asunto:** Sugerencia para «Recursos ELE»: gramática en PDF y práctica gratuita

> Buenos días:
>
> en su página de Recursos ELE recogen sitios gratuitos para el profesorado. Me gustaría sugerir uno:
> https://icanspeak.it/espanol/conocimientos
>
> Ofrece la gramática del español por niveles en PDF para descargar, con ejercicios y soluciones, y enlaces a
> los modelos de examen oficiales y gratuitos del Instituto Cervantes. No hace falta registrarse.
>
> La web es mía; agradezco cualquier comentario, aunque no encaje en la lista.
>
> Un saludo cordial,
> Edgar Kretschmann

### 4. Consejería de Educación Francia (es, formulario)

**Asunto:** Sugerencia para «Recursos ELE»: PDF de gramática y enlaces a los exámenes oficiales

> Buenos días:
>
> su página de recursos ELE reúne sitios para estudiar español a distancia. Quisiera proponerles uno más:
> https://icanspeak.it/espanol/conocimientos
>
> Tiene la gramática del español por niveles en PDF, con ejercicios y soluciones, y enlaces a los modelos de
> examen oficiales y gratuitos del Instituto Cervantes. Sin registro ni pago.
>
> Soy el autor de la web. Si no encaja, lo entiendo perfectamente.
>
> Un saludo cordial,
> Edgar Kretschmann

### 5. Deutscher Bildungsserver, Spanisch (de)

**Betreff:** Vorschlag für „Spanisch“: kostenlose Grammatik-Arbeitsblätter mit Lösungen

> Guten Tag Frau Hartmann,
>
> im Oktober haben Sie meine Seite deutschacademy.com/wissen aufgenommen, vielen Dank dafür. Für Spanisch gibt
> es jetzt dasselbe, und ich möchte es für die Seite „Spanisch“ vorschlagen:
> https://icanspeak.it/espanol/profesores/fichas/
>
> Zu jedem Grammatikthema gibt es ein Arbeitsblatt zum Ausdrucken: Regelkasten, Übungen und Lösungsblatt auf
> einer eigenen Seite. „Neue Version“ mischt die Aufgaben neu, etwa für Parallelgruppen. Kostenlos und ohne
> Anmeldung. Die Aufgabentexte sind auf Spanisch.
>
> Wenn es passt, freue ich mich über die Aufnahme.
>
> Viele Grüße
> Edgar Kretschmann

*Send after the answer to English #1. Relies on: `spanish` lane. Check that the button label on the page matches "Neue Version" in the German UI.*

### 6. LMU München Sprachenzentrum (de, Kontaktformular)

**Betreff:** Vorschlag für „Online-Lernangebote Spanisch“

> Guten Tag,
>
> Ihre Liste „Online-Lernangebote Spanisch“ verweist auf freie Seiten zum Selbstlernen. Ich möchte eine weitere
> vorschlagen: https://icanspeak.it/espanol/conocimientos
>
> Dort gibt es Grammatik von A1 bis C1 als kostenlose PDFs mit Übungen und Lösungen und Links zu den offiziellen,
> frei veröffentlichten Probeprüfungen des Instituto Cervantes. Ohne Anmeldung.
>
> Die Seite ist von mir; ich freue mich über Ihre Einschätzung, auch wenn sie nicht auf die Liste kommt.
>
> Viele Grüße
> Edgar Kretschmann

*Relies on: `spanish` lane. Delete "von A1 bis C1" if the PDFs do not cover all those levels (the course.md says "one PDF per level the course has").*

### 7. Uni Marburg Sprachenzentrum, Self-Study Center (de)

**Betreff:** Vorschlag für die Liste „Spanish“ im Selbstlernzentrum

> Guten Tag,
>
> Ihre Liste freier Spanisch-Lernangebote verweist auf Wörterbücher, Podcasts und Prüfungsvorbereitung. Für
> Grammatik möchte ich eine Seite vorschlagen: https://icanspeak.it/espanol/conocimientos
>
> Dort gibt es Grammatik als kostenlose PDFs nach Niveau, mit Übungen und Lösungen, dazu Links zu den offiziellen
> Probeprüfungen des Instituto Cervantes. Ohne Anmeldung.
>
> Die Seite ist von mir. Wenn sie nicht passt, ist das auch in Ordnung.
>
> Viele Grüße
> Edgar Kretschmann

### 8. KU Eichstätt-Ingolstadt Sprachenzentrum (de, Kontaktformular)

**Betreff:** Vorschlag für das „Virtuelle Regal Spanisch“

> Guten Tag,
>
> im „Virtuellen Regal Spanisch“ verlinken Sie Wörterbücher, Podcasts und Lernseiten. Ich möchte eine weitere
> vorschlagen: https://icanspeak.it/espanol/conocimientos
>
> Es sind spanische Grammatik-PDFs nach Niveau mit Übungen und Lösungen, kostenlos und ohne Anmeldung, dazu
> Links zu den offiziellen Probeprüfungen des Instituto Cervantes.
>
> Die Seite ist von mir. Könnten Sie das an die Person weitergeben, die das Regal pflegt?
>
> Viele Grüße
> Edgar Kretschmann

### 9. Uni Köln Sprachlabor, DELE-Vorbereitung (en, general contact form)

**Subject:** For your DELE preparation page: a free practice section, no account

> Hello,
>
> could you pass this to the Sprachlabor team? On your page "Online learning platforms" for DELE preparation you
> compare platforms and mark which are free of charge. I'd like to suggest one more:
> https://icanspeak.it/espanol/dele
>
> It has DELE-style practice you can do in the browser without an account, and the same site links the official
> sample papers from Instituto Cervantes.
>
> I made the site, so this is a suggestion from its author. Thank you for looking.
>
> Best regards,
> Edgar Kretschmann

*Before sending, open `/espanol/dele` and check which parts the practice covers; name them instead of "DELE-style practice" if that reads better. Ask in the form's subject line for the Sprachlabor.*

### 10. University of Liverpool Language Lounge (en)

**Subject:** Suggestion for the Spanish online resources page: free DELE practice

> Hello,
>
> your Spanish online resources page already links official DELE sample exams. I'd like to suggest a free
> practice section that sits next to them: https://icanspeak.it/espanol/dele
>
> It works in the browser, needs no account, and links the official papers too, so learners can move from one
> to the other.
>
> I made the site. If it doesn't fit the Language Lounge, I'd still be glad to hear what would make it useful.
>
> Best regards,
> Edgar Kretschmann

### 11. University of Illinois, Literatures and Languages Library (en)

**Subject:** Suggestion for "Spanish Language: A Learner's Guide"

> Hello,
>
> I'd like to suggest one more free site for your learner's guide: https://icanspeak.it/espanol/conocimientos
>
> Learners can download Spanish grammar by level as PDFs with exercises and answers, and find links to the
> official free sample papers from Instituto Cervantes. No account needed.
>
> Full disclosure: I built the site. Could you pass this on to the guide's owner if that isn't you?
>
> Best regards,
> Edgar Kretschmann

### 12. UTRGV library (en)

**Subject:** Free Spanish grammar PDFs for the Open Educational Resources page

> Hello,
>
> your Spanish OER page lists free grammar and listening sites for learners. I'd like to suggest another:
> https://icanspeak.it/espanol/conocimientos
>
> Spanish grammar by level as downloadable PDFs with exercises and answers, no account, nothing to pay, plus
> links to the official Instituto Cervantes sample papers.
>
> I made the site. Please forward this to whoever maintains the guide if that isn't you.
>
> Best regards,
> Edgar Kretschmann

### 13. Durham Technical Community College library (en)

**Subject:** Suggestion for the Spanish "Web Resources" page

> Hello,
>
> could you pass this to the person who keeps the Spanish guide? I'd like to suggest a free site for its
> "Recommended Websites" list: https://icanspeak.it/espanol/conocimientos
>
> It has Spanish grammar by level as PDFs with exercises and answers, and links to the official free sample
> papers. Learners don't need an account.
>
> I built it. Thank you.
>
> Best regards,
> Edgar Kretschmann

### 14. Tarleton State University library (en)

**Subject:** For the Spanish web resources guide: free grammar PDFs

> Hello,
>
> this address is on the "Report a problem" link of your Spanish web resources page, so please forward this to
> the guide's owner if it isn't you.
>
> I'd like to suggest a free site for the list: https://icanspeak.it/espanol/conocimientos. Learners can
> download Spanish grammar by level as PDFs with exercises and answers, without an account.
>
> Full disclosure: it's my site.
>
> Best regards,
> Edgar Kretschmann

### 15. University of Warwick, School of Modern Languages and Cultures (en, page form)

**Subject:** Links for teachers (KS4): free printable Spanish grammar worksheets

> Hello,
>
> your "Links for teachers" page for Key Stage 4 lists web resources for Spanish and French. I'd like to suggest
> one for Spanish: https://icanspeak.it/espanol/profesores/fichas/
>
> One printable worksheet per grammar topic with a rule box, exercises and an answer key on a separate page.
> Free, no account.
>
> I made the site. Could you pass this to whoever maintains the page?
>
> Best regards,
> Edgar Kretschmann

---

## Follow-up after 14 days (only once, only if there was no answer)

Reply in the same thread, so the first mail is quoted underneath. If there is still no answer, mark the row
"no answer" and move on.

**es:** Asunto: RE: (igual)
> Buenos días: les escribo de nuevo brevemente por mi propuesta de abajo, por si se perdió entre otros correos.
> Si no encaja en su lista, un simple «no» también está bien. Muchas gracias. Edgar Kretschmann

**de:** Betreff: AW: (beibehalten)
> Guten Tag, ich melde mich noch einmal kurz zu meinem Vorschlag unten, falls er untergegangen ist. Wenn er
> nicht in Ihre Liste passt, reicht auch ein kurzes Nein. Vielen Dank! Edgar Kretschmann

**en:** Subject: Re: (keep)
> Hello, just a short follow-up on my suggestion below, in case it got buried. If it doesn't fit your list,
> a one-line "no" is completely fine too. Thank you. Edgar Kretschmann

---

## Send first

Order, once the pages are live (details and reasons in `prompts/traction-es-fr/done/outreach.md`):

1. #1 todoELE Recursos (worksheets)
2. #3 Consejería Bélgica (K)
3. #4 Consejería Francia (K)
4. #6 LMU München (K)
5. #7 Uni Marburg (K)

Then #8 KU, #9 Köln, #10 Liverpool, #11–#14 library guides, #5 Bildungsserver after the English answer, #2 todoELE
after #1, #15 Warwick last.
