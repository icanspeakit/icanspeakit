// /teachers/surveys — the teacher's polls and the form for a new one. Data goes through
// daten.js, the questions come from katalog.js. A new poll opens straight on its results
// page, which shows the QR code big for the projector.
import { currentUser, isTeacher, setTeacher } from "../liveQuiz/custom.js";
import { loadText, t } from "../liveQuiz/text.js";
import { setWaiting } from "../notReady.js";
import { MAX_EIGENE, MAX_GRAMMATIK, MAX_OPTIONEN, buildFragen, niveauDavor } from "./katalog.js";
import { MAX_UMFRAGEN, meineUmfragen, umfrageAnlegen, umfrageLoeschen, umfrageOffen } from "./daten.js";
import { MIN_SEK, ZEITEN, empfehlung, verteilung } from "./zeit.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const datum = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const GENERIC = ["kl.t.err.generic", "Das hat gerade nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal."];

export async function mountUmfragen(root) {
  const $ = (s) => root.querySelector(s);
  const gates = [...root.querySelectorAll("[data-gate]")];
  const gate = (name) => gates.forEach((g) => (g.hidden = g.dataset.gate !== name));
  const topics = JSON.parse(root.dataset.topics || "[]");
  let mounted = false;
  await loadText(() => { if (mounted) { render(); drawTopics(); drawOwn(); drawZeit(); } });

  /* -------------------------------------------------------------- who ---- */
  $("[data-signin-link]").href = `/anmelden?next=${encodeURIComponent(location.pathname)}`;
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
  mounted = true;

  /* ------------------------------------------------------------ list ---- */
  let umfragen = [];
  const status = (msg) => { $("[data-status]").textContent = msg; };

  function card(u) {
    const n = u.antworten;
    return `
      <li class="lq-card kl-class uf-item" data-id="${u.id}">
        <div class="kl-class-head">
          <h3><a href="/teachers/surveys/result?id=${u.id}">${esc(u.titel)}</a></h3>
          ${u.niveau ? `<span class="kl-badge">${esc(u.niveau)}</span>` : ""}
          <span class="uf-state ${u.offen ? "is-open" : ""}">${esc(u.offen ? t("uf.t.open", "offen") : t("uf.t.closed", "geschlossen"))}</span>
          <span class="kl-count">${esc(n === 1 ? t("uf.t.one", "1 Antwort") : t("uf.t.count", "{n} Antworten", { n }))}</span>
        </div>
        <p class="kl-muted">${esc(datum(u.created_at))} · ${esc(t("kl.t.code", "Code"))} <span class="uf-code-sm">${esc(u.code)}</span> · ${esc(t("uf.t.questions", "{n} Fragen", { n: u.fragen?.length ?? 0 }))}${u.zeit ? ` · ⏱ ${esc(t("uf.t.zeit.short", "{n} Min.", { n: u.zeit }))}` : ""}</p>
        <div class="kl-row">
          <a class="lq-btn lq-btn--primary" href="/teachers/surveys/result?id=${u.id}">${esc(t("uf.t.results", "Ergebnisse und QR-Code"))}</a>
          <button type="button" class="lq-btn lq-btn--ghost" data-act="toggle">${esc(u.offen ? t("uf.t.close", "Schließen") : t("uf.t.reopen", "Wieder öffnen"))}</button>
          <button type="button" class="lq-btn lq-btn--quiet" data-act="delete">${esc(t("uf.t.delete", "Löschen"))}</button>
        </div>
      </li>`;
  }

  function render() {
    $("[data-list]").innerHTML = umfragen.map(card).join("");
    $("[data-new-head]").textContent = umfragen.length ? t("uf.t.new.another", "Neue Umfrage") : t("uf.t.new.title", "Neue Umfrage");
  }

  async function load() {
    try {
      umfragen = await meineUmfragen();
    } catch (err) {
      console.error(err);
      status(t("uf.t.err.load", "Deine Umfragen konnten nicht geladen werden."));
    }
    render();
  }

  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    const li = btn?.closest("[data-id]");
    if (!btn || !li) return;
    const u = umfragen.find((x) => x.id === li.dataset.id);
    if (!u) return;
    status("");
    btn.disabled = true;
    try {
      if (btn.dataset.act === "toggle") {
        await umfrageOffen(u.id, !u.offen);
        u.offen = !u.offen;
        status(u.offen ? t("uf.t.reopened", "„{name}“ nimmt wieder Antworten an.", { name: u.titel }) : t("uf.t.closedDone", "„{name}“ ist geschlossen. Die Ergebnisse bleiben.", { name: u.titel }));
      } else if (btn.dataset.act === "delete") {
        if (!confirm(t("uf.t.confirm.delete", "„{name}“ mit allen Antworten endgültig löschen?", { name: u.titel }))) return;
        await umfrageLoeschen(u.id);
        umfragen = umfragen.filter((x) => x !== u);
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
  // Time to answer: none (the default) or minutes for the whole poll, which each question
  // gets its share of (zeit.js). The questions ticked so far give the recommendation.
  const zeitSel = $("[data-new-zeit]");
  function drawZeit() {
    const was = zeitSel.value;
    const fragen = currentFragen();
    const niveau = levelSel.value;
    const rec = fragen.length ? empfehlung(fragen, niveau) : null;
    zeitSel.innerHTML = `<option value="">${esc(t("uf.t.zeit.none", "Ohne Zeitlimit"))}</option>`
      + ZEITEN.map((n) => `<option value="${n}">${esc(n === rec ? t("uf.t.zeit.rec", "{n} Minuten (empfohlen)", { n }) : t("uf.t.zeit.min", "{n} Minuten", { n }))}</option>`).join("");
    zeitSel.value = was;
    const box = $("[data-zeit-rec]");
    box.hidden = !rec;
    if (!rec) return;
    const chosen = Number(zeitSel.value) || 0;
    const range = (m) => {
      const s = verteilung(fragen, niveau, m);
      return { a: Math.min(...s), b: Math.max(...s) };
    };
    let text;
    if (!chosen || chosen === rec) {
      text = t("uf.t.zeit.recHint", "Empfohlen für {niveau}: {m} Minuten. Bei {n} Fragen sind das je nach Länge {a} bis {b} Sekunden pro Frage.", { niveau, m: rec, n: fragen.length, ...range(rec) });
    } else {
      const r = range(chosen);
      text = chosen < rec && r.a <= MIN_SEK + 4
        ? t("uf.t.zeit.tight", "Knapp für {niveau}: Manche Fragen bekommen nur {a} Sekunden. Empfohlen sind {m} Minuten.", { niveau, m: rec, ...r })
        : t("uf.t.zeit.split", "Mit {c} Minuten: {a} bis {b} Sekunden pro Frage. Empfohlen für {niveau}: {m} Minuten.", { c: chosen, niveau, m: rec, ...r });
    }
    $("[data-zeit-rec-text]").textContent = text;
    $("[data-zeit-use]").hidden = chosen === rec;
    $("[data-zeit-use]").dataset.min = rec;
  }
  $("[data-zeit-use]").addEventListener("click", (e) => {
    zeitSel.value = e.currentTarget.dataset.min;
    drawZeit();
  });
  const blocks = () => [...form.querySelectorAll("[name=block]:checked")].map((i) => i.value);
  // Grammar topics the teacher switched on or off by hand, so a change of level keeps them.
  const picked = new Map(); // topic id → boolean

  const topicOn = (tp, niveau) => picked.get(tp.id) ?? tp.level === niveau;
  function shownTopics() {
    const niveau = levelSel.value;
    const prev = niveauDavor(niveau);
    // The class's own level first, the level below after it.
    return [...topics.filter((tp) => tp.level === niveau), ...topics.filter((tp) => tp.level === prev)];
  }
  function drawTopics() {
    const box = $("[data-topics-box]");
    box.hidden = !blocks().includes("grammatik");
    const niveau = levelSel.value;
    const list = shownTopics();
    const on = list.filter((tp) => topicOn(tp, niveau)).length;
    const prev = niveauDavor(niveau);
    $("[data-topics-note]").textContent = t("uf.t.topics.note", "{n} ausgewählt, höchstens {max}. Tippe ein Thema an, um es dazuzunehmen oder herauszunehmen.", { n: on, max: MAX_GRAMMATIK })
      + (prev ? " " + t("uf.t.topics.prev", "Themen aus {prev} stehen zum Wiederholen mit dabei.", { prev }) : "");
    $("[data-topics-list]").innerHTML = list
      .map((tp) => `<label class="uf-chip"><input type="checkbox" value="${esc(tp.id)}" ${topicOn(tp, niveau) ? "checked" : ""} /><span><small>${esc(tp.level)}</small> ${esc(tp.name)}</span></label>`)
      .join("");
  }
  levelSel.addEventListener("change", drawTopics);
  // Any change to the questions or the level moves the recommendation; after the handlers
  // below have redrawn the topics and own questions.
  form.addEventListener("change", () => queueMicrotask(drawZeit));
  form.addEventListener("input", () => queueMicrotask(drawZeit));
  form.addEventListener("change", (e) => {
    if (e.target.name === "block") drawTopics();
    else if (e.target.closest("[data-topics-list]")) {
      picked.set(e.target.value, e.target.checked);
      drawTopics();
    }
  });

  // Own questions: up to five, each a text, a type and (for a choice) one option per line.
  let eigene = [];
  const typLabel = (typ) => ({
    single: t("uf.t.own.single", "Eine Antwort"),
    multi: t("uf.t.own.multi", "Mehrere Antworten"),
    text: t("uf.t.own.text", "Freier Text"),
  })[typ];
  function drawOwn() {
    $("[data-own]").innerHTML = eigene
      .map((e, i) => `
        <fieldset class="uf-own-q" data-own-i="${i}">
          <legend>${esc(t("uf.t.own.n", "Eigene Frage {n}", { n: i + 1 }))}</legend>
          <label class="lq-field"><span>${esc(t("uf.t.own.q", "Frage"))}</span>
            <input type="text" maxlength="200" data-f="frage" value="${esc(e.frage)}" placeholder="${esc(t("uf.t.own.qPh", "z. B. Sollen wir einen Ausflug machen?"))}" /></label>
          <label class="lq-field"><span>${esc(t("uf.t.own.type", "Antwort"))}</span>
            <select data-f="typ">${["single", "multi", "text"].map((x) => `<option value="${x}" ${x === e.typ ? "selected" : ""}>${esc(typLabel(x))}</option>`).join("")}</select></label>
          <label class="lq-field" ${e.typ === "text" ? "hidden" : ""}><span>${esc(t("uf.t.own.options", "Antworten zur Auswahl, eine pro Zeile (2 bis {max})", { max: MAX_OPTIONEN }))}</span>
            <textarea rows="4" data-f="optionen">${esc(e.optionen.join("\n"))}</textarea></label>
          <button type="button" class="qb-link" data-own-remove>${esc(t("uf.t.own.remove", "Frage entfernen"))}</button>
        </fieldset>`)
      .join("");
    const add = $("[data-own-add]");
    setWaiting(add, eigene.length >= MAX_EIGENE ? t("uf.t.own.max", "Höchstens {n} eigene Fragen.", { n: MAX_EIGENE }) : null);
  }
  $("[data-own-add]").addEventListener("click", (e) => {
    if (e.currentTarget.getAttribute("aria-disabled") === "true") return;
    eigene.push({ frage: "", typ: "single", optionen: [] });
    drawOwn();
    $(`[data-own-i="${eigene.length - 1}"] input`)?.focus();
  });
  $("[data-own]").addEventListener("input", (e) => {
    const fs = e.target.closest("[data-own-i]");
    if (!fs) return;
    const q = eigene[+fs.dataset.ownI];
    const f = e.target.dataset.f;
    if (f === "optionen") q.optionen = e.target.value.split("\n");
    else q[f] = e.target.value;
    if (f === "typ") drawOwn();
  });
  $("[data-own]").addEventListener("click", (e) => {
    if (!e.target.closest("[data-own-remove]")) return;
    eigene.splice(+e.target.closest("[data-own-i]").dataset.ownI, 1);
    drawOwn();
    drawZeit();
  });

  /** The questions the form would make right now. */
  function currentFragen() {
    const niveau = levelSel.value;
    const grammatik = shownTopics().filter((tp) => topicOn(tp, niveau));
    return buildFragen({ bloecke: blocks(), grammatik, eigene });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const error = $("[data-new-error]");
    error.textContent = "";
    const niveau = levelSel.value;
    const grammatik = shownTopics().filter((tp) => topicOn(tp, niveau));
    if (blocks().includes("grammatik") && grammatik.length > MAX_GRAMMATIK) {
      error.textContent = t("uf.t.err.topics", "Höchstens {max} Grammatikthemen, sonst wird die Liste auf dem Handy zu lang.", { max: MAX_GRAMMATIK });
      return;
    }
    const halbe = eigene.findIndex((q) => q.frage.trim() && q.typ !== "text" && q.optionen.filter((x) => x.trim()).length < 2);
    if (halbe >= 0) {
      error.textContent = t("uf.t.err.options", "Eigene Frage {n}: Gib mindestens zwei Antworten zur Auswahl an, oder wähle „Freier Text“.", { n: halbe + 1 });
      return;
    }
    const fragen = buildFragen({ bloecke: blocks(), grammatik, eigene });
    if (!fragen.length) {
      error.textContent = t("uf.t.err.empty", "Wähle mindestens einen Teil aus oder schreib eine eigene Frage.");
      return;
    }
    const btn = $("[data-new-submit]");
    btn.disabled = true;
    try {
      const u = await umfrageAnlegen({ titel: $("[data-new-name]").value.trim() || t("uf.t.defaultTitle", "Was möchtest du lernen?"), niveau, fragen, zeit: Number(zeitSel.value) || null });
      location.href = `/teachers/surveys/result?id=${u.id}&neu=1`;
    } catch (err) {
      btn.disabled = false;
      if (err?.code === "limit") error.textContent = t("uf.t.err.limit", "Du hast schon {n} Umfragen. Lösch eine alte, dann geht es wieder.", { n: MAX_UMFRAGEN });
      else { console.error(err); error.textContent = t(...GENERIC); }
    }
  });

  drawTopics();
  drawOwn();
  drawZeit();
  await load();
}
