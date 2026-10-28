// /lehrkraefte/umfragen/ergebnis — one poll's QR code and results. The answers are read
// again every few seconds while the tab is visible, so the bars grow as the class votes.
//
// Counts only. A choice question shows each option's votes as a share of the people who
// answered that question (multi choice: shares add up to more than 100 %). Free texts are
// listed in an order made from their own text, never the order they came in, so the list
// does not tell who wrote what by when.
import QRCode from "qrcode";
import { currentUser } from "../liveQuiz/custom.js";
import { loadText, t } from "../liveQuiz/text.js";
import { antworten, umfrage, umfrageLink, umfrageOffen } from "./daten.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const REFRESH_MS = 5000;

/** A stable, meaningless order for free texts. */
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);

/** { [frage id]: { n, counts: Map(option id → votes), texts: [] } } */
export function auszaehlen(fragen, rows) {
  const out = {};
  for (const f of fragen) {
    const ids = new Set((f.optionen ?? []).map((o) => o.id));
    const r = { n: 0, counts: new Map((f.optionen ?? []).map((o) => [o.id, 0])), texts: [] };
    for (const { antworten: a } of rows) {
      const v = a?.[f.id];
      if (f.typ === "text") {
        const s = typeof v === "string" ? v.trim() : "";
        if (s) { r.n++; r.texts.push(s.slice(0, 500)); }
        continue;
      }
      const picks = [...new Set([v].flat())].filter((x) => ids.has(x));
      if (!picks.length) continue;
      r.n++;
      for (const p of (f.typ === "single" ? picks.slice(0, 1) : picks.slice(0, f.max ?? 99))) r.counts.set(p, r.counts.get(p) + 1);
    }
    r.texts.sort((x, y) => hash(x) - hash(y));
    out[f.id] = r;
  }
  return out;
}

