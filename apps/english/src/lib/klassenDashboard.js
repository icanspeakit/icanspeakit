// /teachers/classes/class?id=… — the teacher dashboard (KLASSEN-TIERED-PROMPT.md, Tier 3).
// Loads the class, its members and their attempts of the last four weeks, then draws three
// views from them: Übersicht, Themen, and one student's attempts. The numbers come from
// ./klassenAuswertung.js; this file only draws, sorts and exports.
//
// Render time is measured as performance.measure("klasse-dashboard") from the first
// request to the drawn overview (the Tier 3 budget is 1 s for 25 students × 4 weeks).
import { currentUser } from "./liveQuiz/custom.js";
import { loadText, t } from "./liveQuiz/text.js";
import { aufgabeLoeschen, aufgabenDerKlasse, aufgabeStellen, meineKlasse, mitglieder, versucheDerKlasse } from "./klassen.js";
import { aufgabenStatus, berlinDatum, berlinTag, berlinTagesende } from "./aufgabenStatus.js";
import { csv, hinweisText, kindLabel, refLabel, rowsByMember, stufe, themen, uebersicht } from "./klassenAuswertung.js";
import { enhanceSwitch } from "./segSwitch.js";
import { keyFromRef, stundeRef, stundenStand } from "./unterricht/lernen.js";
import { keyOf } from "./unterricht/speichern.js";
import { track } from "./track.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const WINDOW_DAYS = 28;
const DAY = 86_400_000;

