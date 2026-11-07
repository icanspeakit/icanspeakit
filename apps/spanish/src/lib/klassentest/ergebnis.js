// /teachers/tests/result — one test's QR code and results. The results are read again
// every few seconds while the tab is visible, so the table fills as the class hands in.
//
// The grading happened in the database (klassentest_abgeben); `korrekt` is per question, in
// the order of `fragen`. Everything here is counting: per student, per topic, per question.
// The topic cells reuse the Klassen heatmap (klassen.css .kld-*), so both read the same way.
// An Einstufungstest shows a column per level instead of per topic, and each student's level
// (niveau.js), with how the class spreads over the levels on top. The ausführliche
// Einstufung shows a level per part instead (Grammatik, Lesen, Hören, Schreiben) and the
// overall one; the written texts are read and rated here by the teacher.
import QRCode from "qrcode";
import { currentUser } from "../liveQuiz/custom.js";
import { loadText, t } from "../liveQuiz/text.js";
import { withBase, currentPath } from "../paths.js";
import { bewertungSpeichern, ergebnisLoeschen, ergebnisse, test, testLink, testOffen } from "./daten.js";
import { ORDER, SCHWELLE, einstufen, profil, stufenOf, teileOf } from "./niveau.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const REFRESH_MS = 5000;
const pct = (x, n) => (n ? Math.round((100 * x) / n) : 0);
const stufe = (share) => Math.min(4, Math.floor(share * 5));
const uhrzeit = (iso) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** The topics of a test in the order its questions have them: [{ id, name, idx: [question indices] }]. */
export function themenOf(fragen) {
  const map = new Map();
  fragen.forEach((f, i) => {
    if (f.typ === "text") return;
    if (!map.has(f.t)) map.set(f.t, { id: f.t, name: f.tn, idx: [] });
    map.get(f.t).idx.push(i);
  });
  return [...map.values()];
}

/** Per topic: { r, g } summed over all results. Per question: { r, n, wrong: Map(answer → count) }. */
export function auswerten(fragen, rows) {
  const themen = themenOf(fragen);
  const fr = fragen.map(() => ({ r: 0, n: 0, skip: 0, wrong: new Map() }));
  for (const row of rows) {
    fragen.forEach((f, i) => {
      if (f.typ === "text") return;
      const ok = row.korrekt?.[i] === true;
      const a = row.antworten?.[i];
      fr[i].n++;
      if (ok) fr[i].r++;
      else if (a == null || a === "") fr[i].skip++;
      else fr[i].wrong.set(a, (fr[i].wrong.get(a) ?? 0) + 1);
    });
  }
  const th = themen.map((tp) => {
    const r = tp.idx.reduce((s, i) => s + fr[i].r, 0);
    const g = tp.idx.reduce((s, i) => s + fr[i].n, 0);
    return { ...tp, r, g };
  });
  return { themen: th, fragen: fr };
}

