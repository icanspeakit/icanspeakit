# icanspeak French: suggestions to curated material lists, drafts v1 (2026-11-17)

Lane `outreach` of the batch `traction-es-fr` (`prompts/traction-es-fr/outreach.md`). Claude researched the
lists and wrote the drafts. **Edgar sends.** When one has gone out, put the date in the tracking table, and
later the answer. Same method as `outreach-english-v1.md` (read its "why" first); this file applies it to
https://icanspeak.it/francais/. The Spanish twin is `outreach-spanish-v1.md`.

Rules for every draft (same as the English file):
- Each mail goes out on its own, to the person named on the page if there is one. No mail merge, no BCC.
- Each one says openly that it comes from the person who made the site, and proposes exactly one page.
- No paid listings, no link swaps, no "write for us" blogs, no Reddit/forum posts.
- No numbers in the drafts on purpose. Counts change; if you want one ("des fiches pour N points de grammaire"),
  read it off the live page on the day you send.
- Before each mail, open the list page once. Check it is still maintained and the contact is still the one in
  the table.
- Send from the icanspeak address, not a private one. Signature on every mail:
  `Edgar Kretschmann · https://icanspeak.it/francais/`.

## ⛔ Before sending anything

Send only **after the release** of this batch, once these pages are live and look right. The paths are the ones
the `french` lane builds (`prompts/traction-es-fr/course.md`); all of them answered HTTP 200 on 2026-11-17, but
the content behind `/francais/savoirs` was still the old one then.

| Page | Built by | Check before sending |
|---|---|---|
| https://icanspeak.it/francais/savoirs | `french` lane | The German leftovers (`grammatik-*.pdf`, German headings) are gone. French grammar PDFs by level, word lists and the official sample-paper links (DELF, DALF, TCF, TEF) are there. The heading says in French what it is (free PDFs to learn French). Every PDF opens. |
| https://icanspeak.it/francais/enseignants/fiches/ and the sheets below it (`grammaire/…`, `vocabulaire/…`) | `french` lane | Titles and text are French, not the inherited German topics. Print preview puts the corrigé on its own page. The "new version" button works. |
| https://icanspeak.it/francais/test-de-niveau | exists (200 on 2026-11-17) | Opens without an account. |
| https://icanspeak.it/francais/delf-dalf | exists (200 on 2026-11-17) | Opens without an account; practice sets work. The official sample-paper links (France Éducation international, CCI Paris) answer 200. |
| Bing and Google know the site | `indexing` lane of the English batch + Edgar | `https://icanspeak.it/sitemap.xml` is submitted in Bing Webmaster Tools. An editor who checks the link should find the site in a search. |

If a page does not ship something a draft mentions (e.g. the word lists), delete that half-sentence before
sending.

Page codes used in the table: **K** `/francais/savoirs`, **F** `/francais/enseignants/fiches/`,
**P** `/francais/test-de-niveau`, **D** `/francais/delf-dalf`.

## Tracking table (French course)

All list URLs returned HTTP 200 on 2026-11-17 (curl or fetch tool). "Last update" is the date shown on the page
that day; "none visible" means the page shows none.