export async function mountKlassenDashboard(root, names) {
  const $ = (s) => root.querySelector(s);
  const gates = [...root.querySelectorAll("[data-gate]")];
  const gate = (name) => gates.forEach((g) => (g.hidden = g.dataset.gate !== name));
  let ready = false;
  await loadText(() => { if (ready) renderAll(); });

  const id = new URLSearchParams(location.search).get("id");
  $("[data-signin-link]").href = `/anmelden?next=${encodeURIComponent(location.pathname + location.search)}`;
  const user = await currentUser();
  if (!user) return gate("signin");

  performance.mark("klasse-dashboard-start");
  let klasse, members, rows, tasks;
  try {
    // In parallel: for an id that isn't this teacher's, RLS returns nothing anyway.
    [klasse, members, tasks] = await Promise.all([meineKlasse(id), mitglieder(id), aufgabenDerKlasse(id)]);
    if (!klasse) return gate("notfound");
    // Four weeks for the views, or back to the oldest task if that is older: a task's
    // status needs every attempt since it was set.
    const since = Math.min(Date.now() - WINDOW_DAYS * DAY, ...tasks.map((x) => Date.parse(x.created_at)));
    rows = await versucheDerKlasse(members.map((m) => m.user_id), new Date(since));
  } catch (err) {
    console.error(err);
    return gate("error");
  }

  /* ------------------------------------------------------------ data ---- */
  const now = Date.now();
  const byMemberAll = rowsByMember(members, rows); // everything loaded, for task status
  const windowFrom = now - WINDOW_DAYS * DAY;
  const byMember = new Map([...byMemberAll].map(([k, list]) => [k, list.filter((r) => Date.parse(r.beendet_at) >= windowFrom)]));
  const overview = uebersicht(members, byMember, now);
  const heat = themen(members, byMember);
  const hasLive = overview.some((o) => o.live != null);
  const nameOf = new Map(members.map((m) => [m.user_id, m.anzeigename]));

  const state = { tab: "uebersicht", sort: "zuletzt", dir: -1, detail: null };
  const status = (msg) => { $("[data-status]").textContent = msg; };

  /* --------------------------------------------------------- helpers ---- */
  const pct = (x) => (x == null ? "–" : `${Math.round(x * 100)} %`);
  const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "numeric" });
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  function relDay(iso) {
    if (!iso) return t("kl.d.never", "nicht in 4 Wochen");
    // Calendar days in the teacher's time zone, not 24-hour blocks.
    const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / DAY);
    if (days <= 0) return t("kl.d.today", "heute");
    if (days === 1) return t("kl.d.yesterday", "gestern");
    return t("kl.d.daysAgo", "vor {n} Tagen", { n: days });
  }
  const minutes = (n) => t("kl.d.min", "{n} Min.", { n });
  const TRUST = {
    client: () => t("kl.d.trust.client", "selbst gemeldet"),
    server: () => t("kl.d.trust.server", "serverbewertet"),
    live: () => t("kl.d.trust.live", "live im Raum"),
  };

  /* -------------------------------------------------------- overview ---- */
  const COLS = [
    { key: "name", label: () => t("kl.d.col.name", "Name"), cmp: (a, b) => a.name.localeCompare(b.name, "de") },
    { key: "zuletzt", label: () => t("kl.d.col.last", "Zuletzt aktiv"), cmp: (a, b) => (Date.parse(a.zuletzt ?? 0) || 0) - (Date.parse(b.zuletzt ?? 0) || 0) },
    { key: "saetze", label: () => t("kl.d.col.sets", "Übungen"), num: true, cmp: (a, b) => a.saetze - b.saetze },
    { key: "minuten", label: () => t("kl.d.col.minutes", "Minuten"), num: true, cmp: (a, b) => a.minuten - b.minuten },
    { key: "median", label: () => t("kl.d.col.median", "Median richtig"), sub: () => TRUST.client(), num: true, cmp: (a, b) => (a.median ?? -1) - (b.median ?? -1) },
    ...(hasLive ? [{ key: "live", label: () => t("kl.d.col.live", "Klassen-Check"), sub: () => TRUST.live(), num: true, cmp: (a, b) => (a.live ?? -1) - (b.live ?? -1) }] : []),
  ];

  function cellOf(o, key) {
    switch (key) {
      case "name": return `<button type="button" class="kld-name" data-student="${o.user_id}">${esc(o.name)}</button>`;
      case "zuletzt": return esc(relDay(o.zuletzt));
      case "saetze": return String(o.saetze);
      case "minuten": return String(o.minuten);
      case "median": return pct(o.median);
      case "live": return pct(o.live);
    }
  }
  const textOf = (o, key) => (key === "name" ? o.name : key === "zuletzt" ? (o.zuletzt ? new Date(o.zuletzt).toLocaleString("en-GB") : "") : key === "median" || key === "live" ? (o[key] == null ? "" : Math.round(o[key] * 100)) : o[key]);

  function sorted() {
    const col = COLS.find((c) => c.key === state.sort) ?? COLS[1];
    const list = [...overview].sort((a, b) => col.cmp(a, b) * state.dir || a.name.localeCompare(b.name, "de"));
    // Students who have not practised for a week lead the table, as their own quiet group.
    return [...list.filter((o) => o.inaktiv), ...list.filter((o) => !o.inaktiv)];
  }

  function renderOverview() {
    const el = $("[data-kld-overview]");
    if (!overview.length) {
      el.innerHTML = `<p class="kl-muted">${esc(t("kl.d.noMembers", "Noch niemand in der Klasse. Den Code findest du unter „Meine Klassen“."))}</p>`;
      return;
    }
    const list = sorted();
    const inactive = list.filter((o) => o.inaktiv).length;
    const head = COLS.map((c) => {
      const on = state.sort === c.key;
      const aria = on ? (state.dir > 0 ? "ascending" : "descending") : "none";
      return `<th scope="col" aria-sort="${aria}" class="${c.num ? "kld-num" : ""}">
        <button type="button" data-sort="${c.key}">${esc(c.label())}${on ? (state.dir > 0 ? " ▲" : " ▼") : ""}</button>
        ${c.sub ? `<small>${esc(c.sub())}</small>` : ""}</th>`;
    }).join("");
    const row = (o) => `<tr class="${o.inaktiv ? "kld-quiet" : ""}">${COLS.map((c) =>
      c.key === "name" ? `<th scope="row">${cellOf(o, c.key)}</th>` : `<td class="${c.num ? "kld-num" : ""}">${cellOf(o, c.key)}</td>`).join("")}</tr>`;
    const group = (label) => `<tr class="kld-group"><th colspan="${COLS.length}" scope="rowgroup">${esc(label)}</th></tr>`;
    el.innerHTML = `
      <table class="kld-table">
        <thead><tr>${head}</tr></thead>
        <tbody>
          ${inactive ? group(t("kl.d.group.quiet", "Länger nicht geübt ({n})", { n: inactive })) : ""}
          ${list.slice(0, inactive).map(row).join("")}
          ${inactive && inactive < list.length ? group(t("kl.d.group.active", "In den letzten 7 Tagen geübt ({n})", { n: list.length - inactive })) : ""}
          ${list.slice(inactive).map(row).join("")}
        </tbody>
      </table>`;
  }

  /* ---------------------------------------------------------- topics ---- */
  function renderLegend() {
    const bins = ["0–19", "20–39", "40–59", "60–79", "80–100"];
    $("[data-kld-legend]").innerHTML = `
      ${bins.map((b, i) => `<span class="kld-key"><i class="kld-heat kld-s${i}" aria-hidden="true"></i>${b} %</span>`).join("")}
      <span class="kld-key"><i class="kld-heat kld-done" aria-hidden="true">✓</i>${esc(t("kl.d.legend.done", "geübt, ohne Bewertung"))}</span>
      <span class="kld-key"><i class="kld-heat kld-empty" aria-hidden="true"></i>${esc(t("kl.d.legend.empty", "nicht geübt"))}</span>`;
  }

  function renderTopics() {
    const el = $("[data-kld-topics]");
    if (!heat.themen.length) {
      el.innerHTML = `<p class="kl-muted">${esc(t("kl.d.noData", "In den letzten 4 Wochen hat noch niemand aus der Klasse geübt."))}</p>`;
      return;
    }
    const members_ = [...members].sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, "en"));
    const head = heat.themen.map((th) => `<th scope="col" class="kld-topic" title="${esc(th)}"><small>${esc(kindLabel(th))}</small><span>${esc(refLabel(th, names))}</span></th>`).join("");
    const body = members_.map((m) => {
      const cells = heat.zellen.get(m.user_id);
      return `<tr><th scope="row"><button type="button" class="kld-name" data-student="${m.user_id}">${esc(m.anzeigename)}</button></th>${heat.themen.map((th) => {
        const c = cells.get(th);
        const topic = refLabel(th, names);
        if (!c) return `<td class="kld-heat kld-empty" title="${esc(`${m.anzeigename} · ${topic}: ${t("kl.d.legend.empty", "nicht geübt")}`)}"></td>`;
        if (!c.gesamt) return `<td class="kld-heat kld-done" title="${esc(`${m.anzeigename} · ${topic}: ${t("kl.d.cell.done", "{n}× geübt, ohne Bewertung", { n: c.geuebt })}`)}">✓</td>`;
        const share = c.richtig / c.gesamt;
        const tip = t("kl.d.cell.tip", "{name} · {topic}: {r} von {g} richtig, {n} Übungen", { name: m.anzeigename, topic, r: c.richtig, g: c.gesamt, n: c.saetze });
        return `<td class="kld-heat kld-s${stufe(share)}" title="${esc(tip)}">${Math.round(share * 100)}</td>`;
      }).join("")}</tr>`;
    }).join("");
    el.innerHTML = `<table class="kld-table kld-heatmap"><thead><tr><th scope="col" class="kld-corner">${esc(t("kl.d.col.name", "Name"))}</th>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }

  /* --------------------------------------------------------- aufgaben ---- */
  let katalog = null; // fetched when the tab is first opened
  // Stunden (SCHUELER-STUNDE Tier 3): the members' learner Stunden for this class, and the
  // lessons taught to the end in the last 14 days (to release for absent students).
  let lern = null;
  let fertigeSitzungen = [];
  const STATUS = {
    erledigt: () => t("kl.a.st.done", "erledigt"),
    verspaetet: () => t("kl.a.st.late", "verspätet erledigt"),
    offen: () => t("kl.a.st.open", "noch offen"),
    ueberfaellig: () => t("kl.a.st.overdue", "überfällig"),
  };
  // The teacher's own card sets (Vokabeln vom Foto): option „vs-set:<id>“, stored as „vs:<share token>“.
  let mySets = [];
  const taskName = (ref) =>
    katalog?.find((e) => e.ref === ref)?.name
    ?? mySets.find((x) => `vs-set:${x.id}` === ref || (x.share_token && `vs:${x.share_token}` === ref))?.name
    ?? refLabel(ref, names);

  async function ensureKatalog() {
    if (katalog) return;
    katalog = await fetch("/klassen-katalog.json").then((r) => r.json()).catch(() => []);
    const sel = $("[data-task-ref]");
    const groups = new Map();
    for (const e of katalog) groups.set(e.group, [...(groups.get(e.group) ?? []), e]);
    try {
      mySets = await (await import("./vokabelFoto/sets.js")).listSets();
    } catch { mySets = []; }
    // Card set columns in the overview read as the set's name, not its token.
    if (names) for (const x of mySets) if (x.share_token) names[`vs:${x.share_token}`] = x.name;
    if (mySets.length) {
      sel.insertAdjacentHTML("beforeend", `<optgroup label="${esc(t("kl.a.mySets", "Meine Kartensets"))}">${mySets.map((x) => `<option value="vs-set:${esc(x.id)}">${esc(x.name)}</option>`).join("")}</optgroup>`);
    }
    sel.insertAdjacentHTML("beforeend", [...groups].map(([g, list]) =>
      `<optgroup label="${esc(g)}">${list.map((e) => `<option value="${esc(e.ref)}">${esc(e.name)}</option>`).join("")}</optgroup>`).join(""));
    try {
      const [{ lernstundenDerKlasse }, { beendeteSitzungen }] = await Promise.all([import("./unterricht/lernServer.js"), import("./unterricht/sitzung.js")]);
      [lern, fertigeSitzungen] = await Promise.all([lernstundenDerKlasse(klasse.id), beendeteSitzungen(klasse.id, new Date(Date.now() - 14 * DAY))]);
    } catch (err) {
      console.error(err);
      lern = [];
      fertigeSitzungen = [];
    }
    renderTasks();
    renderNachholen();
    // Default due date: one week from today (Berlin), the usual homework rhythm.
    const due = $("[data-task-due]");
    if (!due.value) due.value = berlinTag(new Date(Date.now() + 7 * DAY).toISOString());
    due.min = berlinTag(new Date().toISOString());
    renderTasks();
  }

  function taskStatuses(task) {
    const n = Date.now();
    return members.map((m) => ({ m, st: aufgabenStatus(task, byMemberAll.get(m.user_id) ?? [], n) }));
  }

  function renderTasks() {
    const el = $("[data-kld-tasks]");
    if (!tasks.length) {
      el.innerHTML = `<li class="kl-muted">${esc(t("kl.a.none", "Noch keine Aufgaben. Stell oben die erste."))}</li>`;
      return;
    }
    // Upcoming first, then the past ones, newest first.
    const n = Date.now();
    const list = [...tasks.filter((x) => Date.parse(x.faellig_at) >= n), ...tasks.filter((x) => Date.parse(x.faellig_at) < n).reverse()];
    el.innerHTML = list.map((task) => {
      const sts = taskStatuses(task);
      const count = (s) => sts.filter((x) => x.st.status === s).length;
      const groups = ["ueberfaellig", "offen", "verspaetet", "erledigt"].filter((s) => count(s));
      const summary = groups.map((s) => `<span class="kld-tchip kld-tchip--${s}">${count(s)} ${esc(STATUS[s]())}</span>`).join("");
      const who = groups.map((s) => `<p><b>${esc(STATUS[s]())}:</b> ${sts.filter((x) => x.st.status === s).map((x) => esc(x.m.anzeigename)).join(", ")}</p>`).join("");
      const meta = [t("kl.a.dueBy", "bis {date}", { date: berlinDatum(task.faellig_at) }), task.min_richtig_prozent ? t("kl.a.min", "mind. {n} % richtig", { n: task.min_richtig_prozent }) : ""].filter(Boolean).join(" · ");
      return `<li class="lq-card kld-task" data-task="${task.id}">
        <div class="kld-task-head">
          <div><b>${esc(task.titel)}</b><small>${esc(taskName(task.uebung_ref))} · ${esc(meta)}</small></div>
          <button type="button" class="lq-btn lq-btn--quiet" data-task-delete>${esc(t("kl.a.delete", "Löschen"))}</button>
        </div>
        <div class="kld-tchips">${summary || `<span class="kl-muted">${esc(t("kl.d.noMembers", "Noch niemand in der Klasse."))}</span>`}</div>
        ${who ? `<details class="kld-task-who"><summary>${esc(t("kl.a.who", "Wer?"))}</summary>${who}</details>` : ""}
        ${task.uebung_ref.startsWith("st:") ? stundeTable(task) : ""}
      </li>`;
    }).join("");
  }

  /* A Stunde as an Aufgabe: one table, per person how far they got and per step fertig /
     übersprungen / offen, with right/answered in the step. Self-reported, like everything
     the browser counts (lernstunden.fortschritt). */
  function stundeTable(task) {
    const key = keyFromRef(task.uebung_ref);
    if (!key || !lern) return "";
    const { steps, people } = stundenStand(lern, members, key);
    const summary = `<summary>${esc(t("kl.st.stand", "Stand pro Person"))}</summary>`;
    if (!steps.length) return `<details class="kld-task-who kld-st">${summary}<p class="kl-muted">${esc(t("kl.st.none", "Noch niemand hat die Stunde begonnen."))}</p></details>`;
    const cell = (c) => {
      const score = c.answered ? ` <small>${c.right}/${c.answered}</small>` : "";
      if (c.status === "fertig") return `<td class="kld-st-ok">✓${score}</td>`;
      if (c.status === "uebersprungen") return `<td class="kld-st-skip">${esc(t("kl.st.skipped", "übersprungen"))}${score}</td>`;
      return `<td class="kld-st-open">${score || "–"}</td>`;
    };
    const stand = (p) => (p.done ? t("kl.st.done", "fertig") : p.started ? t("kl.st.at", "Schritt {n} von {m}", { n: p.reached + 1, m: steps.length }) : t("kl.st.notStarted", "nicht begonnen"));
    return `<details class="kld-task-who kld-st">${summary}
      <p class="kl-muted">${esc(t("kl.st.legend", "✓ fertig · Zahl = richtig/beantwortet im Schritt"))} · <span class="kld-badge kld-badge--client">${esc(TRUST.client())}</span></p>
      <div class="kld-st-scroll"><table class="kld-table kld-st-table">
        <thead><tr><th scope="col">${esc(t("kl.d.col.name", "Name"))}</th><th scope="col">${esc(t("kl.st.col", "Stand"))}</th>${steps.map((s, i) => `<th scope="col">${i + 1}. ${esc(s.name)}</th>`).join("")}</tr></thead>
        <tbody>${people.map((p) => `<tr><th scope="row">${esc(p.name)}</th><td>${esc(stand(p))}</td>${p.cells.map(cell).join("")}</tr>`).join("")}</tbody>
      </table></div>
      <div class="kl-row"><button type="button" class="lq-btn lq-btn--quiet" data-st-print>${esc(t("kl.st.print", "Drucken"))}</button></div>
    </details>`;
  }

  /* „Für Abwesende freigeben“: a lesson taught to the end becomes an Aufgabe – the same Stunde,
     walked alone on /lesson, due in a week. An Aufgabe and not a lighter flag: students
     already see Aufgaben (/exercises, /konto), it has a due date and a done state, and the
     teacher can delete it. Whoever was there may do it too; nobody has to. */
  function renderNachholen() {
    const el = $("[data-kld-nachholen]");
    if (!el) return;
    const seen = new Set();
    const list = fertigeSitzungen.filter((s) => {
      const ref = stundeRef(keyOf(s));
      if (seen.has(ref)) return false;
      seen.add(ref);
      return true;
    });
    el.hidden = !list.length;
    if (!list.length) return;
    el.innerHTML = `<h2 class="kld-h">${esc(t("kl.st.nh.title", "Stunde verpasst? Für Abwesende freigeben"))}</h2>
      <p class="kl-muted">${esc(t("kl.st.nh.text", "Unterrichtete Stunden der letzten 14 Tage. „Freigeben“ stellt die Stunde als Aufgabe für eine Woche: Wer gefehlt hat, macht sie allein nach, Schritt für Schritt."))}</p>
      <ul class="kld-nh">${list.map((s) => {
        const ref = stundeRef(keyOf(s));
        const done = tasks.some((x) => x.uebung_ref === ref);
        return `<li><span><b>${esc(taskName(ref))}</b><small>${esc(t("kl.st.nh.taught", "unterrichtet am {date}", { date: berlinDatum(s.completed_at) }))}</small></span>
          ${done ? `<span class="kl-muted">${esc(t("kl.st.nh.released", "freigegeben"))}</span>` : `<button type="button" class="lq-btn" data-nachholen="${esc(ref)}">${esc(t("kl.st.nh.go", "Für Abwesende freigeben"))}</button>`}</li>`;
      }).join("")}</ul>`;
  }

  $("[data-kld-nachholen]")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-nachholen]");
    if (!btn) return;
    const ref = btn.dataset.nachholen;
    btn.disabled = true;
    try {
      const task = await aufgabeStellen({
        klasseId: klasse.id, ref,
        titel: t("kl.st.nh.titel", "Stunde verpasst? Nachholen: {name}", { name: taskName(ref) }),
        faelligAt: berlinTagesende(berlinTag(new Date(Date.now() + 7 * DAY).toISOString())),
      });
      tasks.push(task);
      tasks.sort((a, b) => Date.parse(a.faellig_at) - Date.parse(b.faellig_at));
      renderTasks();
      renderNachholen();
      status(t("kl.st.nh.ok", "Freigegeben. Die Klasse sieht die Stunde unter ihren Aufgaben."));
      track("klasse_stunde_nachholen");
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      status(t("kl.t.err.generic", "Das hat gerade nicht geklappt."));
    }
  });

  $("[data-kld-task-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const error = $("[data-task-error]");
    let ref = $("[data-task-ref]").value;
    const due = $("[data-task-due]").value;
    const min = $("[data-task-min]").value;
    error.textContent = "";
    if (!ref) return (error.textContent = t("kl.a.err.ref", "Wähl eine Übung."));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return (error.textContent = t("kl.a.err.due", "Wähl ein Datum."));
    if (min && !(+min >= 1 && +min <= 100)) return (error.textContent = t("kl.a.err.min", "Mindestens richtig: eine Zahl von 1 bis 100, oder leer."));
    const btn = $("[data-task-submit]");
    btn.disabled = true;
    try {
      const titel = $("[data-task-title]").value.trim() || taskName(ref);
      // A card set: students open it by its share link, so the task carries the link's token
      // (made now if the set isn't shared yet); their attempts on /card-set log the same ref.
      if (ref.startsWith("vs-set:")) {
        const set = mySets.find((x) => `vs-set:${x.id}` === ref);
        ref = `vs:${await (await import("./vokabelFoto/sets.js")).shareToken(set)}`;
        if (names) names[ref] = set.name;
      }
      const task = await aufgabeStellen({
        klasseId: klasse.id, ref,
        titel,
        faelligAt: berlinTagesende(due),
        minProzent: min ? +min : null,
      });
      tasks.push(task);
      tasks.sort((a, b) => Date.parse(a.faellig_at) - Date.parse(b.faellig_at));
      $("[data-task-title]").value = "";
      $("[data-task-min]").value = "";
      renderTasks();
      status(t("kl.a.created", "Aufgabe gestellt. Deine Klasse sieht sie unter „Übungen“ und in ihrem Konto."));
      track("klasse_aufgabe_gestellt", { kind: ref.split(":")[0] });
    } catch (err) {
      if (err?.code === "limit") error.textContent = t("kl.a.err.limit", "Diese Klasse hat schon 200 Aufgaben. Lösch alte, dann geht es wieder.");
      else { console.error(err); error.textContent = t("kl.t.err.generic", "Das hat gerade nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal."); }
    } finally {
      btn.disabled = false;
    }
  });

  $("[data-kld-tasks]").addEventListener("click", async (e) => {
    const pr = e.target.closest("[data-st-print]");
    if (pr) {
      const li = pr.closest("[data-task]");
      const table = li?.querySelector(".kld-st-table");
      const w = table && open("", "_blank");
      if (!w) return;
      const title = li.querySelector(".kld-task-head b")?.textContent ?? "";
      w.document.write(`<!doctype html><html lang="en"><meta charset="utf-8"><title>${esc(title)}</title>
        <style>body{font:13px system-ui,sans-serif;margin:24px;color:#111}h1{font-size:17px;margin:0 0 4px}p{margin:0 0 12px;color:#444}
        table{border-collapse:collapse}th,td{border:1px solid #999;padding:4px 8px;text-align:left;vertical-align:top}small{color:#555}</style>
        <h1>${esc(klasse.name)} · ${esc(title)}</h1><p>${esc(new Date().toLocaleString("en-GB"))} · ${esc(TRUST.client())}</p>${table.outerHTML}`);
      w.document.close();
      w.focus();
      w.print();
      return;
    }
    const del = e.target.closest("[data-task-delete]");
    if (!del) return;
    const li = del.closest("[data-task]");
    const task = tasks.find((x) => x.id === li.dataset.task);
    if (!task || !confirm(t("kl.a.confirmDelete", "Aufgabe „{name}“ löschen? Die Übungen deiner Klasse bleiben erhalten.", { name: task.titel }))) return;
    del.disabled = true;
    try {
      await aufgabeLoeschen(task.id);
      tasks = tasks.filter((x) => x.id !== task.id);
      renderTasks();
    } catch (err) {
      del.disabled = false;
      console.error(err);
      status(t("kl.t.err.generic", "Das hat gerade nicht geklappt."));
    }
  });

  /* ---------------------------------------------------------- detail ---- */
  function renderDetail() {
    const uid = state.detail;
    const list = byMember.get(uid) ?? [];
    $("[data-kld-detail-title]").textContent = t("kl.d.detail.title", "{name}: Übungen der letzten 4 Wochen", { name: nameOf.get(uid) ?? "" });
    $("[data-kld-detail]").innerHTML = list.length
      ? list.map((r, i) => {
          const score = r.gesamt ? `${r.richtig}/${r.gesamt} · ${pct(r.richtig / r.gesamt)}` : t("kl.d.practised", "geübt");
          const hint = hinweisText(r.hinweise, t);
          const hid = `kld-hint-${i}`;
          return `<li class="kld-attempt">
            <span class="kld-when">${esc(fmtDate(r.beendet_at))} ${esc(fmtTime(r.beendet_at))}</span>
            <span class="kld-what"><small>${esc(kindLabel(r.uebung_ref))}</small> ${esc(refLabel(r.uebung_ref, names))}</span>
            <span class="kld-score">${esc(score)}</span>
            <span class="kld-dur">${r.dauer_ms != null ? esc(minutes(Math.max(1, Math.round(r.dauer_ms / 60000)))) : ""}</span>
            <span class="kld-badge kld-badge--${esc(r.quelle)}">${esc((TRUST[r.quelle] ?? TRUST.client)())}</span>
            ${hint ? `<button type="button" class="kld-hint" aria-expanded="false" aria-controls="${hid}" title="${esc(hint)}" aria-label="${esc(t("kl.d.hint.label", "Hinweis"))}">i</button>
              <span class="kld-hint-text" id="${hid}" hidden>${esc(hint)} — ${esc(t("kl.d.hint.harmless", "kann harmlos sein"))}</span>` : ""}
          </li>`;
        }).join("")
      : `<li class="kl-muted">${esc(t("kl.d.detail.none", "Keine Übungen in den letzten 4 Wochen."))}</li>`;
  }

  /* ------------------------------------------------------- top level ---- */
  function renderHeader() {
    $("[data-kld-title]").textContent = klasse.name;
    document.title = `${klasse.name} – EnglishAcademy`;
    $("[data-kld-meta]").textContent = [klasse.niveau, t("kl.t.count", "{n} / {max} Personen", { n: members.length, max: 60 }), `${t("kl.t.code", "Code")} ${klasse.code}`, klasse.archiviert ? t("kl.d.archived", "archiviert") : ""].filter(Boolean).join(" · ");
  }

  function show(tab) {
    state.tab = tab;
    root.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== tab));
    root.querySelectorAll("[data-tab]").forEach((b) => {
      const on = b.dataset.tab === tab || (tab === "detail" && b.dataset.tab === "uebersicht");
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-selected", String(on));
    });
  }

  function renderAll() {
    renderHeader();
    renderOverview();
    renderLegend();
    renderTopics();
    if (state.detail) renderDetail();
    if (katalog) renderTasks();
  }

  /* --------------------------------------------------------- actions ---- */
  root.addEventListener("click", (e) => {
    const sortBtn = e.target.closest("[data-sort]");
    if (sortBtn) {
      const key = sortBtn.dataset.sort;
      state.dir = state.sort === key ? -state.dir : key === "name" ? 1 : -1;
      state.sort = key;
      return renderOverview();
    }
    const student = e.target.closest("[data-student]");
    if (student) {
      state.detail = student.dataset.student;
      renderDetail();
      show("detail");
      $("[data-kld-detail-title]").scrollIntoView({ block: "start" });
      return;
    }
    const hint = e.target.closest(".kld-hint");
    if (hint) {
      const text = document.getElementById(hint.getAttribute("aria-controls"));
      const open = hint.getAttribute("aria-expanded") !== "true";
      hint.setAttribute("aria-expanded", String(open));
      if (text) text.hidden = !open;
    }
  });
  root.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
    show(b.dataset.tab);
    if (b.dataset.tab === "aufgaben") ensureKatalog();
  }));
  $("[data-kld-detail-back]").addEventListener("click", () => show("uebersicht"));
  $("[data-kld-export]").addEventListener("click", exportCsv);

  function exportCsv() {
    let header, data, part;
    if (state.tab === "aufgaben") {
      part = "aufgaben";
      header = [t("kl.a.form.title2", "Titel für die Klasse"), t("kl.a.form.ref", "Übung"), t("kl.a.form.due", "Fällig am"), t("kl.d.col.name", "Name"), "Status", t("kl.a.csv.doneAt", "Erledigt am")];
      data = tasks.flatMap((task) => taskStatuses(task).map(({ m, st }) => [
        task.titel, taskName(task.uebung_ref), berlinTag(task.faellig_at), m.anzeigename, STATUS[st.status](), st.am ? new Date(st.am).toLocaleString("en-GB") : "",
      ]));
    } else if (state.tab === "themen") {
      part = "themen";
      header = [t("kl.d.col.name", "Name"), ...heat.themen.map((th) => `${kindLabel(th)}: ${refLabel(th, names)}`)];
      data = [...members].sort((a, b) => a.anzeigename.localeCompare(b.anzeigename, "en")).map((m) => [
        m.anzeigename,
        ...heat.themen.map((th) => {
          const c = heat.zellen.get(m.user_id).get(th);
          return !c ? "" : c.gesamt ? Math.round((c.richtig / c.gesamt) * 100) : "practised";
        }),
      ]);
    } else if (state.tab === "detail") {
      part = "uebungen";
      header = ["Name", "Finished", "Area", "Exercise", "Correct", "Total", "Minutes", "Source", "Notes"];
      data = (byMember.get(state.detail) ?? []).map((r) => [
        nameOf.get(r.user_id), new Date(r.beendet_at).toLocaleString("en-GB"), kindLabel(r.uebung_ref), refLabel(r.uebung_ref, names),
        r.richtig, r.gesamt, r.dauer_ms != null ? Math.round(r.dauer_ms / 60000) : "", (TRUST[r.quelle] ?? TRUST.client)(), hinweisText(r.hinweise, t),
      ]);
    } else {
      part = "uebersicht";
      header = COLS.map((c) => (c.sub ? `${c.label()} (${c.sub()}, %)` : c.label()));
      data = sorted().map((o) => COLS.map((c) => textOf(o, c.key)));
    }
    const slug = klasse.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "klasse";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv(header, data)], { type: "text/csv;charset=utf-8" }));
    a.download = `${slug}-${part}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    // No student data in analytics: only which table.
    track("klasse_export", { table: part });
  }

  gate("ok");
  ready = true;
  renderAll();
  show("uebersicht");
  enhanceSwitch($("[data-kld-tabs]"), { content: [...root.querySelectorAll("[data-panel]")] });
  performance.mark("klasse-dashboard-drawn");
  performance.measure("klasse-dashboard", "klasse-dashboard-start", "klasse-dashboard-drawn");
  track("klasse_dashboard_viewed");
}
