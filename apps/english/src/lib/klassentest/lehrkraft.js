// /teachers/tests — the teacher's tests and the form for a new one: level, topics, how
// many questions. The questions are drawn here from the pool (/teachers/tests/fragen.json,
// built by pool.js), evenly across the ticked topics, and shown before the test is made, so
// the teacher can drop one or draw again. A new test opens straight on its results page,
// which shows the QR code big for the projector.
import { currentUser, isTeacher, setTeacher } from "../liveQuiz/custom.js";
import { loadText, t } from "../liveQuiz/text.js";
import { ANZAHLEN, MAX_TESTS, PRO_NIVEAU, meineTests, testAnlegen, testLoeschen, testOffen } from "./daten.js";
import { withBase } from "../paths.js";
import { currentPath } from "../paths.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const datum = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const GENERIC = ["kl.t.err.generic", "Das hat gerade nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal."];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const davor = (n) => LEVELS[LEVELS.indexOf(n) - 1] ?? null;

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** How many options every question of this test gets: 4 when each topic has questions with
 *  four and there are enough of them, else 3 (every question in the pool has at least 3). */
export function optionenZahl(topics, n) {
  const vier = topics.map((tp) => tp.fragen.filter((f) => f.o.length >= 4).length);
  return vier.length && vier.every((x) => x > 0) && vier.reduce((s, x) => s + x, 0) >= n ? 4 : 3;
}

/* How hard the test is, set by the teacher. The questions stay the topic pages' own; what
 * changes is the choice around them. The pool lists each question's options as the answer,
 * then the wrong ones from most to least like it (pool.js). Hints stay at every level: some
 * questions need theirs („Er ruft ___ Vater an.“ with seinen, deinen, meinen).
 *   leicht  3 options, the wrong ones least like the answer
 *   mittel  3 options, the nearest misses
 *   schwer  4 options where every topic has them (else 3), the nearest misses */
export const STUFEN = ["leicht", "mittel", "schwer"];

/** `n` questions spread evenly over `topics`: one from each in turn, in random order. Every
 *  question gets the same number of options (optionenZahl, or 3 for „leicht“). */
export function ziehen(topics, n, stufe = "mittel", fest = null) {
  const k = fest ?? (stufe === "schwer" ? optionenZahl(topics, n) : 3);
  const optionen = (o) => (stufe === "leicht" ? [o[0], ...o.slice(1).slice(-(k - 1))] : o.slice(0, k));
  const decks = shuffle(topics).map((tp) => ({ tp, rest: shuffle(tp.fragen.filter((f) => f.o.length >= k)) }));
  const out = [];
  while (out.length < n && decks.some((d) => d.rest.length)) {
    for (const d of decks) {
      if (out.length >= n) break;
      const f = d.rest.pop();
      if (f) out.push({ ...f, o: optionen(f.o), t: d.tp.id, tn: d.tp.name, l: d.tp.level });
    }
  }
  // Grouped by topic in the test, in level order, so the phone does not jump back and forth.
  const order = topics.map((tp) => tp.id);
  return out.sort((a, b) => order.indexOf(a.t) - order.indexOf(b.t));
}