| # | Target | Lang | Contact | Last update | Page | Status | Date sent | Answer |
|---|---|---|---|---|---|---|---|---|
| 1 | Le Point du FLE, Cours de FLE (the directory of free FLE exercises) | fr | lepointdufle@yahoo.fr (from https://www.lepointdufle.net/pcom/contact.htm) | none visible | K | draft | | |
| 2 | Deutscher Bildungsserver, Französisch | de | Caroline.Hartmann@fwu.de (named on the page) · "Link vorschlagen" https://www.bildungsserver.de/eintragen.html | 23.10.2026 | F | draft | | |
| 3 | Villa Albertine, free resources for French teachers in the US | en | julien.buresi@villa-albertine.org ("If you want to share resources, please contact …") | none visible | F | draft | | |
| 4 | McGill Learn French, Ressources | fr | no resource-specific contact; general page https://www.mcgill.ca/contact-us/fr | none visible | K | draft | | |
| 5 | LMU München Sprachenzentrum, Online-Lernangebote Französisch | de | form https://www.lmu.de/sprachenzentrum/de/kontakt/kontaktformular/ | none visible | K | draft | | |
| 6 | Uni Marburg Sprachenzentrum, Self-Study Center, Internetlinks Französisch | de | sz@staff.uni-marburg.de | none visible | K | draft | | |
| 7 | KU Eichstätt-Ingolstadt Sprachenzentrum, Virtuelles Regal Französisch | de | form https://www.ku.de/die-ku/kontakt | none visible | K | draft | | |
| 8 | Universitat de Barcelona, Multilingüitza't, recursos de francès | ca | multilingua@ub.edu (shown on https://www.ub.edu/multilingua/) | none visible | K | draft | | |
| 9 | Cerro Coso Community College library, French: Resources for Online Practice | en | reference@cerrocoso.edu (librarians named on the page: Julie Cornett, Sharlene Paxton) | 2 Sep 2026 | K | draft | | |
| 10 | Green River College library, French language resources | en | librarian@greenriver.edu (the page asks for "questions, feedback, or suggestions" there); the "Report a problem" link goes to kcunnion@greenriver.edu | 26 Oct 2026 (the page also says "last reviewed February 2026") | K | draft | | |
| 11 | University College Dublin library, Languages: French | en | outreach@ucd.ie ("Report a problem") · libraryinfo@ucd.ie | 12 Feb 2026 | K | draft | | |
| 12 | University of Warwick, links for teachers KS4 (French and Spanish) | en | email form on the page ("techsupport.language, Resource"); also SMLCOffice at warwick.ac.uk | 10 Nov 2026 | F | draft | | |
| 13 | Euroguidance France, Apprendre le français (a government-run page of free sites) | fr | form https://www.euroguidance-france.org/nous-contacter/ (made for guidance professionals; no resource-specific address) | none visible | K | draft | | |

List pages (one per row, same numbers):

1. https://www.lepointdufle.net/p/cours_fle.htm
2. https://www.bildungsserver.de/schule/franzoesisch-4920-de.html (loads for a browser; curl timed out from here, read through the fetch tool)
3. https://villa-albertine.org/frenchculture/frenchcultures/free-educational-resources-for-french-teachers-in-the-united-states-teachers-assistants-in-france/
4. https://www.mcgill.ca/learnfrench/fr/ressources
5. https://www.lmu.de/sprachenzentrum/de/selbstlernen/online-lernangebote/franzoesisch/
6. https://www.uni-marburg.de/de/sprachenzentrum/slz/internetlinks/franzoesisch (also https://www.uni-marburg.de/en/language-center/self-study-center/available-learning-resources/french)
7. https://www.ku.de/sprachenzentrum/service-fuer-studierende/sprachen-lernen-online/virtuelles-regal/franzoesisch
8. https://www.ub.edu/multilingua/recursos-de-frances/
9. https://cerrocoso.libguides.com/frenchresearch/practice
10. https://libguides.greenriver.edu/french
11. https://libguides.ucd.ie/languages/french
12. https://warwick.ac.uk/fac/arts/modernlanguages/about/contact/schools/linksforteachers/keystage4/
13. https://www.euroguidance-france.org/venir-en-france/etudier/apprendre-francais/

Notes per target, where it matters:
- **1** The reference directory, online for years. Its pages carry no date. Address from the contact page
  (written there as `lepointdufle%40yahoo.fr`). It lists sites, not files, so the mail proposes one page and
  says what is on it. Highest value of the list.
- **2** The same editor listed deutschacademy's `/wissen` and is also on the English mail (`outreach-english-v1.md`
  #1) and on Spanish #5. Wait for her answer on the English one. The page lists school material (grammar
  explanations, vocabulary tasks, French school TV): propose the worksheets.
- **3** A US cultural-service page that collects digital resources for teachers of French and asks for
  contributions. Only an address, no named person on the page. English is fine.
- **4** The page lists free sites for learners (Radio-Canada's Mauril, TV5MONDE, Portail linguistique du
  Canada). No address for suggestions, only the university's general contact page, so the odds are lower.
- **5, 6, 7** University language centres. The French pages are lists of free outside sites. Same maintainers as
  the English and Spanish pages. Marburg's page already links apprendre.tv5monde.com, Lingolia and delfdalf.ch.
