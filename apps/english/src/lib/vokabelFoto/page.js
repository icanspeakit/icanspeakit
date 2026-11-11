// /teachers/cards/photo and /teachers/cards: Vokabeln vom Foto in the browser.
//
// Foto page: one draft { id?, name, level, words[] }. Photos → /api/wortschatz/foto → rows
// appended to the draft → the teacher fixes what's wrong → saved to vokabel_sets. No per-word
// confirmation: a row is saved as it stands. A row from our lexicon (lexId) carries our data;
// changing its word or article drops the link.
//
// List page: the teacher's sets with rename, duplicate, delete and „Foto hinzufügen“.
import { isDocument, readDocument } from "./dateien.js";
import { lexiconCard, lexiconTranslations } from "./play.js";
import { LANGUAGE_REGISTRY } from "../languages.js";
import { currentUser, deleteSet, getSet, isTeacher, listSets, shareToken, shareUrl, unshare, MAX_WORDS, machineText, readPhotos, saveSet, setTeacher, shrinkPhoto, stripArticle, synonymWords, translateWords, wordKey } from "./sets.js";
import { withBase, BASE_PATH } from "../paths.js";
import { currentPath } from "../paths.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const MAX_PHOTOS = 4;
const POS_LABEL = { noun: "Nomen", verb: "Verb", adj: "Adjektiv", adv: "Adverb", prep: "Präposition", conj: "Konjunktion", pron: "Pronomen", num: "Zahl", phrase: "Wendung" };

/** Shows the gate for who is here; resolves once a teacher is signed in, or never. */
async function teacherGate(root) {
  const $ = (s) => root.querySelector(s);
  const gates = [...root.querySelectorAll("[data-gate]")];
  const gate = (name) => gates.forEach((g) => (g.hidden = g.dataset.gate !== name));
  $("[data-signin-link]").href = `${BASE_PATH}/anmelden?next=${encodeURIComponent(currentPath() + location.search)}`;
  const user = await currentUser();
  if (!user) return gate("signin"), new Promise(() => {});
  if (!isTeacher(user)) {
    gate("teacher");
    await new Promise((resolve) => {
      $("[data-teacher-on]").addEventListener("click", async (e) => {
        e.currentTarget.disabled = true;
        try {
          await setTeacher(true);
          resolve();
        } catch {
          e.currentTarget.disabled = false;
          $("[data-teacher-error]").textContent = "Das hat gerade nicht geklappt. Bitte prüfen Sie die Internetverbindung.";
        }
      });
    });
  }
  gate("ok");
}

/* ======================================================= foto page ====== */