export async function mountErgebnis(root) {
  const $ = (s) => root.querySelector(s);
  const gates = [...root.querySelectorAll("[data-gate]")];
  const gate = (name) => gates.forEach((g) => (g.hidden = g.dataset.gate !== name));
  const links = JSON.parse(root.dataset.links || "{}");
  const params = new URLSearchParams(location.search);
  let u = null;
  let rows = [];
  let shareOpen = params.has("neu");
  await loadText(() => { if (u) render(); });

  $("[data-signin-link]").href = `/anmelden?next=${encodeURIComponent(location.pathname + location.search)}`;
  if (!(await currentUser())) return gate("signin");
  try {
    u = await umfrage(params.get("id"));
  } catch (err) {
    console.error(err);
  }
  if (!u) return gate("missing");
  try { rows = await antworten(u.id); } catch (err) { console.error(err); }
  if (!rows.length) shareOpen = true;
  gate("ok");
  document.title = `${u.titel} – ${t("uf.t.eyebrow", "Für Lehrkräfte · Umfragen")}`;

  const link = umfrageLink(u.code);
  const qrSvg = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  $("[data-qr]").innerHTML = qrSvg;
  $("[data-beamer-qr]").innerHTML = qrSvg;
  const shortHost = `${location.host}/umfrage`;
  $("[data-host]").textContent = shortHost;
  $("[data-beamer-host]").textContent = shortHost;
  $("[data-code]").textContent = u.code;
  $("[data-beamer-code]").textContent = u.code;

  const status = (msg) => { $("[data-status]").textContent = msg; };
  const label = (o) => (o.emoji ? `${o.emoji} ` : "") + t(o.k ?? "", o.text);
  const frageText = (f) => t(f.k ?? "", f.frage);
  const countText = (n) => (n === 1 ? t("uf.t.one", "1 Antwort") : t("uf.t.count", "{n} Antworten", { n }));
  const pct = (x, n) => (n ? Math.round((100 * x) / n) : 0);

  /* ----------------------------------------------------------- render ---- */
  function bars(f, r) {
    const opts = [...(f.optionen ?? [])];
    // Multi choice by votes; a single choice keeps its own order (zu langsam → zu schnell).
    if (f.typ === "multi") opts.sort((a, b) => r.counts.get(b.id) - r.counts.get(a.id));
    const top = Math.max(0, ...r.counts.values());
    return `<ul class="uf-bars">${opts
      .map((o) => {
        const c = r.counts.get(o.id);
        const p = pct(c, r.n);
        return `<li class="${c && c === top ? "is-top" : ""}">
          <span class="uf-bar-label">${esc(label(o))}</span>
          <span class="uf-bar"><span style="width:${p}%"></span></span>
          <span class="uf-bar-num">${c} <small>${p} %</small></span>
        </li>`;
      })
      .join("")}</ul>`;
  }

  function render() {
    const z = auszaehlen(u.fragen, rows);
    $("[data-title]").textContent = u.titel;
    $("[data-level]").hidden = !u.niveau;
    $("[data-level]").textContent = u.niveau ?? "";
    const st = $("[data-state]");
    st.textContent = u.offen ? t("uf.t.open", "offen") : t("uf.t.closed", "geschlossen");
    st.classList.toggle("is-open", u.offen);
    $("[data-total]").textContent = countText(rows.length);
    $("[data-beamer-count]").textContent = countText(rows.length);
    $("[data-beamer-title]").textContent = u.titel;
    $("[data-share]").hidden = !shareOpen;
    $("[data-share-toggle]").textContent = shareOpen ? t("kl.t.shareHide", "QR-Code ausblenden") : t("uf.t.shareShow", "QR-Code zeigen");
    $("[data-share-toggle]").setAttribute("aria-expanded", String(shareOpen));
    $("[data-toggle]").textContent = u.offen ? t("uf.t.close", "Schließen") : t("uf.t.reopen", "Wieder öffnen");
    $("[data-empty]").hidden = rows.length > 0;

    $("[data-results]").innerHTML = rows.length
      ? u.fragen
        .map((f) => {
          const r = z[f.id];
          const hint = f.typ === "multi" ? ` <small>· ${esc(t("uf.t.multiHint", "mehrere Antworten möglich"))}</small>` : "";
          const body = f.typ === "text"
            ? (r.texts.length ? `<ul class="uf-texts">${r.texts.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : `<p class="kl-muted">${esc(t("uf.t.noText", "Noch kein Text."))}</p>`)
            : bars(f, r);
          return `<section class="lq-card uf-q">
            <h3>${esc(frageText(f))}</h3>
            <p class="kl-muted">${esc(countText(r.n))}${hint}</p>
            ${body}
          </section>`;
        })
        .join("")
      : "";
    renderNext(z);
  }

  /** The wishes in short, with what to open next: worksheet and live quiz for grammar. */
  function renderNext(z) {
    const cards = [];
    const fr = (id) => u.fragen.find((f) => f.id === id);
    const top = (id, k = 3) => {
      const f = fr(id);
      const r = z[id];
      if (!f || !r?.n) return [];
      return (f.optionen ?? [])
        .map((o) => ({ o, c: r.counts.get(o.id), p: pct(r.counts.get(o.id), r.n) }))
        .filter((x) => x.c > 0)
        .sort((a, b) => b.c - a.c)
        .slice(0, k);
    };
    const votes = (x) => esc(x.c === 1 ? t("uf.t.vote1", "1 Stimme · {p} %", { p: x.p }) : t("uf.t.votes", "{n} Stimmen · {p} %", { n: x.c, p: x.p }));

    const g = top("grammatik");
    if (g.length) {
      cards.push(`<article class="lq-card uf-next-card">
        <h3>${esc(t("uf.t.next.grammar", "Grammatik wiederholen"))}</h3>
        <ol class="uf-next-list">${g.map((x) => {
          const l = links[x.o.id] ?? {};
          const acts = [
            l.page && `<a href="${esc(l.page)}">${esc(t("uf.t.next.page", "Thema"))}</a>`,
            l.sheet && `<a href="${esc(l.sheet)}">${esc(t("uf.t.next.sheet", "Arbeitsblatt"))}</a>`,
            l.quiz && `<a href="${esc(l.quiz)}">${esc(t("uf.t.next.quiz", "Live-Quiz"))}</a>`,
          ].filter(Boolean);
          return `<li><strong>${esc(x.o.text)}</strong> <small>${votes(x)}</small>${acts.length ? `<span class="uf-next-acts">${acts.join("")}</span>` : ""}</li>`;
        }).join("")}</ol>
      </article>`);
    }

    const skill = [...top("fertigkeit", 1), ...top("sprechen-art", 2), ...top("schreiben-art", 2)];
    if (skill.length) {
      cards.push(`<article class="lq-card uf-next-card">
        <h3>${esc(t("uf.t.next.skill", "Mehr üben"))}</h3>
        <ol class="uf-next-list">${skill.map((x) => `<li><strong>${esc(label(x.o))}</strong> <small>${votes(x)}</small></li>`).join("")}</ol>
        <span class="uf-next-acts">
          <a href="/sprechen">${esc(t("uf.t.next.speak", "Sprechen-Übungen"))}</a>
          <a href="/lehrkraefte/arbeitsblaetter/partner">${esc(t("uf.t.next.partner", "Partnerübungen"))}</a>
        </span>
      </article>`);
    }

    const th = [...top("themen"), ...top("lernformen", 2)];
    if (th.length) {
      cards.push(`<article class="lq-card uf-next-card">
        <h3>${esc(t("uf.t.next.topics", "Themen und Lernformen"))}</h3>
        <ol class="uf-next-list">${th.map((x) => `<li><strong>${esc(label(x.o))}</strong> <small>${votes(x)}</small></li>`).join("")}</ol>
      </article>`);
    }

    const kurs = ["tempo", "schwierigkeit", "hausaufgaben"].map((id) => top(id, 1)[0]).filter(Boolean);
    if (kurs.length) {
      cards.push(`<article class="lq-card uf-next-card">
        <h3>${esc(t("uf.t.next.course", "Der Kurs im Moment"))}</h3>
        <ul class="uf-next-list">${kurs.map((x) => {
          const f = u.fragen.find((ff) => ff.optionen?.includes(x.o));
          return `<li>${esc(frageText(f))} <strong>${esc(label(x.o))}</strong> <small>${votes(x)}</small></li>`;
        }).join("")}</ul>
      </article>`);
    }
    $("[data-next]").hidden = !cards.length;
    $("[data-next-list]").innerHTML = cards.join("");
  }

  /* ---------------------------------------------------------- actions ---- */
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
      await umfrageOffen(u.id, !u.offen);
      u.offen = !u.offen;
      status(u.offen ? t("uf.t.reopened", "„{name}“ nimmt wieder Antworten an.", { name: u.titel }) : t("uf.t.closedDone", "„{name}“ ist geschlossen. Die Ergebnisse bleiben.", { name: u.titel }));
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
    const z = auszaehlen(u.fragen, rows);
    const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [[t("uf.t.csv.q", "Frage"), t("uf.t.csv.a", "Antwort"), t("uf.t.csv.n", "Anzahl"), t("uf.t.csv.p", "Prozent")].map(cell).join(";")];
    for (const f of u.fragen) {
      const r = z[f.id];
      if (f.typ === "text") for (const s of r.texts) lines.push([f.frage, s, "", ""].map(cell).join(";"));
      else for (const o of f.optionen) lines.push([f.frage, o.text, r.counts.get(o.id), pct(r.counts.get(o.id), r.n)].map(cell).join(";"));
    }
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `umfrage-${u.code}.csv` });
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

  // Live: read the answers again while the page is in view.
  let busy = false;
  const refresh = async () => {
    if (busy || document.hidden) return;
    busy = true;
    try {
      const next = await antworten(u.id);
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