- **8** Catalan university plurilingual centre. Write in Catalan; have a native speaker read it if possible.
- **9, 10, 11** Library guides. The address is the library's general or "report a problem" inbox, so each mail
  asks to pass it on. Cerro Coso's guide is the best fit (no-account practice sites); Green River's guide
  explicitly asks for suggestions.
- **12** Warwick's list is aimed at KS4 school teachers and mixes commercial sites; weak fit, send late.
- **13** The page is a list of free sites for people moving to France. The contact form is meant for guidance
  professionals, so odds are low. Send last.

Not included, checked 2026-11-17: Camosun College library (the French guide names no outside sites on its
front page), Trinity University and University of Washington guides (Mango and library-card services, nothing
free to suggest), Cambridge MML guide (points to another page), UT San Antonio (logins). fle.fr "Practice French
online" (a promotion agency's page; no address, no way to suggest). bonjourdefrance.com (not a list; its own
address is Contact@bonjourdefrance.com if Edgar ever wants to talk to them). Bildungsserver "Elixier" lists are
auto-generated from submissions, not a place to write to.
Not usable on 2026-11-15 (earlier lane): Le Café du FLE (last change 2020), edufle.net (domain for sale), FIPF
(empty page), TV5MONDE enseigner, AATF (no list page).

Not verified: **France Éducation international, boîte à outils des assistants de langue** (the page is an
interactive flipbook that a script cannot read; no contact found; worth a look in a real browser), the
association of French teachers in Germany `fapf.de` (the home page loads but my fetch only saw the page title,
"Vereinigung der Französischlehrerinnen und -lehrer e. V.", no links page found), and Franc-Parler (OIF/FIPF,
`francparler-oif.org`, HTTP 525 on 2026-11-17).

Gaps: nothing usable for Belgium, Switzerland or Francophone Africa; the official portals there host their own
material. Italy: none found.

---

## The drafts

### 1. Le Point du FLE (fr)

**Objet :** Proposition pour le Point du FLE : fiches de grammaire gratuites avec corrigés

> Bonjour,
>
> je me permets de vous proposer une page pour votre annuaire : https://icanspeak.it/francais/savoirs
>
> On y trouve la grammaire française par niveau en PDF à télécharger, avec exercices et corrigés, ainsi que
> des liens vers les sujets d'examen officiels et gratuits (DELF, DALF, TCF). Gratuit, sans inscription.
>
> Le site est le mien ; je vous écris donc en tant qu'auteur. Si cela ne correspond pas à votre sélection, je
> comprends tout à fait.
>
> Cordialement,
> Edgar Kretschmann

*Relies on: `french` lane (PDF by level, official links). Delete "DALF, TCF" if the page does not link them.*

### 2. Deutscher Bildungsserver, Französisch (de)

**Betreff:** Vorschlag für „Französisch“: kostenlose Grammatik-Arbeitsblätter mit Lösungen

> Guten Tag Frau Hartmann,
>
> im Oktober haben Sie meine Seite deutschacademy.com/wissen aufgenommen, vielen Dank dafür. Für Französisch
> gibt es jetzt dasselbe, und ich möchte es für die Seite „Französisch“ vorschlagen:
> https://icanspeak.it/francais/enseignants/fiches/
>
> Zu jedem Grammatikthema gibt es ein Arbeitsblatt zum Ausdrucken: Regelkasten, Übungen und Lösungsblatt auf
> einer eigenen Seite. „Neue Version“ mischt die Aufgaben neu, etwa für Parallelgruppen. Kostenlos und ohne
> Anmeldung. Die Aufgabentexte sind auf Französisch.
>
> Wenn es passt, freue ich mich über die Aufnahme.
>
> Viele Grüße
> Edgar Kretschmann

*Send after the answer to English #1. Relies on: `french` lane.*

### 3. Villa Albertine (en)

**Subject:** Resource for your French teaching collection: free printable grammar worksheets

> Hello,
>
> your page on free educational resources for French teachers in the United States says to write here to share
> resources. I'd like to suggest one: https://icanspeak.it/francais/enseignants/fiches/
>
> It has one printable worksheet per grammar topic, with a rule box, exercises and a corrigé on a separate
> page. A "new version" button reshuffles the items for another class. Free, no account, for teachers or
> learners.
>
> I made the site, so this is a suggestion from its author. If it doesn't fit the collection, thank you for
> looking anyway.
>
> Best regards,
> Edgar Kretschmann