export async function mountFotoPage(root) {
  const $ = (s) => root.querySelector(s);
  await teacherGate(root);

  const draft = { id: null, name: "", level: "", words: [] };
  let photos = []; // { file, url? } — url only for images (thumbnail); PDF/Word/text show their name
  let dirty = false;
  const touch = () => { dirty = true; $("[data-status]").textContent = ""; };
  addEventListener("beforeunload", (e) => { if (dirty) e.preventDefault(); });

  // ?set=<id>: edit a saved set; a new photo adds to it.
  const setId = new URLSearchParams(location.search).get("set");
  if (setId) {
    try {
      const row = await getSet(setId);
      if (row) {
        Object.assign(draft, { id: row.id, name: row.name, level: row.level ?? "", words: row.words ?? [] });
        $("[data-page-title]").textContent = row.name;
        $("[data-photo-title]").textContent = "1 · Weiteres Foto (optional)";
        document.title = `${row.name} – icanspeak English`;
      }
    } catch (err) {
      console.error(err);
      $("[data-read-error]").textContent = "Das Set konnte nicht geladen werden.";
    }
  }
  $("[data-name]").value = draft.name;
  $("[data-level]").value = draft.level;

  /* ---------------------------------------------------------- photos ---- */
  const fileIn = $("[data-file]");
  fileIn.addEventListener("change", () => {
    addFiles([...fileIn.files]);
    fileIn.value = "";
  });
  // A copied photo or screenshot: Strg+V / Cmd+V anywhere on the page (not while typing in a field).
  document.addEventListener("paste", (e) => {
    const files = [...(e.clipboardData?.files ?? [])];
    if (!files.length) return;
    e.preventDefault();
    // A pasted screenshot is called "image.png" every time; give it a name the list can tell apart.
    addFiles(files.map((f, i) => (f.name && f.name !== "image.png" ? f : new File([f], `eingefuegt-${Date.now()}-${i}.${(f.type.split("/")[1] || "png").replace("jpeg", "jpg")}`, { type: f.type }))));
    $("[data-drop]").scrollIntoView({ block: "center", behavior: "smooth" });
  });
  // The paste button: the clipboard API, where the browser has it (asks for permission once).
  const pasteBtn = $("[data-paste]");
  if (pasteBtn && navigator.clipboard?.read) {
    pasteBtn.hidden = false;
    pasteBtn.addEventListener("click", async () => {
      $("[data-read-error]").textContent = "";
      try {
        const files = [];
        for (const item of await navigator.clipboard.read()) {
          const type = item.types.find((t) => t.startsWith("image/") || t === "application/pdf");
          if (type) files.push(new File([await item.getType(type)], `eingefuegt-${Date.now()}-${files.length}.${type === "application/pdf" ? "pdf" : type.split("/")[1].replace("jpeg", "jpg")}`, { type }));
        }
        if (files.length) addFiles(files);
        else $("[data-read-error]").textContent = "In der Zwischenablage ist kein Bild. Kopieren Sie zuerst ein Foto oder einen Screenshot.";
      } catch {
        $("[data-read-error]").textContent = "Der Browser hat das Einfügen nicht erlaubt. Versuchen Sie Strg+V (Mac: Cmd+V).";
      }
    });
  }
  function addFiles(picked) {
    $("[data-read-error]").textContent = "";
    for (const file of picked) {
      const image = file.type.startsWith("image/") || /\.heic$/i.test(file.name);
      if (!image && !isDocument(file)) {
        $("[data-read-error]").textContent = `„${file.name}“: Dieses Format geht nicht. Bitte Foto, PDF, Word (.docx) oder Text.`;
        continue;
      }
      if (image && photos.filter((p) => p.url).length >= MAX_PHOTOS) {
        $("[data-read-error]").textContent = `Höchstens ${MAX_PHOTOS} Fotos auf einmal.`;
        continue;
      }
      photos.push({ file, url: image ? URL.createObjectURL(file) : null });
    }
    renderPhotos();
  }
  $("[data-thumbs]").addEventListener("click", (e) => {
    const i = e.target.closest("[data-unphoto]")?.dataset.unphoto;
    if (i == null) return;
    if (photos[i].url) URL.revokeObjectURL(photos[i].url);
    photos.splice(Number(i), 1);
    renderPhotos();
  });
  $("[data-clear]").addEventListener("click", () => {
    photos.forEach((p) => p.url && URL.revokeObjectURL(p.url));
    photos = [];
    renderPhotos();
  });
  function renderPhotos() {
    $("[data-thumbs]").hidden = !photos.length;
    $("[data-read-row]").hidden = !photos.length;
    $("[data-drop]").classList.toggle("is-compact", photos.length > 0);
    $("[data-thumbs]").innerHTML = photos
      .map((p, i) => `<li>${p.url
        ? `<img src="${p.url}" alt="Foto ${i + 1}" />`
        : `<span class="vf-doc"><b>${esc(p.file.name.split(".").pop().toUpperCase())}</b><small>${esc(p.file.name)}</small></span>`}<button type="button" data-unphoto="${i}" aria-label="${esc(p.url ? `Foto ${i + 1}` : p.file.name)} entfernen">×</button></li>`)
      .join("");
  }

  $("[data-read]").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (!photos.length) return;
    btn.disabled = true;
    $("[data-read-error]").textContent = "";
    $("[data-progress]").hidden = false;
    $("[data-progress-text]").textContent = photos.length > 1 ? `${photos.length} Dateien werden gelesen …` : "Wird gelesen …";
    try {
      const files = await Promise.all(photos.filter((p) => p.url).map((p) => shrinkPhoto(p.file)));
      const lines = [];
      const notes = [];
      for (const p of photos.filter((x) => !x.url)) {
        const doc = await readDocument(p.file);
        files.push(...doc.images);
        lines.push(...doc.lines);
        if (doc.cut) notes.push(`Von „${p.file.name}“ wurden nur die ersten 20 Seiten gelesen.`);
      }
      // Scanned PDF pages go to Azure like photos, so they share the photo limit.
      if (files.length > MAX_PHOTOS) {
        throw new Error(`Das sind ${files.length} Fotos bzw. gescannte Seiten. Höchstens ${MAX_PHOTOS} auf einmal, bitte in Teilen hochladen.`);
      }
      if (!files.length && !lines.length) throw new Error("In der Datei steht kein Text.");
      const { words, stats } = await readPhotos(files, lines);
      const before = draft.words.length;
      const known = new Set(draft.words.map(wordKey));
      const fresh = words.filter((w) => !known.has(wordKey(w)));
      draft.words.push(...fresh);
      photos.forEach((p) => p.url && URL.revokeObjectURL(p.url));
      photos = [];
      renderPhotos();
      touch();
      render();
      const skipped = words.length - fresh.length;
      $("[data-progress]").hidden = false;
      $("[data-progress-text]").textContent = !words.length
        ? "Es wurden keine Wörter gefunden. Bei einem Foto: schärfer und gerade von oben versuchen."
        : `${fresh.length === 1 ? "1 Wort" : `${fresh.length} Wörter`} gelesen, ${stats.matched} davon aus unserem Wortschatz${skipped ? `, ${skipped} schon in der Liste` : ""}.${notes.length ? ` ${notes.join(" ")}` : ""}`;
      $("[data-progress]").classList.add("is-done");
      if (fresh.length) $("[data-list]").children[before]?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (fresh.length) fillTranslations();
    } catch (err) {
      $("[data-progress]").hidden = true;
      $("[data-read-error]").textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------------------------------------------------------- review ---- */
  const list = $("[data-list]");

  /* ---------------------------------------------------- translations ---- */
  // Languages neither our data nor Azure Translator has (Tajik): not offered at all.
  const NO_MACHINE = new Set(["tg"]);
  // The class's languages: every ticked language gets its own translation field per word
  // (translations[code]), filled from our data or Azure Translator. A multi-language class
  // ticks all of theirs. Pre-ticked: what the set already has, else what this browser used last.
  // „Auf Deutsch“ first: a synonym in simple German, as on the cards' German side. Ours for
  // lexicon words, Azure's dictionary for the rest (fillSynonyms).
  const LANGS = [{ code: "de", de: "Auf Deutsch", native: "Auf Deutsch (Synonym)" }, ...LANGUAGE_REGISTRY.filter((l) => l.code !== "de" && !NO_MACHINE.has(l.code))];
  const langOf = (code) => LANGS.find((l) => l.code === code);
  const TR_KEY = "vf.trLangs";
  let trLangs = [...new Set(draft.words.flatMap((w) => Object.keys(w.translations ?? {})))].filter(langOf);
  if (!trLangs.length) { try { trLangs = (JSON.parse(localStorage.getItem(TR_KEY) ?? "[]") || []).filter(langOf); } catch {} }
  // The German synonym is always there: it is the cards' German side, whatever the class speaks.
  trLangs = ["de", ...trLangs.filter((c) => c !== "de")];
  const trBox = $("[data-tr-langs]");
  function renderLangChips() {
    trBox.innerHTML = LANGS.map((l) => `<button type="button" class="vf-lang${trLangs.includes(l.code) ? " is-on" : ""}" data-tr-code="${l.code}" aria-pressed="${trLangs.includes(l.code)}" title="${esc(l.code === "de" ? "Immer dabei: die deutsche Seite der Karten" : l.de)}">${esc(l.native)}</button>`).join("");
  }
  renderLangChips();
  trBox.addEventListener("click", (e) => {
    const code = e.target.closest("[data-tr-code]")?.dataset.trCode;
    if (!code) return;
    if (code === "de") return say("„Auf Deutsch“ ist immer dabei: Das ist die deutsche Seite der Karten.");
    const on = !trLangs.includes(code);
    trLangs = on ? [...trLangs, code] : trLangs.filter((c) => c !== code);
    try { localStorage.setItem(TR_KEY, JSON.stringify(trLangs)); } catch {}
    say("");
    renderLangChips();
    render();
    // A language just ticked is filled right away.
    if (on) fillTranslations();
  });
  const say = (m) => ($("[data-tr-status]").textContent = m);
  $("[data-tr-fill]").addEventListener("click", () => fillTranslations({ loud: true }));
  // Runs after a language is ticked, after words are read and on the button. A call while one
  // runs is queued, so a second language ticked mid-way is not lost.
  let filling = null, refill = false;
  async function fillTranslations({ loud = false } = {}) {
    if (filling) { refill = true; return filling; }
    filling = fillOnce(loud);
    try { await filling; } finally { filling = null; }
    if (refill) { refill = false; await fillTranslations(); }
  }
  async function fillOnce(loud) {
    const btn = $("[data-tr-fill]");
    const todo = trLangs.filter((lang) => draft.words.some((w) => w.lemma?.trim() && !w.translations?.[lang]));
    if (!todo.length) return loud && say("Alle Wörter haben schon ihre Übersetzungen.");
    btn.disabled = true;
    let fromUs = 0, fromAzure = 0;
    let azureError = "";
    try {
      // Ours first: every lexicon word has its translation in our data (card or gloss file).
      for (const lang of todo) {
        say(`${langOf(lang).de} aus unserem Wortschatz …`);
        const open = draft.words.filter((w) => w.lemma?.trim() && !w.translations?.[lang] && w.lexId);
        const ours = await lexiconTranslations(open.map((w) => w.lexId), lang);
        for (const w of open) if (ours[w.lexId]) { (w.translations ??= {})[lang] = ours[w.lexId]; fromUs++; }
      }
      // The rest through Azure Translator in one call for all languages, with article / „sich“
      // so „der Leiter“ ≠ „die Leiter“. German to German goes to Azure's dictionary below.
      const langs = todo.filter((l) => l !== "de");
      const rest = draft.words.filter((w) => w.lemma?.trim() && langs.some((l) => !w.translations?.[l]));
      if (rest.length && langs.length) {
        say("Automatische Übersetzung …");
        try {
          const out = await translateWords(rest.map(machineText), langs);
          for (const l of langs) rest.forEach((w, i) => {
            const text = stripArticle(out[l]?.[i] ?? "", l);
            if (!w.translations?.[l] && text) { (w.translations ??= {})[l] = text; fromAzure++; }
          });
        } catch (err) {
          azureError = err.message;
        }
      }
      if (todo.includes("de")) {
        say("Synonyme auf Deutsch …");
        try {
          fromAzure += await fillSynonyms(draft.words.filter((w) => w.lemma?.trim() && !w.translations?.de));
        } catch (err) {
          azureError ||= err.message;
        }
      }
      if (fromUs + fromAzure) touch();
      render();
      const missing = draft.words.filter((w) => w.lemma?.trim()).reduce((n, w) => n + todo.filter((l) => !w.translations?.[l]).length, 0);
      const deMissing = todo.includes("de") && draft.words.some((w) => w.lemma?.trim() && !w.translations?.de);
      say(`${fromUs + fromAzure} Übersetzungen ergänzt: ${fromUs} aus unserem Wortschatz${fromAzure ? `, ${fromAzure} automatisch (bitte kurz drüberschauen)` : ""}.`
        + (missing ? ` ${missing} fehlen noch.${azureError ? ` ${azureError}` : ""}${deMissing ? " Für Wendungen und seltene Wörter findet das Wörterbuch kein Synonym." : ""} Sie können alles auch selbst eintragen.` : ""));
    } catch (err) {
      render();
      say(err.message);
    } finally {
      btn.disabled = false;
    }
  }

  // German synonyms from Azure's dictionary: of its candidates the ones our lexicon knows as the
  // same part of speech come first (learners' German, with article), at most two per word.
  async function fillSynonyms(words) {
    if (!words.length) return 0;
    const lists = await synonymWords(words.map((w) => ({ lemma: [w.reflexive ? "sich" : null, w.lemma].filter(Boolean).join(" "), ...(w.pos ? { pos: w.pos } : {}) })));
    let n = 0;
    await Promise.all(words.map(async (w, i) => {
      const cands = lists?.[i] ?? [];
      const cards = await Promise.all(cands.map((c) => lexiconCard(c).catch(() => null)));
      const known = cands.flatMap((c, k) => (cards[k] && (!w.pos || !cards[k].pos || cards[k].pos === w.pos) ? [cards[k].gender ? `${cards[k].gender} ${cards[k].front}` : cards[k].front] : []));
      const pick = [...new Set([...known, ...cands.filter((c, k) => !cards[k])])].slice(0, 2);
      if (pick.length && !w.translations?.de) { (w.translations ??= {}).de = pick.join(", "); n++; }
    }));
    return n;
  }

  function rowHtml(w, i, dup) {
    const lex = Boolean(w.lexId);
    const badge = lex
      ? `<span class="vf-badge vf-badge--lex">aus unserem Wortschatz</span>`
      : `<span class="vf-badge vf-badge--ok">eigenes Wort</span>`;
    const chips = ["der", "die", "das"]
      .map((a) => `<button type="button" class="vf-art vf-art--${a}${w.article === a ? " is-on" : ""}" data-art="${a}" aria-pressed="${w.article === a}">${a}</button>`)
      .join("");
    return `
      <li class="vf-row${dup ? " is-dup" : ""}" data-i="${i}">
        <div class="vf-row-top">
          ${badge}${w.pos && POS_LABEL[w.pos] ? `<small class="vf-pos">${POS_LABEL[w.pos]}</small>` : ""}${dup ? `<small class="vf-dup">doppelt</small>` : ""}
          <span class="vf-row-tools">
            <button type="button" class="vf-del" data-del aria-label="${esc(w.lemma)} löschen">×</button>
          </span>
        </div>
        <div class="vf-row-fields">
          ${!w.pos || w.pos === "noun" ? `<div class="vf-arts" role="group" aria-label="Artikel">${chips}</div>` : ""}
          <label class="vf-f vf-f--lemma"><span>Wort</span><input type="text" maxlength="80" value="${esc(w.reflexive && !/^sich /.test(w.lemma) ? `sich ${w.lemma}` : w.lemma)}" data-f="lemma" /></label>
          <label class="vf-f"><span>Plural</span><input type="text" maxlength="80" value="${esc(w.plural)}" data-f="plural" placeholder="–" /></label>
          <label class="vf-f"><span>Übersetzung im Buch</span><input type="text" maxlength="120" value="${esc(w.translation)}" data-f="translation" placeholder="nur falls dort eine steht" title="Die Übersetzung, die auf der Buchseite neben dem Wort steht. Im Spiel zählt sie als Englisch." /></label>
        </div>
        ${trLangs.length ? `<div class="vf-row-tr">${trLangs.map((code) => {
          const l = langOf(code);
          return `<label class="vf-f"><span>${esc(l.de)}</span><input type="text" maxlength="120" value="${esc(w.translations?.[code] ?? "")}" data-f="tr" data-lang="${code}" lang="${code}"${l.dir === "rtl" ? ' dir="rtl"' : ""} placeholder="–" /></label>`;
        }).join("")}</div>` : ""}
      </li>`;
  }

  function dupKeys() {
    const seen = new Map();
    for (const w of draft.words) seen.set(wordKey(w), (seen.get(wordKey(w)) ?? 0) + 1);
    return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k));
  }

  function render() {
    const has = draft.words.length > 0;
    $("[data-review]").hidden = !has && !draft.id;
    $("[data-save-card]").hidden = !has && !draft.id;
    const dups = dupKeys();
    list.innerHTML = draft.words.map((w, i) => rowHtml(w, i, dups.has(wordKey(w)))).join("");
    $("[data-merge]").hidden = !dups.size;
    const n = draft.words.length;
    $("[data-count]").textContent = n > MAX_WORDS ? `${n} Wörter · werden als ${Math.ceil(n / MAX_WORDS)} Sets gespeichert` : `${n} / ${MAX_WORDS}`;
  }

  // Strip a typed "sich " into the reflexive flag, so the stored lemma matches the lexicon's form.
  function setLemma(w, value) {
    const v = value.trim();
    w.reflexive = /^sich\s/i.test(v) || undefined;
    w.lemma = v.replace(/^sich\s+/i, "");
  }

  // A lexicon row whose word or article changes is no longer that lexicon word.
  function unlink(w) {
    delete w.lexId;
  }

  list.addEventListener("input", (e) => {
    const f = e.target.dataset.f;
    const li = e.target.closest("[data-i]");
    if (!f || !li) return;
    const w = draft.words[li.dataset.i];
    if (f === "lemma") setLemma(w, e.target.value);
    else if (f === "tr") (w.translations ??= {})[e.target.dataset.lang] = e.target.value;
    else w[f] = e.target.value;
    touch();
  });
  // Re-render after a field is left (not on every key), so typing keeps focus.
  list.addEventListener("change", async (e) => {
    const li = e.target.closest("[data-i]");
    if (!li || e.target.dataset.f !== "lemma") return;
    const w = draft.words[li.dataset.i];
    if (w.lexId) unlink(w);
    render();
    await relink(w);
  });

  // A corrected or added word our lexicon knows gets its data again.
  async function relink(w) {
    let card = null;
    try {
      card = await lexiconCard(w.lemma, w.article);
    } catch {}
    if (!card || !draft.words.includes(w)) return;
    Object.assign(w, { lemma: card.front, lexId: card.id, checked: true, pos: card.pos });
    if (card.gender) w.article = card.gender;
    if (card.plural) w.plural = card.plural;
    if (card.separable) w.separable = true;
    render();
  }
  list.addEventListener("click", (e) => {
    const li = e.target.closest("[data-i]");
    if (!li) return;
    const i = Number(li.dataset.i);
    const w = draft.words[i];
    if (e.target.closest("[data-del]")) {
      draft.words.splice(i, 1);
    } else if (e.target.closest("[data-art]")) {
      const a = e.target.closest("[data-art]").dataset.art;
      const next = w.article === a ? undefined : a;
      if (next !== w.article) unlink(w);
      w.article = next;
      if (next) w.pos = "noun";
      if (!w.lexId && w.lemma) relink(w);
    } else return;
    touch();
    render();
  });

  $("[data-add]").addEventListener("click", () => {
    draft.words.push({ lemma: "", checked: false });
    touch();
    render();
    list.lastElementChild?.querySelector('[data-f="lemma"]')?.focus();
  });
  $("[data-merge]").addEventListener("click", () => {
    const byKey = new Map();
    for (const w of draft.words) {
      const k = wordKey(w);
      const kept = byKey.get(k);
      if (!kept) { byKey.set(k, w); continue; }
      // The first row stays; empty fields are filled from the later ones.
      for (const f of ["plural", "translation", "pos", "lexId"]) if (!kept[f] && w[f]) kept[f] = w[f];
      if (!kept.translations && w.translations) kept.translations = w.translations;
    }
    draft.words = [...byKey.values()];
    touch();
    render();
  });

  /* ------------------------------------------------------------ save ---- */
  $("[data-name]").addEventListener("input", touch);
  $("[data-level]").addEventListener("change", touch);
  // Saving is never refused: a list longer than one set holds (MAX_WORDS) is saved as several
  // sets, „Name“, „Name (Teil 2)“ …, rather than asking the teacher to delete words first.
  $("[data-save]").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    $("[data-status]").textContent = "Wird gespeichert …";
    try {
      const words = draft.words.filter((w) => w.lemma.trim());
      const name = $("[data-name]").value.trim() || "Meine Wörter";
      const level = $("[data-level]").value;
      const row = await saveSet({ id: draft.id, name, level, words: words.slice(0, MAX_WORDS) });
      for (let k = MAX_WORDS, part = 2; k < words.length; k += MAX_WORDS, part++) {
        await saveSet({ name: `${name.slice(0, 68)} (Teil ${part})`, level, words: words.slice(k, k + MAX_WORDS) });
      }
      dirty = false;
      location.href = withBase(`/teachers/cards?gespeichert=${row.id}`);
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      $("[data-status]").textContent = /relation|does not exist|schema cache/i.test(err?.message ?? "")
        ? "Die Tabelle für Kartensets fehlt noch (Migration vokabel_sets)."
        : "Speichern hat nicht geklappt. Bitte prüfen Sie die Internetverbindung.";
    }
  });

  render();
}