export async function mountTests(root) {
  const $ = (s) => root.querySelector(s);
  const gates = [...root.querySelectorAll("[data-gate]")];
  const gate = (name) => gates.forEach((g) => (g.hidden = g.dataset.gate !== name));
  let mounted = false;
  await loadText(() => { if (mounted) { render(); drawTopics(); drawPreview(); } });

  /* -------------------------------------------------------------- who ---- */
  $("[data-signin-link]").href = `/anmelden?next=${encodeURIComponent(currentPath())}`;
  const user = await currentUser();
  if (!user) return gate("signin");
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
          $("[data-teacher-error]").textContent = t("qb.error.generic", "Das hat gerade nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal.");
        }
      });
    });
  }
  gate("ok");

  /* ------------------------------------------------------------ list ---- */
  let tests = [];
  const status = (msg) => { $("[data-status]").textContent = msg; };

  function card(k) {
    const n = k.ergebnisse;
    return `
      <li class="lq-card kl-class uf-item" data-id="${k.id}">
        <div class="kl-class-head">
          <h3><a href="/teachers/tests/result?id=${k.id}">${esc(k.titel)}</a></h3>
          <span class="kl-badge">${esc(k.art === "einstufung" ? ART_TEXT.einstufung() : k.niveau ?? ART_TEXT.thema())}</span>
          <span class="uf-state ${k.offen ? "is-open" : ""}">${esc(k.offen ? t("uf.t.open", "offen") : t("uf.t.closed", "geschlossen"))}</span>
          <span class="kl-count">${esc(n === 1 ? t("kt.t.one", "1 Ergebnis") : t("kt.t.count", "{n} Ergebnisse", { n }))}</span>
        </div>
        <p class="kl-muted">${esc(datum(k.created_at))} · ${esc(t("kl.t.code", "Code"))} <span class="uf-code-sm">${esc(k.code)}</span> · ${esc(t("uf.t.questions", "{n} Fragen", { n: k.fragen?.length ?? 0 }))}</p>
        <div class="kl-row">
          <a class="lq-btn lq-btn--primary" href="/teachers/tests/result?id=${k.id}">${esc(t("kt.t.results", "Ergebnisse und QR-Code"))}</a>
          <button type="button" class="lq-btn lq-btn--ghost" data-act="toggle">${esc(k.offen ? t("uf.t.close", "Schließen") : t("uf.t.reopen", "Wieder öffnen"))}</button>
          <button type="button" class="lq-btn lq-btn--quiet" data-act="delete">${esc(t("uf.t.delete", "Löschen"))}</button>
        </div>
      </li>`;
  }

  function render() {
    $("[data-list]").innerHTML = tests.map(card).join("");
  }

  async function load() {
    try {
      tests = await meineTests();
    } catch (err) {
      console.error(err);
      status(t("kt.t.err.load", "Deine Tests konnten nicht geladen werden."));
    }
    render();
  }

  $("[data-list]").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    const li = btn?.closest("[data-id]");
    if (!btn || !li) return;
    const k = tests.find((x) => x.id === li.dataset.id);
    if (!k) return;
    status("");
    btn.disabled = true;
    try {
      if (btn.dataset.act === "toggle") {
        await testOffen(k.id, !k.offen);
        k.offen = !k.offen;
        status(k.offen ? t("kt.t.reopened", "„{name}“ nimmt wieder Abgaben an.", { name: k.titel }) : t("kt.t.closedDone", "„{name}“ ist geschlossen. Die Ergebnisse bleiben.", { name: k.titel }));
      } else if (btn.dataset.act === "delete") {
        if (!confirm(t("kt.t.confirm.delete", "„{name}“ mit allen Ergebnissen endgültig löschen?", { name: k.titel }))) return;
        await testLoeschen(k.id);
        tests = tests.filter((x) => x !== k);
      }
      render();
    } catch (err) {
      console.error(err);
      status(t(...GENERIC));
    } finally {
      btn.disabled = false;
    }
  });

  /* ------------------------------------------------------------- form ---- */
  const form = $("[data-new]");
  const levelSel = $("[data-new-level]");
  const countSel = $("[data-new-count]");
  const stufeSel = $("[data-new-stufe]");
  const vonSel = $("[data-new-von]");
  const bisSel = $("[data-new-bis]");
  const proSel = $("[data-new-pro]");
  const art = () => form.querySelector("[name=art]:checked")?.value ?? "einstufung";
  const schreibSel = $("[data-new-schreib]");
  // Ausführlich: an Einstufungstest with Lesen, Hören and Schreiben next to the grammar.
  const lang = () => art() === "einstufung" && form.querySelector("[name=umfang]:checked")?.value === "lang";
  const teile = () => (lang() ? [...form.querySelectorAll("[name=teil]:checked")].map((x) => x.value) : ["grammatik"]);
  const ART_TEXT = { einstufung: () => t("kt.t.art.einstufung", "Einstufungstest"), thema: () => t("kt.t.art.thema", "Thementest") };
  const STUFE_TEXT = {
    leicht: () => t("kt.t.stufe.leicht", "Leicht"),
    mittel: () => t("kt.t.stufe.mittel", "Mittel"),
    schwer: () => t("kt.t.stufe.schwer", "Schwer"),
  };
  const STUFE_INFO = {
    leicht: () => t("kt.t.stufe.leichtInfo", "3 Antworten zur Auswahl. Die falschen sind gut von der richtigen zu unterscheiden."),
    mittel: () => t("kt.t.stufe.mittelInfo", "3 Antworten zur Auswahl. Die falschen sehen der richtigen ähnlich."),
    schwer: () => t("kt.t.stufe.schwerInfo", "4 Antworten zur Auswahl. Die falschen sehen der richtigen ähnlich."),
  };
  const nameIn = $("[data-new-name]");
  let pool = [];
  let fk = { lesen: [], hoeren: [], schreiben: [] }; // fertigkeiten.json
  let fragen = []; // the drawn questions, as the test will hold them
  const picked = new Map(); // topic id → on/off by hand, so a change of level keeps it
  let titelByHand = false;

  try {
    const [a, b] = await Promise.all([fetch(withBase("/teachers/tests/fragen.json")), fetch(withBase("/teachers/tests/fertigkeiten.json"))]);
    pool = await a.json();
    fk = await b.json();
  } catch (err) {
    console.error(err);
    $("[data-new-error]").textContent = t(...GENERIC);
  }
  const levels = LEVELS.filter((l) => pool.some((tp) => tp.level === l));
  levelSel.innerHTML = levels.map((l) => `<option value="${l}" ${l === "A2" ? "selected" : ""}>${l}</option>`).join("");
  vonSel.innerHTML = levels.map((l) => `<option value="${l}" ${l === levels[0] ? "selected" : ""}>${l}</option>`).join("");
  bisSel.innerHTML = levels.map((l) => `<option value="${l}" ${l === levels[levels.length - 1] ? "selected" : ""}>${l}</option>`).join("");
  proSel.innerHTML = PRO_NIVEAU.map((n) => `<option value="${n}" ${n === 4 ? "selected" : ""}>${esc(t("uf.t.questions", "{n} Fragen", { n }))}</option>`).join("");
  stufeSel.innerHTML = STUFEN.map((x) => `<option value="${x}" ${x === "mittel" ? "selected" : ""}>${esc(STUFE_TEXT[x]())}</option>`).join("");
  schreibSel.innerHTML = fk.schreiben.map((x) => `<option value="${esc(x.id)}">${esc(x.level)} · ${esc(x.title)}</option>`).join("");
  countSel.innerHTML = ANZAHLEN.map((n) => `<option value="${n}" ${n === 15 ? "selected" : ""}>${esc(t("uf.t.questions", "{n} Fragen", { n }))}</option>`).join("");

  const topicOn = (tp) => picked.get(tp.id) ?? tp.level === levelSel.value;
  const shownTopics = () => {
    const prev = davor(levelSel.value);
    return [...pool.filter((tp) => tp.level === levelSel.value), ...pool.filter((tp) => tp.level === prev)];
  };
  const chosenTopics = () => shownTopics().filter(topicOn);

  function drawTopics() {
    const list = shownTopics();
    const on = list.filter(topicOn).length;
    const prev = davor(levelSel.value);
    $("[data-topics-note]").textContent = t("kt.t.topics.note", "{n} ausgewählt. Tippe ein Thema an, um es dazuzunehmen oder herauszunehmen.", { n: on })
      + (prev ? " " + t("kt.t.topics.prev", "Themen aus {prev} stehen zum Wiederholen mit dabei.", { prev }) : "");
    $("[data-topics-list]").innerHTML = list
      .map((tp) => `<label class="uf-chip"><input type="checkbox" value="${esc(tp.id)}" ${topicOn(tp) ? "checked" : ""} /><span><small>${esc(tp.level)}</small> ${esc(tp.name)}</span></label>`)
      .join("");
  }

  // Questions the teacher changed or wrote stay when the rest is drawn again.
  const kept = () => fragen.filter((f) => f.edited || f.eigen);
  const optionCount = () => fragen.find((f) => !f.edited && !f.eigen)?.o.length ?? (stufeSel.value === "schwer" ? 4 : 3);
  /** The levels of an Einstufungstest, Von to Bis (swapped if the teacher set them the wrong way round). */
  function spanne() {
    const [a, b] = [levels.indexOf(vonSel.value), levels.indexOf(bisSel.value)].sort((x, y) => x - y);
    return levels.slice(a, b + 1);
  }
  function draw() {
    const keep = kept();
    const ids = new Set(keep.map((f) => f.id));
    const without = (tp) => ({ ...tp, fragen: tp.fragen.filter((f) => !ids.has(f.id)) });
    if (art() === "einstufung") {
      // Every level gets the same number of questions, spread over all of its topics, easy
      // to hard. One option count for the whole test: 4 („schwer“) only if every level can.
      const pro = Number(proSel.value) || 4;
      const span = spanne();
      const vier = stufeSel.value === "schwer" && span.every((l) =>
        pool.filter((tp) => tp.level === l).reduce((n, tp) => n + tp.fragen.filter((f) => f.o.length >= 4).length, 0) >= pro);
      const k = vier ? 4 : 3;
      const parts = teile();
      const drawn = parts.includes("grammatik") ? span.flatMap((l) => {
        const topics = pool.filter((tp) => tp.level === l).map(without).filter((tp) => tp.fragen.some((f) => f.o.length >= k));
        return ziehen(topics, Math.max(0, pro - keep.filter((f) => f.l === l && !f.teil).length), stufeSel.value, k);
      }) : [];
      // Lesen and Hören: one text and one clip per level, all of its questions, as written.
      const pick = (list) => list[Math.floor(Math.random() * list.length)];
      const ausText = (teil, label) => span.flatMap((l) => {
        const x = pick(fk[teil].filter((y) => y.level === l));
        return x ? x.fragen.map((q, i) => ({ id: `${teil}/${x.id}/${i}`, teil, ref: x.id, l, t: teil, tn: `${label}: ${x.title}`, q: q.q, h: "", x: "", o: q.o, a: q.a })) : [];
      });
      const lesen = parts.includes("lesen") ? ausText("lesen", t("kt.t.teil.lesen", "Lesen")) : [];
      const hoeren = parts.includes("hoeren") ? ausText("hoeren", t("kt.t.teil.hoeren", "Hören")) : [];
      const task = parts.includes("schreiben") ? fk.schreiben.find((x) => x.id === schreibSel.value) : null;
      const schreib = task ? [{ id: `schreiben/${task.id}`, teil: "schreiben", typ: "text", ref: task.id, l: task.level, t: "schreiben", tn: `${t("kt.t.teil.schreiben", "Schreiben")}: ${task.title}`, q: task.situation, h: "", x: "", o: [], a: [] }] : [];
      const rank = (f) => (f.l ? LEVELS.indexOf(f.l) : 99);
      fragen = [...[...drawn, ...keep].sort((a, b) => rank(a) - rank(b)), ...lesen, ...hoeren, ...schreib];
    } else {
      const topics = chosenTopics().map(without);
      const drawn = ziehen(topics, Math.max(0, (Number(countSel.value) || 15) - keep.length), stufeSel.value);
      const order = [...chosenTopics().map((tp) => tp.id), "eigen"];
      fragen = [...drawn, ...keep].sort((a, b) => order.indexOf(a.t) - order.indexOf(b.t));
    }
    $("[data-stufe-info]").textContent = STUFE_INFO[stufeSel.value]();
    drawPreview();
    drawDauer();
  }

  /** About how long the test takes: half a minute a grammar question, a minute a reading or
   *  listening question plus the clip twice, a quarter of an hour for the writing. */
  function drawDauer() {
    const sek = fragen.reduce((n, f) => n + (f.typ === "text" ? 900 : f.teil === "lesen" || f.teil === "hoeren" ? 60 : 30), 0)
      + [...new Set(fragen.filter((f) => f.teil === "hoeren").map((f) => f.ref))]
        .reduce((n, id) => n + 2 * (fk.hoeren.find((x) => x.id === id)?.seconds ?? 60), 0);
    $("[data-dauer]").textContent = t("kt.t.dauer", "Dauer etwa {m} Minuten.", { m: Math.max(5, Math.round(sek / 300) * 5) });
  }

  function drawPreview() {
    const g0 = fragen.find((f) => !f.teil && !f.eigen);
    $("[data-preview-count]").textContent = g0
      ? t("kt.t.previewK", "Die Fragen ansehen ({n}, je {k} Antworten)", { n: fragen.length, k: g0.o.length })
      : t("kt.t.preview", "Die Fragen ansehen ({n})", { n: fragen.length });
    $("[data-preview-list]").innerHTML = fragen.map((f, i) => (f.open ? editor(f, i) : `<li>
        <span class="kt-pv-topic">${art() === "einstufung" && f.l ? `${esc(f.l)} · ` : ""}${esc(f.tn)}${f.edited && !f.eigen ? ` · ${esc(t("kt.t.edited", "bearbeitet"))}` : ""}</span>
        <span class="kt-pv-q" lang="en">${esc(f.q)}</span>
        ${f.h ? `<span class="kt-pv-h">${esc(f.h)}</span>` : ""}
        ${f.typ === "text"
          ? `<span class="kt-pv-h">${esc(t("kt.t.pv.write", "Freier Text. Du bewertest ihn auf der Ergebnisseite."))}</span>`
          : `<span class="kt-pv-a"><span aria-hidden="true">✓</span> ${esc(f.a[0])} <small>· ${esc(f.o.filter((o) => o !== f.a[0]).join(" · "))}</small></span>`}
        <span class="kt-pv-acts">
          ${f.teil ? "" : `<button type="button" class="qb-link" data-edit="${i}">${esc(t("kt.t.edit", "Bearbeiten"))}</button>`}
          <button type="button" class="qb-link" data-drop="${i}">${esc(t("kt.t.drop", "Entfernen"))}</button>
        </span>
      </li>`)).join("");
    // Why only three options: name the topics that have no question with four.
    const drei = g0 && g0.o.length < 4 && stufeSel.value === "schwer" && art() === "thema"
      ? chosenTopics().filter((tp) => !tp.fragen.some((f) => f.o.length >= 4)).map((tp) => tp.name)
      : [];
    $("[data-preview-k]").hidden = !drei.length;
    $("[data-preview-k]").textContent = drei.length
      ? t("kt.t.k3", "Jede Frage hat 3 Antworten zur Auswahl, weil es zu {topics} nur Fragen mit 3 Antworten gibt. Ohne diese Themen werden es 4.", { topics: drei.join(", ") })
      : "";
    const short = art() === "thema" && fragen.length < (Number(countSel.value) || 15) && chosenTopics().length > 0;
    $("[data-preview-short]").hidden = !short;
    $("[data-preview-short]").textContent = t("kt.t.short", "Zu diesen Themen gibt es nur {n} Fragen. Nimm ein Thema dazu, wenn du mehr brauchst.", { n: fragen.length });
  }

  /** The question as a small form: sentence, hint, the right answer and the wrong ones.
   *  The right answer is always o[0] (pool.js, ziehen), so the wrong ones are o.slice(1). */
  function editor(f, i) {
    const wrong = f.o.slice(1);
    return `<li class="kt-ed" data-ed="${i}">
      <span class="kt-pv-topic">${esc(f.tn)}</span>
      <label class="lq-field"><span>${esc(t("kt.t.ed.q", "Frage (Lücke mit ___)"))}</span>
        <textarea rows="2" maxlength="300" data-f="q" lang="en">${esc(f.q)}</textarea></label>
      <label class="lq-field"><span>${esc(t("kt.t.ed.h", "Hinweis (freiwillig)"))}</span>
        <input type="text" maxlength="120" data-f="h" value="${esc(f.h ?? "")}" /></label>
      <label class="lq-field kt-ed-right"><span>✓ ${esc(t("kt.t.ed.right", "Richtige Antwort"))}</span>
        <input type="text" maxlength="80" data-f="right" value="${esc(f.a[0])}" /></label>
      ${wrong.map((w, j) => `<label class="lq-field kt-ed-wrong"><span>✗ ${esc(t("kt.t.ed.wrong", "Falsche Antwort {n}", { n: j + 1 }))}</span>
        <input type="text" maxlength="80" data-f="wrong" data-j="${j}" value="${esc(w)}" /></label>`).join("")}
      <p class="lq-error" data-ed-error role="alert"></p>
      <span class="kt-pv-acts">
        <button type="button" class="lq-btn lq-btn--primary" data-done="${i}">${esc(t("kt.t.ed.done", "Fertig"))}</button>
        <button type="button" class="qb-link" data-drop="${i}">${esc(t("kt.t.drop", "Entfernen"))}</button>
      </span>
    </li>`;
  }

  /** What is wrong with a question the teacher edited, or "" when it can go in the test. */
  const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
  function problem(f) {
    if (!f.q) return t("kt.t.ed.errQ", "Schreib die Frage.");
    if (f.o.some((o) => !o)) return t("kt.t.ed.errEmpty", "Füll alle Antworten aus.");
    const seen = new Set(f.o.map((o) => o.toLowerCase()));
    if (seen.size < f.o.length) return t("kt.t.ed.errSame", "Zwei Antworten sind gleich.");
    return "";
  }

  const defaultTitle = () => {
    const span = spanne();
    const base = art() === "einstufung"
      ? t("kt.t.defaultTitleE", "Einstufungstest {von}–{bis}", { von: span[0], bis: span[span.length - 1] })
      : t("kt.t.defaultTitle", "Grammatiktest {niveau}", { niveau: levelSel.value });
    return base + (lang() ? ` · ${t("kt.t.ausfuehrlich", "ausführlich")}` : "") + (stufeSel.value === "mittel" ? "" : ` · ${STUFE_TEXT[stufeSel.value]()}`);
  };
  /** Shows the fields of the chosen kind of test. */
  function syncArt() {
    for (const el of form.querySelectorAll("[data-only]")) el.hidden = el.dataset.only === "lang" ? !lang() : el.dataset.only !== art();
    $("[data-schreib-field]").hidden = !teile().includes("schreiben");
  }
  function syncTitle() {
    if (!titelByHand) nameIn.value = defaultTitle();
  }
  nameIn.addEventListener("input", () => { titelByHand = true; });
  levelSel.addEventListener("change", () => { syncTitle(); drawTopics(); draw(); });
  countSel.addEventListener("change", draw);
  for (const sel of [vonSel, bisSel]) sel.addEventListener("change", () => { syncTitle(); draw(); });
  proSel.addEventListener("change", draw);
  for (const r of form.querySelectorAll("[name=art]")) r.addEventListener("change", () => { syncArt(); syncTitle(); draw(); });
  stufeSel.addEventListener("change", () => { syncTitle(); draw(); });
  for (const r of form.querySelectorAll("[name=umfang], [name=teil]")) r.addEventListener("change", () => { syncArt(); syncTitle(); draw(); });
  schreibSel.addEventListener("change", draw);
  // The writing task follows the range: the one at the second-highest level, so it stretches
  // the class without being out of reach.
  function syncSchreib() {
    const span = spanne();
    const want = span[Math.max(0, span.length - 2)];
    const task = fk.schreiben.find((x) => x.level === want) ?? fk.schreiben[0];
    if (task) schreibSel.value = task.id;
  }
  for (const sel of [vonSel, bisSel]) sel.addEventListener("change", () => { syncSchreib(); draw(); });
  $("[data-topics-list]").addEventListener("change", (e) => {
    picked.set(e.target.value, e.target.checked);
    drawTopics();
    draw();
  });
  $("[data-reshuffle]").addEventListener("click", draw);
  $("[data-preview-list]").addEventListener("click", (e) => {
    const drop = e.target.closest("[data-drop]");
    const edit = e.target.closest("[data-edit]");
    const done = e.target.closest("[data-done]");
    if (drop) fragen.splice(+drop.dataset.drop, 1);
    else if (edit) fragen[+edit.dataset.edit].open = true;
    else if (done) {
      const f = fragen[+done.dataset.done];
      const msg = problem(f);
      if (msg) { done.closest("li").querySelector("[data-ed-error]").textContent = msg; return; }
      f.open = false;
    } else return;
    drawPreview();
    if (edit) $(`[data-ed="${edit.dataset.edit}"] textarea`)?.focus();
  });
  // Typing changes the question in place; the list is drawn again only on „Fertig“.
  $("[data-preview-list]").addEventListener("input", (e) => {
    const li = e.target.closest("[data-ed]");
    if (!li) return;
    const f = fragen[+li.dataset.ed];
    const v = clean(e.target.value);
    const wrong = f.o.slice(1);
    if (e.target.dataset.f === "q") f.q = v;
    else if (e.target.dataset.f === "h") f.h = v;
    else if (e.target.dataset.f === "right") f.a = [v];
    else if (e.target.dataset.f === "wrong") wrong[+e.target.dataset.j] = v;
    f.o = [f.a[0], ...wrong];
    f.edited = true;
  });
  $("[data-add]").addEventListener("click", () => {
    const k = optionCount();
    fragen.push({
      id: `eigen/${Date.now().toString(36)}`, t: "eigen", tn: t("kt.t.own", "Eigene Frage"), eigen: true, open: true,
      q: "", h: "", x: "", a: [""], o: Array.from({ length: k }, () => ""),
    });
    $(".kt-preview").open = true;
    drawPreview();
    $(`[data-ed="${fragen.length - 1}"] textarea`)?.focus();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const error = $("[data-new-error]");
    error.textContent = "";
    if (art() === "thema" && !chosenTopics().length && !fragen.some((f) => f.eigen)) {
      error.textContent = t("kt.t.err.topics", "Wähle mindestens ein Thema aus.");
      return;
    }
    if (lang() && !teile().length) {
      error.textContent = t("kt.t.err.teile", "Wähle mindestens einen Teil aus.");
      return;
    }
    if (!fragen.length) {
      error.textContent = t("kt.t.err.empty", "Der Test hat keine Fragen mehr. Tippe auf „Neu mischen“.");
      return;
    }
    const bad = fragen.findIndex((f) => (f.edited || f.eigen) && problem(f));
    if (bad >= 0) {
      fragen[bad].open = true;
      $(".kt-preview").open = true;
      drawPreview();
      error.textContent = t("kt.t.err.question", "Frage {n}: {msg}", { n: bad + 1, msg: problem(fragen[bad]) });
      return;
    }
    const btn = $("[data-new-submit]");
    btn.disabled = true;
    try {
      const k = await testAnlegen({
        titel: nameIn.value.trim() || defaultTitle(),
        niveau: art() === "thema" ? levelSel.value : null,
        art: art(),
        fragen: fragen.map(({ id, t: tid, tn, l, q, h, x, o, a, teil, ref, typ }) => ({ id, t: tid, tn, l, q, h, x, o, a, teil, ref, typ })),
        material: materialOf(fragen),
      });
      location.href = withBase(`/teachers/tests/result?id=${k.id}&neu=1`);
    } catch (err) {
      btn.disabled = false;
      if (err?.code === "limit") error.textContent = t("kt.t.err.limit", "Du hast schon {n} Tests. Lösch einen alten, dann geht es wieder.", { n: MAX_TESTS });
      else { console.error(err); error.textContent = t(...GENERIC); }
    }
  });

  /** The texts, clips and task the questions refer to, for the phone. No Hörtext script. */
  function materialOf(list) {
    const m = {};
    for (const f of list) {
      if (!f.teil) continue;
      const src = fk[f.teil].find((x) => x.id === f.ref);
      if (!src) continue;
      m[f.teil] ??= {};
      m[f.teil][f.ref] = f.teil === "lesen" ? { title: src.title, text: src.text }
        : f.teil === "hoeren" ? { title: src.title, src: src.src }
        : { title: src.title, situation: src.situation, source: src.source, points: src.points };
    }
    return m;
  }

  syncSchreib();
  syncArt();
  syncTitle();
  drawTopics();
  draw();
  mounted = true;
  await load();
}