### 4. McGill Learn French (fr, general contact page)

**Objet :** Suggestion pour la page « Ressources » : grammaire en PDF, gratuite

> Bonjour,
>
> pourriez-vous transmettre ce message à la personne qui tient la page « Ressources » de Learn French ?
>
> Je voudrais suggérer un site gratuit : https://icanspeak.it/francais/savoirs. On y trouve la grammaire
> française par niveau en PDF, avec exercices et corrigés, et des liens vers les sujets d'examen officiels et
> gratuits (DELF, TCF). Aucune inscription n'est nécessaire.
>
> Le site est le mien. Merci de votre attention.
>
> Cordialement,
> Edgar Kretschmann

### 5. LMU München Sprachenzentrum (de, Kontaktformular)

**Betreff:** Vorschlag für „Online-Lernangebote Französisch“

> Guten Tag,
>
> Ihre Liste „Online-Lernangebote Französisch“ verweist auf freie Seiten zum Selbstlernen. Ich möchte eine
> weitere vorschlagen: https://icanspeak.it/francais/savoirs
>
> Dort gibt es französische Grammatik als kostenlose PDFs nach Niveau, mit Übungen und Lösungen, und Links zu den
> offiziellen, frei veröffentlichten Prüfungsbeispielen von DELF, DALF und TCF. Ohne Anmeldung.
>
> Die Seite ist von mir; ich freue mich über Ihre Einschätzung, auch wenn sie nicht auf die Liste kommt.
>
> Viele Grüße
> Edgar Kretschmann

### 6. Uni Marburg Sprachenzentrum, Selbstlernzentrum (de)

**Betreff:** Vorschlag für die Internetlinks „Französisch“

> Guten Tag,
>
> Ihre Liste freier Französisch-Lernangebote ist nach Fertigkeiten geordnet. Für Grammatik möchte ich eine Seite
> vorschlagen: https://icanspeak.it/francais/savoirs
>
> Dort gibt es Grammatik als kostenlose PDFs nach Niveau, mit Übungen und Lösungen, dazu Links zu den offiziellen
> Probeprüfungen von DELF und TCF. Ohne Anmeldung.
>
> Die Seite ist von mir. Wenn sie nicht passt, ist das auch in Ordnung.
>
> Viele Grüße
> Edgar Kretschmann

### 7. KU Eichstätt-Ingolstadt Sprachenzentrum (de, Kontaktformular)

**Betreff:** Vorschlag für das „Virtuelle Regal Französisch“

> Guten Tag,
>
> im „Virtuellen Regal Französisch“ verlinken Sie Lernseiten, Wörterbücher und Konjugationstools. Ich möchte eine
> weitere vorschlagen: https://icanspeak.it/francais/savoirs
>
> Es sind französische Grammatik-PDFs nach Niveau mit Übungen und Lösungen, kostenlos und ohne Anmeldung, dazu
> Links zu den offiziellen Probeprüfungen von DELF und TCF.
>
> Die Seite ist von mir. Könnten Sie das an die Person weitergeben, die das Regal pflegt?
>
> Viele Grüße
> Edgar Kretschmann

### 8. Universitat de Barcelona, Multilingüitza't (ca)

**Assumpte:** Proposta per a "Recursos de francès": gramàtica en PDF gratuïta

> Bon dia,
>
> a la pàgina "Recursos de francès" recolliu webs gratuïts per aprendre la llengua. Us en voldria proposar un:
> https://icanspeak.it/francais/savoirs
>
> Hi ha la gramàtica francesa per nivells en PDF, amb exercicis i solucions, i enllaços als models d'examen
> oficials i gratuïts del DELF i el TCF. No cal registrar-se.
>
> El web és meu; si no encaixa, cap problema.
>
> Salutacions cordials,
> Edgar Kretschmann

*Catalan: have a native speaker read it, or send the Spanish version of Spanish #3 adapted.*

### 9. Cerro Coso Community College library (en)

**Subject:** Suggestion for "Resources for Online Practice" (French)