export async function mountErgebnis(root) {
  const $ = (s) => root.querySelector(s);
  const gates = [...root.querySelectorAll("[data-gate]")];
  const gate = (name) => gates.forEach((g) => (g.hidden = g.dataset.gate !== name));
  const links = JSON.parse(root.dataset.links || "{}");
  const params = new URLSearchParams(location.search);
  let k = null;
  let rows = [];
  let shareOpen = params.has("neu");
  let sortBy = "name";
  await loadText(() => { if (k) render(); });

  $("[data-signin-link]").href = withBase(`/account?next=${encodeURIComponent(currentPath() + location.search)}`);
  if (!(await currentUser())) return gate("signin");
  try {
    k = await test(params.get("id"));
  } catch (err) {
    console.error(err);
  }
  if (!k) return gate("missing");
  try { rows = await ergebnisse(k.id); } catch (err) { console.error(err); }
  if (!rows.length) shareOpen = true;
  gate("ok");
  const E = k.art === "einstufung";
  const eyebrow = () => (E ? t("kt.t.eyebrow", "Für Lehrkräfte · Einstufungstest") : t("kt.t.eyebrowThema", "Für Lehrkräfte · Thementest"));
  document.title = `${k.titel} – ${eyebrow()}`;
  // The columns of the table: levels for an Einstufungstest, else topics.
  const levelCols = stufenOf(k.fragen).map((l) => ({ id: l, name: l, idx: k.fragen.map((f, i) => (f.l === l ? i : -1)).filter((i) => i >= 0) }));
  const LEVEL_ORDER = ORDER;
  // Several parts (Lesen, Hören, Schreiben next to the grammar): a level per part.
  const PARTS = E ? teileOf(k.fragen) : [];
  const LANG = PARTS.length > 1;
  const TEIL_TEXT = {
    grammatik: () => t("kt.t.teil.grammatik", "Grammatik"),
    lesen: () => t("kt.t.teil.lesen", "Lesen"),
    hoeren: () => t("kt.t.teil.hoeren", "Hören"),
    schreiben: () => t("kt.t.teil.schreiben", "Schreiben"),
  };
  const levelName = (x) => (x ? x.niveau ?? t("kt.t.below", "unter {l}", { l: x.unter ?? "A1" }) : "–");
  const profilOf = (r) => profil(k.fragen, r.korrekt, r.bewertung);
  const niveauOf = (r) => (LANG ? profilOf(r).gesamt ?? { niveau: null, unter: "A1" } : einstufen(k.fragen, r.korrekt));
  const niveauText = (r) => levelName(niveauOf(r));
  const niveauRank = (r) => LEVEL_ORDER.indexOf(niveauOf(r).niveau ?? "");
  // Model text and examiner checklist for the writing task: teacher-only, from the pool.
  let fk = { schreiben: [] };
  if (PARTS.includes("schreiben")) {
    try { fk = await (await fetch(withBase("/teachers/tests/fertigkeiten.json"))).json(); } catch (err) { console.error(err); }
  }
  const entwurf = new Map(); // student key → unsaved rating, so a refresh does not wipe it

  const link = testLink(k.code);
  const qrSvg = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  $("[data-qr]").innerHTML = qrSvg;
  $("[data-beamer-qr]").innerHTML = qrSvg;
  const shortHost = `${location.host}${withBase("/test")}`;
  $("[data-host]").textContent = shortHost;
  $("[data-beamer-host]").textContent = shortHost;
  $("[data-code]").textContent = k.code;
  $("[data-beamer-code]").textContent = k.code;

  const status = (msg) => { $("[data-status]").textContent = msg; };
  const countText = (n) => (n === 1 ? t("kt.t.one", "1 Ergebnis") : t("kt.t.count", "{n} Ergebnisse", { n }));
  const keyOf = (r) => `${r.created_at}|${r.name}`;
  let openKey = null;

  function sorted() {
    const list = [...rows];
    if (sortBy === "score") return list.sort((a, b) => b.richtig / b.gesamt - a.richtig / a.gesamt || a.name.localeCompare(b.name, "de"));
    if (sortBy === "time") return list;
    if (sortBy === "niveau") return list.sort((a, b) => niveauRank(b) - niveauRank(a) || b.richtig - a.richtig || a.name.localeCompare(b.name, "de"));
    return list.sort((a, b) => a.name.localeCompare(b.name, "de") || a.created_at.localeCompare(b.created_at));
  }

  /* ----------------------------------------------------------- render ---- */
  function render() {
    const z = auswerten(k.fragen, rows);
    $("[data-title]").textContent = k.titel;
    $("[data-eyebrow]").textContent = eyebrow();
    if (E) {
      const hint = $("[data-students-hint]");
      hint.removeAttribute("data-i18n");
      hint.textContent = t("kt.t.students.hintE", "Tippe auf einen Namen, um die Antworten zu sehen. Die Zahlen in den Spalten: Prozent richtig auf dem Niveau.");
    }
    $("[data-level]").hidden = !k.niveau;
    $("[data-level]").textContent = k.niveau ?? "";
    const st = $("[data-state]");
    st.textContent = k.offen ? t("uf.t.open", "offen") : t("uf.t.closed", "geschlossen");
    st.classList.toggle("is-open", k.offen);
    $("[data-total]").textContent = countText(rows.length);
    $("[data-beamer-count]").textContent = countText(rows.length);
    $("[data-beamer-title]").textContent = k.titel;
    $("[data-share]").hidden = !shareOpen;
    $("[data-share-toggle]").textContent = shareOpen ? t("kl.t.shareHide", "QR-Code ausblenden") : t("uf.t.shareShow", "QR-Code zeigen");
    $("[data-share-toggle]").setAttribute("aria-expanded", String(shareOpen));
    $("[data-toggle]").textContent = k.offen ? t("uf.t.close", "Schließen") : t("uf.t.reopen", "Wieder öffnen");
    const any = rows.length > 0;
    $("[data-empty]").hidden = any;
    for (const s of ["[data-summary]", "[data-students]", "[data-questions]"]) $(s).hidden = !any;
    if (!any) { $("[data-next]").hidden = true; return; }
    renderSummary(z);
    renderNext(z);
    renderStudents(z);
    renderQuestions(z);
  }

  function renderSummary(z) {
    const r = rows.reduce((s, x) => s + x.richtig, 0);
    const g = rows.reduce((s, x) => s + x.gesamt, 0);
    const shares = rows.map((x) => x.richtig / x.gesamt).sort((a, b) => a - b);
    const median = shares.length % 2 ? shares[(shares.length - 1) / 2] : (shares[shares.length / 2 - 1] + shares[shares.length / 2]) / 2;
    const tile = (num, label) => `<div class="lq-card kt-tile"><strong>${esc(num)}</strong><span>${esc(label)}</span></div>`;
    const tiles = [tile(rows.length, rows.length === 1 ? t("kt.t.sum.one", "hat abgegeben") : t("kt.t.sum.n", "haben abgegeben"))];
    if (E) {
      // How many students on each level, lowest first; „unter A1“ leads when it occurs.
      const counts = new Map();
      for (const x of rows) counts.set(niveauText(x), (counts.get(niveauText(x)) ?? 0) + 1);
      const keys = [...counts.keys()].sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));
      tiles.push(`<div class="lq-card kt-tile kt-tile--wide"><span class="kt-levels">${keys.map((key) => `<b>${esc(key)}</b> ${counts.get(key)}`).join(" · ")}</span><span>${esc(t("kt.t.sum.levels", "Niveau: so viele Personen"))}</span></div>`);
    } else {
      tiles.push(tile(`${pct(r, g)} %`, t("kt.t.sum.avg", "richtig im Schnitt")), tile(`${Math.round(median * 100)} %`, t("kt.t.sum.median", "Median")));
    }
    $("[data-summary]").innerHTML = tiles.join("")
      + (E ? `<p class="kl-muted kt-rule">${esc(t("kt.t.rule", "Niveau = die höchste Stufe, bei der jemand mindestens {p} % richtig hat, und alle Stufen darunter auch.", { p: Math.round(SCHWELLE * 100) }))}${LANG ? " " + esc(t("kt.t.ruleLang", "So für jeden Teil; Gesamt = das höchste Niveau, das mindestens die Hälfte der Teile erreicht. Schreiben zählt, sobald du es bewertet hast.")) : ""}</p>` : "");
  }

  /** The weakest topics (at most three, under 80 %), with what to open next. */
  function renderNext(z) {
    const weak = z.themen.filter((tp) => tp.g && tp.r / tp.g < 0.8).sort((a, b) => a.r / a.g - b.r / b.g).slice(0, 3);
    $("[data-next]").hidden = !weak.length;
    $("[data-next-list]").innerHTML = weak.length
      ? `<article class="lq-card uf-next-card">
          <ol class="uf-next-list">${weak.map((tp) => {
            const l = links[tp.id] ?? {};
            const acts = [
              l.page && `<a href="${esc(withBase(l.page))}">${esc(t("uf.t.next.page", "Thema"))}</a>`,
              l.sheet && `<a href="${esc(withBase(l.sheet))}">${esc(t("uf.t.next.sheet", "Arbeitsblatt"))}</a>`,
              l.quiz && `<a href="${esc(withBase(l.quiz))}">${esc(t("uf.t.next.quiz", "Live-Quiz"))}</a>`,
            ].filter(Boolean);
            return `<li><strong>${esc(tp.name)}</strong> <small>${esc(t("kt.t.next.share", "{p} % richtig", { p: pct(tp.r, tp.g) }))}</small>${acts.length ? `<span class="uf-next-acts">${acts.join("")}</span>` : ""}</li>`;
          }).join("")}</ol>
        </article>`
      : "";
  }

  function renderStudents(z) {
    const list = sorted();
    const cols = LANG ? [] : E ? levelCols : z.themen;
    const head = `<tr>
      <th scope="col"><button type="button" data-sort="name">${esc(t("kl.d.col.name", "Name"))}${sortBy === "name" ? " ▲" : ""}</button></th>
      ${E ? `<th scope="col"><button type="button" data-sort="niveau">${esc(t("kt.t.col.level", "Niveau"))}${sortBy === "niveau" ? " ▼" : ""}</button></th>` : ""}
      ${PARTS.length > 1 ? PARTS.map((p) => `<th scope="col">${esc(TEIL_TEXT[p]())}</th>`).join("") : ""}
      <th scope="col" class="kld-num"><button type="button" data-sort="score">${esc(t("kt.t.col.score", "Richtig"))}${sortBy === "score" ? " ▼" : ""}</button></th>
      ${cols.map((tp) => `<th scope="col" class="kld-topic" title="${esc(tp.name)}"><span>${esc(tp.name)}</span></th>`).join("")}
      <th scope="col"><button type="button" data-sort="time">${esc(t("kt.t.col.time", "Abgegeben"))}${sortBy === "time" ? " ▲" : ""}</button></th>
    </tr>`;
    const body = list.map((r) => {
      const cells = cols.map((tp) => {
        const ok = tp.idx.filter((i) => r.korrekt?.[i] === true).length;
        const share = ok / tp.idx.length;
        return `<td class="kld-heat kld-s${stufe(share)}" title="${esc(`${r.name} · ${tp.name}: ${ok}/${tp.idx.length}`)}">${Math.round(share * 100)}</td>`;
      }).join("");
      const on = keyOf(r) === openKey;
      return `<tr class="${on ? "kt-row-open" : ""}">
        <th scope="row"><button type="button" class="kld-name" data-student="${esc(keyOf(r))}" aria-expanded="${on}">${esc(r.name)}</button></th>
        ${E ? `<td class="kt-level-cell"><strong>${esc(niveauText(r))}</strong></td>` : ""}
        ${LANG ? (() => {
          const p = profilOf(r);
          return PARTS.map((part) => part === "schreiben" && !p.teile.schreiben
            ? `<td><button type="button" class="qb-link" data-student="${esc(keyOf(r))}">${esc(t("kt.t.rate", "bewerten"))}</button></td>`
            : `<td>${esc(levelName(p.teile[part]))}</td>`).join("");
        })() : ""}
        <td class="kld-num"><strong>${r.richtig}/${r.gesamt}</strong> <small>${pct(r.richtig, r.gesamt)} %</small></td>
        ${cells}
        <td class="kl-muted">${esc(uhrzeit(r.created_at))}</td>
      </tr>`;
    }).join("");
    $("[data-students-table]").innerHTML = `<table class="kld-table kld-heatmap kt-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
    renderDetail();
  }

  function renderDetail() {
    const r = rows.find((x) => keyOf(x) === openKey);
    const el = $("[data-student-detail]");
    if (!r) { el.innerHTML = ""; return; }
    el.innerHTML = `<article class="lq-card kt-detail">
      <div class="kt-detail-head">
        ${LANG ? `<p class="kt-profile">${PARTS.map((p) => `<span>${esc(TEIL_TEXT[p]())} <strong>${esc(p === "schreiben" && !profilOf(r).teile.schreiben ? "–" : levelName(profilOf(r).teile[p]))}</strong></span>`).join("")}</p>` : ""}
        <h3>${esc(r.name)} <small>${E ? `${esc(t("kt.t.col.level", "Niveau"))} ${esc(niveauText(r))} · ` : ""}${r.richtig}/${r.gesamt} · ${pct(r.richtig, r.gesamt)} %</small></h3>
        <button type="button" class="qb-link" data-detail-close>${esc(t("kt.t.detail.close", "Schließen"))}</button>
      </div>
      <ol class="kt-qlist kt-qlist--student">${k.fragen.map((f, i) => {
        const ok = r.korrekt?.[i] === true;
        const a = r.antworten?.[i];
        if (f.typ === "text") return schreibHtml(f, r);
        return `<li class="${ok ? "is-right" : "is-wrong"}">
          <span class="kt-mark" aria-hidden="true">${ok ? "✓" : "✗"}</span>
          <span class="kt-q-text" lang="es">${esc(f.q)}</span>
          <span class="kt-q-ans">${ok
            ? esc(a)
            : `${a == null || a === "" ? `<em>${esc(t("kt.t.skipped", "übersprungen"))}</em>` : `<s>${esc(a)}</s>`} → <strong>${esc(f.a[0])}</strong>`}</span>
          <small class="kt-q-topic">${f.l && E ? `${esc(f.l)} · ` : ""}${esc(f.tn)}</small>
        </li>`;
      }).join("")}</ol>
      <button type="button" class="lq-btn lq-btn--quiet" data-detail-delete>${esc(t("kt.t.detail.delete", "Dieses Ergebnis löschen"))}</button>
    </article>`;
  }

  /** One student's written text with the teacher's rating: the task's points, a level, the
   *  model text and checklist to compare. Unsaved ticks survive a refresh (entwurf). */
  function schreibHtml(f, r) {
    const key = keyOf(r);
    const task = k.material?.schreiben?.[f.ref] ?? {};
    const extra = fk.schreiben.find((x) => x.id === f.ref) ?? {};
    const b = entwurf.get(key) ?? r.bewertung ?? {};
    const text = r.antworten?.[k.fragen.indexOf(f)] ?? "";
    const n = String(text).trim().split(/\s+/).filter(Boolean).length;
    const opts = ["", "unter", ...stufenOf(k.fragen)];
    const optText = (o) => (!o ? t("kt.t.rate.none", "noch nicht bewertet") : o === "unter" ? t("kt.t.below", "unter {l}", { l: stufenOf(k.fragen)[0] ?? "A1" }) : o);
    return `<li class="is-text kt-write-rate" data-rate="${esc(key)}">
      <span class="kt-mark" aria-hidden="true">✍</span>
      <span class="kt-q-text"><strong>${esc(task.title ?? TEIL_TEXT.schreiben())}</strong> <small>(${esc(f.l ?? "")})</small></span>
      <div class="kt-rate-body">
        ${text ? `<div class="kt-written" lang="es">${esc(text)}</div><small class="kl-muted">${esc(t("kt.s.words", "{n} Wörter", { n }))}</small>` : `<em>${esc(t("kt.t.skipped", "übersprungen"))}</em>`}
        ${(task.points ?? []).length ? `<fieldset class="kt-rate-points"><legend>${esc(t("kt.t.rate.points", "Kommt im Text vor"))}</legend>${task.points.map((p, j) => `<label><input type="checkbox" data-rate-point="${j}" ${b.punkte?.[j] ? "checked" : ""} /> ${esc(p)}</label>`).join("")}</fieldset>` : ""}
        <label class="lq-field kt-rate-level"><span>${esc(t("kt.t.rate.level", "Der Text passt zu Niveau"))}</span>
          <select data-rate-level>${opts.map((o) => `<option value="${o}" ${(b.niveau ?? "") === o ? "selected" : ""}>${esc(optText(o))}</option>`).join("")}</select></label>
        ${extra.model || extra.check?.length ? `<details class="kt-model"><summary>${esc(t("kt.t.rate.model", "Musterlösung und Checkliste"))}</summary>
          ${extra.check?.length ? `<ul>${extra.check.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
          ${extra.model ? `<div class="kt-written" lang="es">${esc(extra.model)}</div>` : ""}</details>` : ""}
        <div class="kl-row"><button type="button" class="lq-btn lq-btn--primary" data-rate-save>${esc(t("kt.t.rate.save", "Bewertung speichern"))}</button>
          <span class="kl-muted" data-rate-status role="status"></span></div>
      </div>
    </li>`;
  }

  function renderQuestions(z) {
    const order = k.fragen.map((f, i) => i).filter((i) => k.fragen[i].typ !== "text").sort((a, b) => z.fragen[a].r / (z.fragen[a].n || 1) - z.fragen[b].r / (z.fragen[b].n || 1));
    $("[data-questions-list]").innerHTML = order.map((i) => {
      const f = k.fragen[i];
      const s = z.fragen[i];
      const p = pct(s.r, s.n);
      const top = [...s.wrong.entries()].sort((a, b) => b[1] - a[1])[0];
      return `<li class="lq-card kt-q">
        <div class="kt-q-head">
          <span class="kt-q-text" lang="es">${esc(f.q)}</span>
          <span class="kt-q-pct kld-heat kld-s${stufe(s.n ? s.r / s.n : 0)}">${p} %</span>
        </div>
        ${f.x ? `<small class="kl-muted">${esc(f.x)}${f.h ? ` · ${esc(f.h)}` : ""}</small>` : ""}
        <p class="kt-q-meta">
          <span>✓ <strong>${esc(f.a[0])}</strong> · ${esc(t("kt.t.q.right", "{r} von {n} richtig", { r: s.r, n: s.n }))}</span>
          ${top ? `<span>${esc(t("kt.t.q.wrong", "Häufigster Fehler: „{a}“ ({n}×)", { a: top[0], n: top[1] }))}</span>` : ""}
          ${s.skip ? `<span>${esc(t("kt.t.q.skip", "{n}× übersprungen", { n: s.skip }))}</span>` : ""}
          <small class="kt-q-topic">${esc(f.tn)}</small>
        </p>
      </li>`;
    }).join("");
  }

  /* ---------------------------------------------------------- actions ---- */
  $("[data-students-table]").addEventListener("click", (e) => {
    const s = e.target.closest("[data-sort]");
    if (s) { sortBy = s.dataset.sort; render(); return; }
    const b = e.target.closest("[data-student]");
    if (!b) return;
    openKey = openKey === b.dataset.student ? null : b.dataset.student;
    render();
    if (openKey) $("[data-student-detail]").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  const readRating = (box) => ({
    punkte: [...box.querySelectorAll("[data-rate-point]")].map((x) => x.checked),
    niveau: box.querySelector("[data-rate-level]").value || null,
  });
  $("[data-student-detail]").addEventListener("change", (e) => {
    const box = e.target.closest("[data-rate]");
    if (box) entwurf.set(box.dataset.rate, readRating(box));
  });
  $("[data-student-detail]").addEventListener("click", async (e) => {
    if (e.target.closest("[data-detail-close]")) { openKey = null; render(); return; }
    const save = e.target.closest("[data-rate-save]");
    if (save) {
      const box = save.closest("[data-rate]");
      const r = rows.find((x) => keyOf(x) === box.dataset.rate);
      if (!r) return;
      const b = readRating(box);
      save.disabled = true;
      try {
        await bewertungSpeichern(k.id, r.created_at, r.name, b);
        r.bewertung = b;
        entwurf.delete(box.dataset.rate);
        render();
        $("[data-rate-status]") && ($("[data-rate-status]").textContent = t("kt.t.rate.saved", "Gespeichert."));
      } catch (err) {
        console.error(err);
        save.disabled = false;
        box.querySelector("[data-rate-status]").textContent = t("kl.t.err.generic", "Das hat gerade nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal.");
      }
      return;
    }
    const del = e.target.closest("[data-detail-delete]");
    if (!del) return;
    const r = rows.find((x) => keyOf(x) === openKey);
    if (!r || !confirm(t("kt.t.confirm.result", "Das Ergebnis von „{name}“ löschen? Das Handy kann den Test dann noch einmal machen.", { name: r.name }))) return;
    del.disabled = true;
    try {
      await ergebnisLoeschen(k.id, r.created_at, r.name);
      rows = rows.filter((x) => x !== r);
      openKey = null;
      render();
    } catch (err) {
      console.error(err);
      del.disabled = false;
      status(t("kl.t.err.generic", "Das hat gerade nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal."));
    }
  });
  $("[data-share-toggle]").addEventListener("click", () => { shareOpen = !shareOpen; render(); });
  $("[data-copy]").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link);
      status(t("kl.t.copied", "Link kopiert."));
    } catch {
      status(link);
    }
  });
  $("[data-toggle]").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await testOffen(k.id, !k.offen);
      k.offen = !k.offen;
      status(k.offen ? t("kt.t.reopened", "„{name}“ nimmt wieder Abgaben an.", { name: k.titel }) : t("kt.t.closedDone", "„{name}“ ist geschlossen. Die Ergebnisse bleiben.", { name: k.titel }));
      render();
    } catch (err) {
      console.error(err);
      status(t("kl.t.err.generic", "Das hat gerade nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal."));
    } finally {
      btn.disabled = false;
    }
  });
  $("[data-print]").addEventListener("click", () => window.print());
  $("[data-csv]").addEventListener("click", () => {
    const z = auswerten(k.fragen, rows);
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const cols = LANG ? [] : E ? levelCols : z.themen;
    const head = [t("kl.d.col.name", "Name"), ...(E ? [t("kt.t.col.level", "Niveau")] : []), ...(LANG ? PARTS.map((p) => TEIL_TEXT[p]()) : []), t("kt.t.col.score", "Richtig"), t("kt.t.csv.of", "von"), t("kt.t.csv.pct", "Prozent"), ...cols.map((tp) => `${tp.name} %`), ...k.fragen.map((f, i) => `${i + 1}. ${f.q}`), t("kt.t.col.time", "Abgegeben")];
    const lines = [head.map(cell).join(";")];
    for (const r of sorted()) {
      lines.push([
        r.name, ...(E ? [niveauText(r)] : []), ...(LANG ? PARTS.map((p) => levelName(profilOf(r).teile[p])) : []), r.richtig, r.gesamt, pct(r.richtig, r.gesamt),
        ...cols.map((tp) => pct(tp.idx.filter((i) => r.korrekt?.[i] === true).length, tp.idx.length)),
        ...k.fragen.map((f, i) => (f.typ === "text" ? r.antworten?.[i] ?? "" : `${r.korrekt?.[i] === true ? "✓" : "✗"} ${r.antworten?.[i] ?? ""}`.trim())),
        uhrzeit(r.created_at),
      ].map(cell).join(";"));
    }
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `klassentest-${k.code}.csv` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // The projector view: the QR code and the code as big as the screen allows.
  const beamer = $("[data-beamer]");
  const closeBeamer = () => {
    beamer.hidden = true;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
  $("[data-big]").addEventListener("click", () => {
    beamer.hidden = false;
    beamer.requestFullscreen?.().catch(() => {});
    beamer.querySelector("[data-beamer-close]").focus();
  });
  beamer.querySelector("[data-beamer-close]").addEventListener("click", closeBeamer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !beamer.hidden) closeBeamer(); });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) beamer.hidden = true; });

  render();

  // Live: read the results again while the page is in view.
  let busy = false;
  const refresh = async () => {
    if (busy || document.hidden) return;
    busy = true;
    try {
      const next = await ergebnisse(k.id);
      if (JSON.stringify(next) !== JSON.stringify(rows)) {
        rows = next;
        render();
      }
    } catch (err) {
      console.error(err);
    } finally {
      busy = false;
    }
  };
  setInterval(refresh, REFRESH_MS);
  document.addEventListener("visibilitychange", refresh);
}
