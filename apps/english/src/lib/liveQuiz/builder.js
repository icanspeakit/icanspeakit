// /teachers/quiz/create — a teacher's own live quiz for one chapter.
//
// State is one draft: { id?, title, chapter, chapter2, questions[] }; custom.js saves both
// chapters in one column as "w:a1-03+g:futur". Chapter items are ticked in and out by their `src`; own questions are added,
// edited and removed in the form. Saving writes the row; "live starten" saves and opens
// the projector page with ?quiz=<id>.
import { cleanQuestion, currentUser, deleteQuiz, getQuiz, isTeacher, listQuizzes, MAX_QUESTIONS, saveQuiz, setTeacher } from "./custom.js";
import { loadText, t } from "./text.js";
import { withBase } from "../paths.js";
import { currentPath } from "../paths.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function mountBuilder(root) {
  const $ = (s) => root.querySelector(s);
  const gates = [...root.querySelectorAll("[data-gate]")];
  const gate = (name) => gates.forEach((g) => (g.hidden = g.dataset.gate !== name));
  let mounted = false;
  loadText(() => { if (mounted) { render(); renderMine(); banks.forEach((b) => b.render()); refreshBanks(); } });

  /* -------------------------------------------------------------- who ---- */
  const next = encodeURIComponent(currentPath() + location.search);
  $("[data-signin-link]").href = `/anmelden?next=${next}`;
  let user = await currentUser();
  if (!user) return gate("signin");
  if (!isTeacher(user)) {
    gate("teacher");
    await new Promise((resolve) => {
      $("[data-teacher-on]").addEventListener("click", async (e) => {
        e.currentTarget.disabled = true;
        try {
          user = await setTeacher(true);
          resolve();
        } catch {
          e.currentTarget.disabled = false;
          $("[data-teacher-error]").textContent = t("qb.error.generic", "Das hat gerade nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal.");
        }
      });
    });
  }
  gate("ok");
  mounted = true;

  /* ------------------------------------------------------------ state ---- */
  const blank = () => ({ id: null, title: "", chapter: "", chapter2: "", questions: [] });
  let draft = blank();
  let dirty = false;
  let mine = [];
  let editing = -1; // index in draft.questions the own-question form is editing, or -1
  const bankCache = new Map();

  const titleIn = $("[data-title]");
  const chapterSel = $("[data-chapter]");
  const chapter2Sel = $("[data-chapter2]");
  let side = false; // the second chapter's card is open
  let autoTitle = true; // the title is still the one made from the chapter names
  const ownForm = $("[data-own]");
  const status = (msg) => { $("[data-status]").textContent = msg; };
  const touch = () => { dirty = true; status(""); };

  addEventListener("beforeunload", (e) => { if (dirty) e.preventDefault(); });

  /* ------------------------------------------------------------- mine ---- */
  async function loadMine() {
    try {
      mine = await listQuizzes();
    } catch (err) {
      console.error(err);
      mine = [];
      status(t("qb.error.load", "Deine Quizze konnten nicht geladen werden."));
    }
    renderMine();
  }

  function renderMine() {
    $("[data-mine-empty]").hidden = mine.length > 0;
    $("[data-mine]").innerHTML = mine
      .map((q) => `
        <li class="${q.id === draft.id ? "is-on" : ""}">
          <button type="button" class="qb-mine-open" data-open="${q.id}">
            <b>${esc(q.title)}</b>
            <small>${esc(t("qb.mine.count", "{n} Fragen", { n: q.questions?.length ?? 0 }))}${q.chapter ? ` · ${esc(chapterName(q.chapter))}` : ""}</small>
          </button>
          <a class="qb-mine-play" href="/teachers/quiz?quiz=${q.id}" title="${esc(t("qb.mine.play", "Live starten"))}" aria-label="${esc(t("qb.mine.play", "Live starten"))}: ${esc(q.title)}">▶</a>
        </li>`)
      .join("");
  }

  // Takes the stored form ("g:futur", or two joined: "w:a1-03+g:futur") or an option value
  // ("g-futur").
  const chapterName = (slug) =>
    String(slug ?? "")
      .split("+")
      .map((one) => {
        const opt = one && chapterSel.querySelector(`option[value="${CSS.escape(one.replace(":", "-"))}"]`);
        return opt ? opt.textContent.replace(/\s*\(\d+\)$/, "") : "";
      })
      .filter(Boolean)
      .join(" + ");
  // Option value "g-futur" <-> stored "g:futur".
  const toStored = (v) => (v ? v.replace("-", ":") : "");
  const toOption = (c) => (c ? c.replace(":", "-") : "");
  const kindOf = (v) => (v?.startsWith("g") ? "grammatik" : v ? "wortschatz" : "");

  $("[data-mine]").addEventListener("click", async (e) => {
    const id = e.target.closest("[data-open]")?.dataset.open;
    if (!id) return;
    if (dirty && !confirm(t("qb.confirm.discard", "Ungespeicherte Änderungen verwerfen?"))) return;
    try {
      const q = await getQuiz(id);
      if (q) openDraft(q);
    } catch (err) {
      console.error(err);
      status(t("qb.error.load", "Deine Quizze konnten nicht geladen werden."));
    }
  });

  $("[data-new]").addEventListener("click", () => {
    if (dirty && !confirm(t("qb.confirm.discard", "Ungespeicherte Änderungen verwerfen?"))) return;
    openDraft(blank());
    titleIn.focus();
  });

  function openDraft(q) {
    $("[data-chapter-field]").hidden = false;
    $("[data-chapter-show]").hidden = true;
    const [c1 = "", c2 = ""] = (q.chapter ?? "").split("+");
    draft = { id: q.id ?? null, title: q.title ?? "", chapter: c1, chapter2: c2, questions: (q.questions ?? []).map(cleanQuestion).filter(Boolean) };
    dirty = false;
    autoTitle = !draft.title;
    titleIn.value = draft.title;
    chapterSel.value = toOption(draft.chapter);
    chapter2Sel.value = toOption(draft.chapter2);
    side = !!draft.chapter2;
    resetOwn();
    status("");
    const u = new URL(location.href);
    if (draft.id) u.searchParams.set("id", draft.id); else u.searchParams.delete("id");
    history.replaceState(null, "", u);
    banks.forEach((b) => b.load());
    render();
    renderMine();
  }

  /* ---------------------------------------------------------- chapter ---- */
  // The title follows the chapters ("Lernset 3 + Perfekt") until the teacher types one.
  function autoName() {
    if (!autoTitle) return;
    draft.title = chapterName([chapterSel.value, chapter2Sel.value].filter(Boolean).join("+"));
    titleIn.value = draft.title;
  }
  titleIn.addEventListener("input", () => { draft.title = titleIn.value; autoTitle = !titleIn.value; touch(); });
  chapterSel.addEventListener("change", () => {
    draft.chapter = toStored(chapterSel.value);
    // The second chapter is always the other kind; switching the first to that kind ends it.
    if (kindOf(chapterSel.value) === kindOf(chapter2Sel.value)) closeSide();
    autoName();
    touch();
    main.load();
  });
  chapter2Sel.addEventListener("change", () => {
    draft.chapter2 = toStored(chapter2Sel.value);
    autoName();
    touch();
    second.load();
  });

  // One card per chapter: its select, its ready-made questions, its tick tools.
  const banks = [];
  function makeBank(card, sel) {
    const list = card.querySelector("[data-bank-list]");
    const bank = { data: null };
    bank.items = () => (bank.data?.groups ?? []).flatMap((g) => g.items);
    bank.load = async () => {
      const slug = sel.value;
      bank.data = null;
      refreshBanks();
      if (!slug) { list.innerHTML = ""; return; }
      list.innerHTML = `<p class="qb-empty">${esc(t("qb.loading", "Einen Moment …"))}</p>`;
      try {
        if (!bankCache.has(slug)) {
          const res = await fetch(withBase(`/teachers/quiz-chapters/${slug}.json`));
          if (!res.ok) throw new Error(String(res.status));
          bankCache.set(slug, await res.json());
        }
        if (sel.value !== slug) return; // changed again while loading
        bank.data = bankCache.get(slug);
      } catch (err) {
        console.error(err);
        list.innerHTML = `<p class="lq-error">${esc(t("qb.error.bank", "Die Fragen dieses Kapitels konnten nicht geladen werden."))}</p>`;
        return;
      }
      bank.render();
      refreshBanks();
    };
    bank.render = () => {
      if (!bank.data) return;
      const has = inQuiz();
      list.innerHTML = bank.data.groups
        .map((g) => `
          <fieldset class="qb-group">
            <legend>${esc(g.title)}</legend>
            ${g.items.map((it) => `
              <label class="qb-item">
                <input type="checkbox" data-src="${esc(it.src)}" ${has.has(it.src) ? "checked" : ""} />
                ${it.t === "word"
                  ? `<span class="qb-item-q" lang="en">${esc(it.de)}</span><span class="qb-item-a">${esc(it.en)}</span>`
                  : `<span class="qb-item-q" lang="en">${esc(it.prompt)}</span><span class="qb-item-a" lang="en">✓ ${esc(it.options[it.correct])} <s>${it.options.filter((_, i) => i !== it.correct).map(esc).join(" · ")}</s></span>`}
              </label>`).join("")}
          </fieldset>`)
        .join("");
    };
    list.addEventListener("change", (e) => {
      const src = e.target.dataset?.src;
      const it = bank.items().find((x) => x.src === src);
      if (it) setTicked([it], e.target.checked);
    });
    card.querySelector("[data-bank-all]").addEventListener("click", () => setTicked(bank.items(), true));
    card.querySelector("[data-bank-none]").addEventListener("click", () => setTicked(bank.items(), false));
    card.querySelector("[data-bank-random]").addEventListener("click", () => {
      const has = inQuiz();
      setTicked(shuffle(bank.items().filter((it) => !has.has(it.src))).slice(0, 10), true);
    });
    banks.push(bank);
    return bank;
  }
  const main = makeBank($("[data-bank]"), chapterSel);
  const second = makeBank($("[data-bank2]"), chapter2Sel);

  // Which cards show, and the words that depend on the first chapter's kind: a Lernset
  // offers grammar beside it, a grammar topic offers a Lernset.
  function refreshBanks() {
    const kind = kindOf(chapterSel.value);
    const other = kind === "wortschatz" ? "grammatik" : "wortschatz";
    const what = other === "grammatik" ? t("qb.bank2.grammar", "Grammatik") : t("qb.bank2.words", "Wortschatz");
    $("[data-bank]").hidden = !kind;
    $("[data-bank2]").hidden = !side || !kind;
    $("[data-banks]").classList.toggle("is-two", side && !!kind);
    const add = $("[data-add2]");
    add.hidden = side || !kind;
    add.textContent = t("qb.bank2.add", "+ {what} dazunehmen", { what });
    $("[data-bank2-title]").textContent = t("qb.bank2.title", "{what} dazu", { what });
    const close = $("[data-close2]");
    close.textContent = t("qb.bank2.close", "entfernen");
    close.setAttribute("aria-label", t("qb.bank2.closeLabel", "Zweites Kapitel entfernen"));
    $("[data-chapter2-none]").textContent = t("qb.bank2.none", "{what}-Kapitel wählen …", { what });
    chapter2Sel.setAttribute("aria-label", t("qb.bank2.title", "{what} dazu", { what }));
    chapter2Sel.querySelectorAll("optgroup").forEach((og) => {
      og.hidden = og.disabled = og.dataset.kind !== other;
    });
    $("[data-bank2-tools]").hidden = !second?.data;
    $("[data-word-dir]").hidden = !banks.some((b) => b.items().some((it) => it.t === "word"));
  }

  function closeSide() {
    side = false;
    chapter2Sel.value = "";
    draft.chapter2 = "";
    second.load();
  }
  $("[data-add2]").addEventListener("click", () => {
    side = true;
    refreshBanks();
    chapter2Sel.focus();
  });
  // Removing the chapter keeps the questions already ticked from it: they stay in the list.
  $("[data-close2]").addEventListener("click", () => {
    closeSide();
    autoName();
    touch();
  });

  const inQuiz = () => new Set(draft.questions.map((q) => q.src).filter(Boolean));
  const wordDir = () => root.querySelector('input[name="qb-dir"]:checked')?.value ?? "de-meaning";

  const fromBank = (it) => cleanQuestion(it.t === "word" ? { ...it, dir: wordDir() } : it);

  function setTicked(items, on) {
    const has = inQuiz();
    for (const it of items) {
      if (on && !has.has(it.src)) {
        if (draft.questions.length >= MAX_QUESTIONS) { status(t("qb.error.max", "Höchstens {n} Fragen pro Quiz.", { n: MAX_QUESTIONS })); break; }
        const q = fromBank(it);
        if (q) draft.questions.push(q);
      } else if (!on && has.has(it.src)) {
        draft.questions = draft.questions.filter((q) => q.src !== it.src);
      }
    }
    touch();
    render();
  }

  // The direction applies to the words already in the quiz, too.
  $("[data-word-dir]").addEventListener("change", () => {
    const dir = wordDir();
    draft.questions.forEach((q) => { if (q.t === "word") q.dir = dir; });
    touch();
    render();
  });

  /* ------------------------------------------------------ own question ---- */
  const optIns = [...root.querySelectorAll("[data-own-opt]")];
  function resetOwn() {
    editing = -1;
    ownForm.reset();
    $("[data-own-cancel]").hidden = true;
    $("[data-own-submit]").textContent = t("qb.own.add", "Frage hinzufügen");
    $("[data-own-title]").textContent = t("qb.own.title", "Eigene Frage");
    $("[data-own-error]").textContent = "";
  }
  function editOwn(i) {
    const q = draft.questions[i];
    if (q?.t !== "mc") return;
    editing = i;
    $("[data-own-prompt]").value = q.prompt;
    optIns.forEach((el, k) => (el.value = q.options[k] ?? ""));
    ownForm.querySelector(`input[name="qb-correct"][value="${q.correct}"]`).checked = true;
    $("[data-own-kind]").value = q.kind ?? "";
    $("[data-own-cancel]").hidden = false;
    $("[data-own-submit]").textContent = t("qb.own.update", "Änderung übernehmen");
    $("[data-own-title]").textContent = t("qb.own.editTitle", "Frage {n} bearbeiten", { n: i + 1 });
    ownForm.scrollIntoView({ block: "start", behavior: "smooth" });
    $("[data-own-prompt]").focus({ preventScroll: true });
  }
  $("[data-own-cancel]").addEventListener("click", resetOwn);
  ownForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const correct = Number(new FormData(ownForm).get("qb-correct"));
    const err = $("[data-own-error]");
    if (!optIns[correct].value.trim()) {
      err.textContent = t("qb.error.correctEmpty", "Die angekreuzte richtige Antwort ist leer.");
      return;
    }
    const prev = editing >= 0 ? draft.questions[editing] : null;
    const q = cleanQuestion({
      t: "mc",
      prompt: $("[data-own-prompt]").value,
      options: optIns.map((el) => el.value),
      correct,
      kind: $("[data-own-kind]").value,
      // An edited chapter question stays linked to its chapter item.
      src: prev?.src,
    });
    if (!q) {
      err.textContent = t("qb.error.own", "Eine Frage braucht einen Text und mindestens zwei verschiedene Antworten.");
      return;
    }
    if (editing >= 0) draft.questions[editing] = q;
    else if (draft.questions.length >= MAX_QUESTIONS) { err.textContent = t("qb.error.max", "Höchstens {n} Fragen pro Quiz.", { n: MAX_QUESTIONS }); return; }
    else draft.questions.push(q);
    resetOwn();
    touch();
    render();
  });

  /* ------------------------------------------------------------- list ---- */
  function render() {
    $("[data-ed-title]").textContent = draft.id ? t("qb.ed.edit", "Quiz bearbeiten") : t("qb.ed.new", "Neues Quiz");
    $("[data-delete]").hidden = !draft.id;
    $("[data-count]").textContent = `${draft.questions.length} / ${MAX_QUESTIONS}`;
    $("[data-list-empty]").hidden = draft.questions.length > 0;
    $("[data-list]").innerHTML = draft.questions
      .map((q, i) => {
        const body = q.t === "word"
          ? `<span class="qb-li-q" lang="en">${esc(q.label ?? q.id)}</span><span class="qb-li-a">${esc(q.dir === "meaning-de" ? t("lq.mode.meaningDeLabel", "Übersetzung → Deutsch") : t("lq.mode.deMeaningLabel", "Deutsch → Übersetzung"))}</span>`
          : `${q.kind ? `<span class="qb-li-kind">${esc(q.kind)}</span>` : ""}<span class="qb-li-q" lang="en">${esc(q.prompt)}</span><span class="qb-li-a" lang="en">${q.options.map((o, k) => (k === q.correct ? `<b>✓ ${esc(o)}</b>` : esc(o))).join(" · ")}</span>`;
        return `
          <li class="${i === editing ? "is-editing" : ""}">
            <div class="qb-li-body">${body}</div>
            <div class="qb-li-tools">
              <button type="button" data-move="-1" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="${esc(t("qb.list.up", "Nach oben"))}">↑</button>
              <button type="button" data-move="1" data-i="${i}" ${i === draft.questions.length - 1 ? "disabled" : ""} aria-label="${esc(t("qb.list.down", "Nach unten"))}">↓</button>
              ${q.t === "mc" ? `<button type="button" data-edit="${i}" aria-label="${esc(t("qb.list.edit", "Bearbeiten"))}">✎</button>` : ""}
              <button type="button" data-remove="${i}" aria-label="${esc(t("qb.list.remove", "Entfernen"))}">✕</button>
            </div>
          </li>`;
      })
      .join("");
    // Keep the chapter's ticks in step with the list.
    const has = inQuiz();
    root.querySelectorAll("[data-bank-list] [data-src]").forEach((cb) => (cb.checked = has.has(cb.dataset.src)));
    $("[data-save]").disabled = $("[data-play]").disabled = $("[data-play-top]").disabled = draft.questions.length === 0;
  }

  $("[data-list]").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.edit != null) return editOwn(Number(b.dataset.edit));
    if (b.dataset.remove != null) {
      const i = Number(b.dataset.remove);
      draft.questions.splice(i, 1);
      if (editing === i) resetOwn(); else if (editing > i) editing--;
    } else if (b.dataset.move != null) {
      const i = Number(b.dataset.i);
      const j = i + Number(b.dataset.move);
      if (j < 0 || j >= draft.questions.length) return;
      [draft.questions[i], draft.questions[j]] = [draft.questions[j], draft.questions[i]];
      if (editing === i) editing = j; else if (editing === j) editing = i;
    }
    touch();
    render();
  });
  $("[data-shuffle]").addEventListener("click", () => {
    if (editing >= 0) resetOwn();
    draft.questions = shuffle(draft.questions);
    touch();
    render();
  });

  /* ------------------------------------------------------------- save ---- */
  async function save() {
    if (!draft.questions.length) return null;
    const btns = root.querySelectorAll("[data-save], [data-play], [data-delete]");
    btns.forEach((b) => (b.disabled = true));
    status(t("qb.saving", "Wird gespeichert …"));
    try {
      const chapter = [draft.chapter, draft.chapter2].filter(Boolean).join("+");
      const saved = await saveQuiz({ ...draft, chapter, title: draft.title || chapterName(chapter) || t("qb.untitled", "Mein Quiz") });
      draft.id = saved.id;
      draft.title = saved.title;
      titleIn.value = saved.title;
      dirty = false;
      const u = new URL(location.href);
      u.searchParams.set("id", saved.id);
      history.replaceState(null, "", u);
      mine = [saved, ...mine.filter((q) => q.id !== saved.id)];
      renderMine();
      status(t("qb.saved", "Gespeichert."));
      return saved;
    } catch (err) {
      console.error(err);
      status(t("qb.error.save", "Speichern hat nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal."));
      return null;
    } finally {
      btns.forEach((b) => (b.disabled = false));
      render();
    }
  }
  $("[data-save]").addEventListener("click", save);
  const play = async () => {
    const saved = await save();
    if (saved) location.href = withBase(`/teachers/quiz?quiz=${saved.id}`);
  };
  $("[data-play]").addEventListener("click", play);
  $("[data-play-top]").addEventListener("click", play);
  $("[data-chapter-show]").addEventListener("click", (e) => {
    e.currentTarget.hidden = true;
    $("[data-chapter-field]").hidden = false;
    chapterSel.focus();
  });
  $("[data-delete]").addEventListener("click", async () => {
    if (!draft.id || !confirm(t("qb.confirm.delete", "Dieses Quiz löschen? Das lässt sich nicht rückgängig machen."))) return;
    try {
      await deleteQuiz(draft.id);
      mine = mine.filter((q) => q.id !== draft.id);
      openDraft(blank());
      status(t("qb.deleted", "Gelöscht."));
    } catch (err) {
      console.error(err);
      status(t("qb.error.generic", "Das hat gerade nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal."));
    }
  });

  /* ------------------------------------------------------------ start ---- */
  await loadMine();
  const want = new URLSearchParams(location.search).get("id");
  const start = want && (mine.find((q) => q.id === want) ?? (await getQuiz(want).catch(() => null)));
  openDraft(start ?? blank());
  // ?kapitel=g-futur preselects a chapter for a new quiz (the teacher link on grammar
  // topic and Lernset pages, src/components/LiveQuizLink.astro).
  const pre = new URLSearchParams(location.search).get("kapitel");
  if (!start && pre && chapterSel.querySelector(`option[value="${CSS.escape(pre)}"]`)) {
    chapterSel.value = pre;
    chapterSel.dispatchEvent(new Event("change"));
    dirty = false;
  }
  // ?set=<id>: a new quiz from one of the teacher's card sets (Vokabeln vom Foto,
  // /teachers/cards): its words as questions, ready to save and play.
  const fromSet = new URLSearchParams(location.search).get("set");
  if (!start && fromSet) {
    try {
      const [{ getSet }, { quizQuestionsFor }, { MEANING_LANGS }] = await Promise.all([
        import("../vokabelFoto/sets.js"), import("../vokabelFoto/play.js"), import("./protocol.js"),
      ]);
      const set = await getSet(fromSet);
      if (set) {
        openDraft({ title: set.name.slice(0, 80), questions: await quizQuestionsFor(set, MEANING_LANGS, MAX_QUESTIONS) });
        dirty = true;
        autoTitle = false;
        // The set's words are the quiz: the chapter picker would only confuse here, so it
        // waits behind a link for a teacher who wants grammar questions too.
        $("[data-chapter-field]").hidden = true;
        $("[data-chapter-show]").hidden = false;
      }
    } catch (err) {
      console.error(err);
      status(t("qb.error.generic", "Das hat gerade nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal."));
    }
  }
}