> Hello,
>
> your French guide lists practice sites that need no account. I'd like to suggest another:
> https://icanspeak.it/francais/savoirs
>
> French grammar by level as PDFs with exercises and answers, plus links to the official free DELF and TCF
> sample papers. Learners don't need to sign up.
>
> I built the site. Could you pass this on to the librarian who keeps the guide if that isn't you?
>
> Best regards,
> Edgar Kretschmann

### 10. Green River College library (en)

**Subject:** Suggestion for the French language resources guide

> Hello,
>
> your French guide invites suggestions, so here is one: https://icanspeak.it/francais/savoirs
>
> It offers French grammar by level as printable PDFs with exercises and answers, and links to the official free
> DELF and TCF sample papers. No account, nothing to pay.
>
> I made the site, so this is a suggestion from its author. Thank you for considering it.
>
> Best regards,
> Edgar Kretschmann

### 11. University College Dublin library (en)

**Subject:** For the French subject guide: free grammar PDFs, no account

> Hello,
>
> please could you pass this to the librarian who keeps the French guide? I'd like to suggest a free site for
> it: https://icanspeak.it/francais/savoirs
>
> French grammar by level as PDFs with exercises and answers, and links to the official free DELF and TCF
> sample papers. No account needed.
>
> I built the site. Thank you.
>
> Best regards,
> Edgar Kretschmann

### 12. University of Warwick, School of Modern Languages and Cultures (en, page form)

**Subject:** Links for teachers (KS4): free printable French grammar worksheets

> Hello,
>
> your "Links for teachers" page for Key Stage 4 lists web resources for French and Spanish. I'd like to suggest
> one for French: https://icanspeak.it/francais/enseignants/fiches/
>
> One printable worksheet per grammar topic with a rule box, exercises and a corrigé on a separate page. Free,
> no account.
>
> I made the site. Could you pass this to whoever maintains the page?
>
> Best regards,
> Edgar Kretschmann

### 13. Euroguidance France (fr, formulaire)

**Objet :** Suggestion pour la page « Apprendre le français » : un site gratuit

> Bonjour,
>
> ma demande ne relève peut-être pas de votre formulaire, mais votre page « Apprendre le français » liste des
> sites gratuits, et j'aimerais en suggérer un : https://icanspeak.it/francais/savoirs
>
> La grammaire française par niveau en PDF, avec exercices et corrigés, et des liens vers les sujets d'examen
> officiels et gratuits (DELF, TCF). Sans inscription.
>
> Le site est le mien. Pourriez-vous le transmettre à la personne qui tient la page ?
>
> Cordialement,
> Edgar Kretschmann

---

## Follow-up after 14 days (only once, only if there was no answer)

Reply in the same thread, so the first mail is quoted underneath. If there is still no answer, mark the row
"no answer" and move on.

**fr:** Objet : RE: (inchangé)
> Bonjour, je me permets de revenir brièvement vers vous au sujet de ma proposition ci-dessous, au cas où
> elle serait passée inaperçue. Si elle ne convient pas, un simple « non » me va très bien. Merci !
> Edgar Kretschmann

**de:** Betreff: AW: (beibehalten)
> Guten Tag, ich melde mich noch einmal kurz zu meinem Vorschlag unten, falls er untergegangen ist. Wenn er
> nicht in Ihre Liste passt, reicht auch ein kurzes Nein. Vielen Dank! Edgar Kretschmann

**en:** Subject: Re: (keep)
> Hello, just a short follow-up on my suggestion below, in case it got buried. If it doesn't fit your list,
> a one-line "no" is completely fine too. Thank you. Edgar Kretschmann

**ca:**
> Bon dia: us torno a escriure breument per la proposta de sota, per si s'havia perdut. Si no encaixa a la
> vostra llista, un "no" també està bé. Moltes gràcies. Edgar Kretschmann

---

## Send first

Order, once the pages are live (details and reasons in `prompts/traction-es-fr/done/outreach.md`):

1. #1 Le Point du FLE (K)
2. #5 LMU München (K)
3. #6 Uni Marburg (K)
4. #3 Villa Albertine (F)
5. #9 Cerro Coso library (K)

Then #7 KU, #8 UB, #10 Green River, #11 UCD, #2 Bildungsserver after the English answer, #4 McGill, #12 Warwick,
#13 Euroguidance last.