/* ======================================================= list page ====== */

export async function mountSetList(root) {
  const $ = (s) => root.querySelector(s);
  await teacherGate(root);
  const list = $("[data-sets]");
  const status = (msg) => { $("[data-status]").textContent = msg; };
  let sets = [];
  const savedId = new URLSearchParams(location.search).get("gespeichert");

  async function load() {
    try {
      sets = await listSets();
    } catch (err) {
      console.error(err);
      status(/relation|does not exist|schema cache/i.test(err?.message ?? "")
        ? "Die Tabelle für Kartensets fehlt noch (Migration vokabel_sets)."
        : "Ihre Kartensets konnten nicht geladen werden.");
      sets = [];
    }
    render();
  }

  function render() {
    $("[data-empty]").hidden = sets.length > 0;
    list.innerHTML = sets
      .map((s) => {
        const n = s.words?.length ?? 0;
        const lex = (s.words ?? []).filter((w) => w.lexId).length;
        const date = new Date(s.updated_at).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
        return `
        <li class="vf-set${s.id === savedId ? " is-new" : ""}" data-id="${s.id}">
          <a class="vf-set-main" href="${BASE_PATH}/teachers/cards/learn?set=${s.id}">
            <b data-set-name>${esc(s.name)}</b>
            <small>${n} Wörter · ${lex} aus unserem Wortschatz${s.level ? ` · ${s.level}` : ""} · ${date}</small>
            <span class="vf-set-words">${(s.words ?? []).slice(0, 8).map((w) => esc([w.article, w.reflexive ? "sich" : null, w.lemma].filter(Boolean).join(" "))).join(" · ")}${n > 8 ? " …" : ""}</span>
          </a>
          <div class="vf-set-tools">
            <a class="lq-btn lq-btn--primary vf-play" href="${BASE_PATH}/teachers/cards/learn?set=${s.id}">Karteikarten</a>
            <a class="lq-btn lq-btn--ghost vf-play" href="${BASE_PATH}/teachers/quiz?set=kartenset:${s.id}">Live-Quiz</a>
            <button type="button" class="lq-btn lq-btn--ghost vf-play" data-share aria-expanded="false">${s.share_token ? "Geteilt ✓" : "Mit der Klasse teilen"}</button>
            <a class="qb-link" href="${BASE_PATH}/teachers/cards/print?set=${s.id}">Drucken</a>
            <a class="qb-link" href="${BASE_PATH}/teachers/quiz/create?set=${s.id}">Quizfragen bearbeiten</a>
            <a class="qb-link" href="${BASE_PATH}/teachers/cards/photo?set=${s.id}">Bearbeiten · Foto hinzufügen</a>
            <button type="button" class="qb-link" data-rename>Umbenennen</button>
            <button type="button" class="qb-link" data-dup>Duplizieren</button>
            <button type="button" class="qb-link vf-danger" data-del>Löschen</button>
          </div>
          <div class="vf-share" data-share-box hidden></div>
          <form class="vf-rename" data-rename-form hidden>
            <input type="text" maxlength="80" value="${esc(s.name)}" aria-label="Neuer Name" />
            <button type="submit" class="lq-btn lq-btn--ghost">OK</button>
            <button type="button" class="lq-btn lq-btn--quiet" data-rename-cancel>Abbrechen</button>
          </form>
          <div class="vf-confirm" data-confirm hidden>
            <span>„${esc(s.name)}“ wirklich löschen?</span>
            <button type="button" class="lq-btn lq-btn--quiet" data-del-no>Behalten</button>
            <button type="button" class="lq-btn vf-btn-danger" data-del-yes>Löschen</button>
          </div>
        </li>`;
      })
      .join("");
  }

  list.addEventListener("click", async (e) => {
    const li = e.target.closest("[data-id]");
    if (!li) return;
    const set = sets.find((s) => s.id === li.dataset.id);
    const btn = e.target.closest("button");
    if (!btn || !set) return;
    try {
      if (btn.matches("[data-rename]")) {
        li.querySelector("[data-rename-form]").hidden = false;
        li.querySelector("[data-rename-form] input").select();
      } else if (btn.matches("[data-rename-cancel]")) {
        li.querySelector("[data-rename-form]").hidden = true;
      } else if (btn.matches("[data-share]")) {
        const box = li.querySelector("[data-share-box]");
        if (!box.hidden) { box.hidden = true; btn.setAttribute("aria-expanded", "false"); return; }
        btn.disabled = true;
        const token = await shareToken(set);
        btn.disabled = false;
        btn.textContent = "Geteilt ✓";
        btn.setAttribute("aria-expanded", "true");
        await renderShare(box, set, token);
      } else if (btn.matches("[data-copy]")) {
        await navigator.clipboard.writeText(btn.dataset.copy).catch(() => {});
        btn.textContent = "Kopiert ✓";
        setTimeout(() => (btn.textContent = "Link kopieren"), 2000);
      } else if (btn.matches("[data-unshare]")) {
        btn.disabled = true;
        await unshare(set);
        status(`„${set.name}“ ist nicht mehr geteilt. Der alte Link geht nicht mehr.`);
        render();
      } else if (btn.matches("[data-dup]")) {
        btn.disabled = true;
        await saveSet({ name: `${set.name} (Kopie)`.slice(0, 80), level: set.level, words: set.words });
        status("Kopie angelegt.");
        await load();
      } else if (btn.matches("[data-del]")) {
        li.querySelector("[data-confirm]").hidden = false;
      } else if (btn.matches("[data-del-no]")) {
        li.querySelector("[data-confirm]").hidden = true;
      } else if (btn.matches("[data-del-yes]")) {
        btn.disabled = true;
        await deleteSet(set.id);
        status(`„${set.name}“ gelöscht.`);
        await load();
      }
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      status("Das hat gerade nicht geklappt. Bitte prüfen Sie die Internetverbindung.");
    }
  });
  async function renderShare(box, set, token) {
    const url = shareUrl(token);
    const { default: QRCode } = await import("qrcode");
    const qr = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
    box.innerHTML = `
      <div class="vf-qr">${qr}</div>
      <div class="vf-share-text">
        <p>Ihre Lernenden öffnen die Karten mit diesem Link oder QR-Code, ohne Konto. Sie können nur lernen, nichts ändern.</p>
        <input type="text" readonly value="${esc(url)}" aria-label="Link zum Kartenset" />
        <div class="vf-share-tools">
          <button type="button" class="lq-btn lq-btn--ghost" data-copy="${esc(url)}">Link kopieren</button>
          <a class="qb-link" href="/teachers/classes">Als Aufgabe in einer Klasse stellen</a>
          <button type="button" class="qb-link vf-danger" data-unshare>Nicht mehr teilen</button>
        </div>
      </div>`;
    box.hidden = false;
  }

  list.addEventListener("submit", async (e) => {
    e.preventDefault();
    const li = e.target.closest("[data-id]");
    const set = sets.find((s) => s.id === li?.dataset.id);
    const name = e.target.querySelector("input").value.trim();
    if (!set || !name) return;
    try {
      await saveSet({ id: set.id, name, level: set.level, words: set.words });
      status("Umbenannt.");
      await load();
    } catch (err) {
      console.error(err);
      status("Umbenennen hat nicht geklappt.");
    }
  });

  await load();
}
