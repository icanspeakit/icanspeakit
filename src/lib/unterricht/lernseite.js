// /lesson: a Stunde of the Stundenplan for a learner alone, step by step, on any device.
//   /lesson?niveau=a1-1&block=1[&stunden=3&stunde=1&min=90]
// The same Stunde the teacher's /teachers/lesson teaches (build() from the five plan
// keys; a self-learner gets 3 Stunden × 90 min per block). One step = one phase. Its
// material is the site's own pages, opened in this tab; the bar (leiste.js, learner mode)
// comes along and leads back here. A step finishes by itself when its exercises are done
// (lernen.js goalOf), or with „Fertig“; every step can be skipped.
//
// Saved on this device (lernstunde.js); for a signed-in learner also on the server (Tier 2,
// lernServer.js): opening /lesson merges the server's copy in first, so another device's
// progress is there. No account needed. ?klasse=<id> (an Aufgabe, Tier 3) ties the Stunde to
// that class: the teacher sees it, and finishing it marks the Aufgabe done.
import { cefrOf, lessonFor } from "../stundenplan.js";
import { phaseColor } from "./phasen.js";
import * as T from "./timer.js";
import { einstiegInhalt } from "./einstieg.js";
import { mountLeiste } from "./leiste.js";
import {
  about, emptyExtra, finish, goalOf, keyText, lernKeyFromParams, lernText, naechsteStunde, progressOf, setText, skip, statusOf, stundeHref,
} from "./lernen.js";
import { archive, createLernSteuerung, deviceSnapshots, fromArchive, listenSteps, makeCurrent, readLern } from "./lernstunde.js";
import { fromServer, mergeLern, stundeRef } from "./lernen.js";
import { isId } from "./speichern.js";
import { LERN_MATERIAL_WINDOW, LERN_WINDOW } from "./zurueck.js";
import { endSet, logSession } from "../versuche.js";
import { mascotSvg } from "../mascots.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const stepsOf = (lesson) => lesson.phases.map((p) => ({ id: p.id, name: p.name, minutes: p.minutes }));
const newId = () => globalThis.crypto?.randomUUID?.() ?? "00000000-0000-4000-8000-" + String(Date.now()).padStart(12, "0").slice(-12);

const hasAuthCookie = () => /(^|;\s*)sb-[^=]*-auth-token[^=]*=/.test(document.cookie);
/** A promise, or null after `ms`: a slow network must not hold the page. */
const within = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

export async function mountLernstunde(root, data) {
  const $ = (s) => root.querySelector(s);
  const views = [...root.querySelectorAll("[data-view]")];
  const show = (name) => views.forEach((v) => (v.hidden = v.dataset.view !== name));

  const q = new URLSearchParams(location.search);
  // Bare /lesson (the menu's „Meine Stunde“): on to the Stunde that is next, chosen as on
  // /progress's card (naechsteStunde) – begun, else the one after, else the level's first.
  if (!q.has("niveau")) {
    let snaps = deviceSnapshots();
    if (hasAuthCookie()) {
      try {
        const srv = await import("./lernServer.js");
        snaps = [...snaps, ...((await within(srv.meineLernstunden(30), 3000)) ?? [])];
      } catch {}
    }
    let cefr = null;
    try { cefr = localStorage.getItem("da-einstufung") || localStorage.getItem("da_level"); } catch {}
    const order = data.levels.map((l) => ({ niveau: l.id, blocks: l.blocks.length }));
    const next = naechsteStunde(snaps, order, cefr);
    if (next) return location.replace(stundeHref(next.key));
  }
  const key = lernKeyFromParams(q);
  const found = key && lessonFor(data.levels, key);
  if (!found?.lesson) return show("missing");
  const { level, block, lesson, plan } = found;
  const steps = stepsOf(lesson);
  const prev = plan.lessons[key.stunde - 2] ?? null;
  const cefr = cefrOf(level.label);
  const label = `${level.label} · Block ${key.block}`;
  const topicSet = new Set(block.grammar.flat().map((l) => l.href));
  const isTopic = (href) => topicSet.has(href);
  const linksOf = (ls) => ls.final
    ? block.grammar.slice(0, 2).map((g) => g[0]).filter(Boolean)
    : (ls.phases.find((p) => p.id === "grammatik")?.links ?? []).filter((l) => isTopic(l.href));
  // The topic pages a step works on. Üben: the Stunde's own; Kurztest: one per grammar line
  // of the block; Grammatik (final Stunde): the first two, as the Einstieg repeats them.
  const blockTopics = block.grammar.map((g) => g[0]?.href).filter(Boolean);
  const topicsOf = (ph) => {
    if (ph.id === "test") return blockTopics;
    if (ph.id === "grammatik" && lesson.final) return linksOf(lesson).map((l) => l.href);
    return [...new Set((ph.links ?? []).filter((l) => isTopic(l.href)).map((l) => l.href))];
  };
  const goals = Object.fromEntries(lesson.phases.map((ph, i) => [i, goalOf(ph.id, {
    topics: topicsOf(ph),
    totals: Object.fromEntries(Object.entries(data.themen).map(([h, t]) => [h, t.total ?? 0])),
    blockTopics,
    words: !!level.words,
    exams: (ph.links ?? []).length > 0,
    minutes: ph.minutes,
  })]));
  const nameOf = (href) => block.grammar.flat().find((l) => l.href === href)?.name ?? href.slice(1);
  const textCtx = {
    thema: block.thema,
    grammatik: lesson.final ? block.grammatik.map((g) => g.replace(/\s*\([^)]*\)/g, "")) : lesson.grammar,
    woerter: block.wortschatz,
    ziele: lesson.goals.length ? lesson.goals : [block.thema],
    vorher: prev?.focus ?? "",
    pruefung: block.pruefung ?? [],
  };
  const nextHref = (() => {
    if (key.stunde < key.stunden) return stundeHref({ ...key, stunde: key.stunde + 1 });
    if (level.blocks[key.block]) return stundeHref({ ...key, block: key.block + 1, stunde: 1 });
    return null;
  })();

  /* ------------------------------------------------------------ start ---- */
  const klasse = isId(q.get("klasse")) ? q.get("klasse") : null;
  const running = readLern();
  let mine = running && keyText(running.key) === keyText(key) ? running : null;
  let saved = mine ?? fromArchive(key);
  // Signed in: the server's copy of this Stunde (another device may be further) joins the
  // device's first. And once after login, the Stunden made while signed out go up.
  if (hasAuthCookie()) {
    try {
      const srv = await import("./lernServer.js");
      const row = await within(srv.serverLernstunde(key), 3000);
      if (row) {
        const merged = mergeLern(saved, { ...fromServer(row), gruppe: label, steps });
        // A Stunde finished elsewhere is not the running one here any more.
        if (mine && merged.row.status !== "completed") { mine = merged; makeCurrent(merged); }
        else if (mine) mine = null;
        saved = merged;
      }
      srv.syncAll(deviceSnapshots()).catch(() => {});
    } catch {}
  }
  const done = saved?.row?.status === "completed";

  $("[data-meta]").textContent = `${label}: ${block.thema} · ${key.stunden} lessons`;
  $("[data-title]").textContent = `Lesson ${key.stunde}: ${lesson.final ? "Use and revise" : lesson.focus}`;
  document.title = `Lesson ${key.stunde}: ${block.thema} – EnglishAcademy`;

  if (mine && !mine.extra?.parked && !done && q.get("spaeter") !== "1") return run(mine);

  show("start");
  $("[data-start-bar]").innerHTML = timeline(saved?.extra);
  const msg = $("[data-start-msg]");
  const go = $("[data-start-go]");
  const fresh = $("[data-start-fresh]");
  if (q.get("spaeter") === "1") msg.textContent = "Saved. Carry on whenever you like – even on another day.";
  if (done) {
    msg.textContent = "You have finished this lesson.";
    go.textContent = nextHref ? "Go to the next lesson" : "Go to your progress";
    go.addEventListener("click", () => location.assign(nextHref ?? "/progress"));
    fresh.hidden = false;
    fresh.textContent = "Do it again";
  } else if (saved) {
    const at = T.fromRow(saved.row, steps).current;
    go.textContent = `Continue at step ${at + 1}: ${steps[at].name}`;
    go.addEventListener("click", () => run({ ...saved, extra: { ...saved.extra, parked: false } }));
    fresh.hidden = false;
  } else {
    go.textContent = "Let's go";
    go.addEventListener("click", () => run(null));
  }
  fresh.addEventListener("click", () => run(null));
  $("[data-start-steps]").innerHTML = lesson.phases.map((p) => `<li><i style="background:${phaseColor(p.id).bg}"></i>${esc(p.name)} <small>${about(p.minutes)}</small></li>`).join("");

  /* -------------------------------------------------------------- run ---- */
  function run(from) {
    // Another Stunde was running on this device: keep it to come back to.
    if (running && running !== from && keyText(running.key) !== keyText(key)) archive(running);
    const now = Date.now();
    const tie = klasse ?? from?.klasse ?? null;
    const snap = from
      ? { ...from, gruppe: label, steps, ...(tie ? { klasse: tie } : {}), extra: { ...emptyExtra(goals), ...from.extra, goals, parked: false } }
      : { id: newId(), key, gruppe: label, steps, ...(tie ? { klasse: tie } : {}), row: T.toRow(T.start(T.create(steps, now), now)), extra: { ...emptyExtra(goals), parked: false } };
    makeCurrent(snap);
    if (q.has("spaeter")) history.replaceState(null, "", stundeHref(key));
    stage(snap);
  }

  function stage(snap) {
    show("stage");
    // Named, so „Zurück zum Schritt“ in the word cards' tab finds this one (zurueck.js).
    window.name = LERN_WINDOW;
    const ctl = createLernSteuerung(snap);
    const stopListen = listenSteps(ctl);
    mountLeiste(ctl, {
      home: true,
      mode: "lernend",
      onLater: () => location.assign(stundeHref(key, "&spaeter=1")),
      onEnd: () => { stopListen(); ctl.destroy(); },
    });
    $("[data-stage-meta]").textContent = `${label}: ${block.thema} · Lesson ${key.stunde}`;
    const bar = $("[data-stage-bar]");
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("[data-goto]");
      if (b) ctl.goTo(Number(b.dataset.goto));
    });

    let shown = -1;
    let sig = "";
    ctl.on((state) => {
      if (state.status === "completed") return;
      const i = state.current;
      const p = progressOf(goals[i], ctl.extra?.seen?.[i]);
      const nextSig = `${i}|${JSON.stringify(ctl.extra?.status)}|${p.have}/${p.right}`;
      if (nextSig === sig) return;
      sig = nextSig;
      bar.innerHTML = timeline(ctl.extra, true, i);
      if (i !== shown) {
        const dir = shown < 0 ? 0 : i > shown ? 1 : -1;
        shown = i;
        drawStep(ctl, i);
        slideIn($("[data-card]"), dir);
      }
      drawActions(ctl, i);
    });
  }

  /* ------------------------------------------------------------ steps ---- */
  function drawStep(ctl, i) {
    const ph = lesson.phases[i];
    const card = $("[data-card]");
    const col = phaseColor(ph.id);
    card.style.setProperty("--ph-bg", col.bg);
    card.style.setProperty("--ph-ink", col.ink);
    const t = lernText(ph, textCtx, data.texte);
    const head = `<div class="ut-head"><p class="ut-phase"><i></i>${i + 1}/${steps.length} · ${esc(ph.name)} · ${about(ph.minutes)}</p>${t.entwurf ? `<span class="ls-entwurf" title="Not reviewed yet – only visible in development">Draft</span>` : ""}</div>`;
    const bruno = t.bruno ? `<div class="ls-bruno" data-mascot-part aria-hidden="true">${mascotSvg({ name: "bruno", expr: "happy", view: "three", size: 52, label: "" })}<p>${esc(t.bruno)}</p></div>` : "";
    const say = `<h2 class="ut-big ut-big--sm ls-say">${esc(t.text)}</h2>`;
    const typed = (ph2, rows = 4, hint = "") => `<label class="ls-write"><span>${esc(hint || "Your text")}</span>
      <textarea data-write rows="${rows}" spellcheck="true" lang="en-GB">${esc(ctl.extra?.texte?.[i] ?? "")}</textarea>
      <small>Stays on this device only.</small></label>`;
    let body = "";
    if (ph.id === "einstieg") {
      const e = einstiegInhalt({ phase: ph, lesson, prev, block, bild: data.bilder[key.niveau]?.[key.block - 1] ?? null, themen: data.themen ?? {}, linksOf });
      const foto = e.bild ? `<figure class="ut-bild"><picture>
          <source type="image/avif" srcset="${e.bild.src}-800.avif 800w, ${e.bild.src}-1600.avif 1600w" sizes="(min-width: 900px) 900px, 100vw" />
          <img src="${e.bild.src}-1200.webp" alt="${esc(e.bild.alt)}" width="1600" height="600" decoding="async" /></picture>
          ${e.bild.credit ? `<figcaption>Photo: <a href="${esc(e.bild.credit.href)}" target="_blank" rel="noopener">${esc(e.bild.credit.label)}</a></figcaption>` : ""}</figure>` : "";
      const starters = e.redemittel?.length ? `<p class="ut-label">You can start like this</p><ul class="ut-starters">${e.redemittel.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : "";
      let inhalt = "";
      if (e.kind === "bild") inhalt = `<ol class="ut-fragen">${e.fragen.map((f) => `<li>${esc(f)}</li>`).join("")}</ol>${typed(ph, 4, "Your three sentences")}`;
      else if (e.kind === "wortigel") inhalt = `${typed(ph, 3, "Your words")}`;
      else if (e.kind === "blitzlicht") inhalt = `${e.beispiele.length ? `<p class="ut-label">This is how it sounds</p><ul class="ut-beispiele">${e.beispiele.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${typed(ph, 2, "Your sentence")}`;
      else if (e.kind === "fragen") {
        inhalt = e.quiz.length
          ? `<ol class="ut-quiz">${e.quiz.map((x) => `<li><span>${esc(x.prompt).replace("___", '<b class="ut-gap">___</b>')}</span>
              <button type="button" class="ut-reveal" data-answer="${esc(x.answer)}">Reveal</button></li>`).join("")}</ol>`
          : `<ul class="ut-beispiele">${e.beispiele.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
      } else if (e.kind === "wiederholung") {
        inhalt = `<div class="ut-karten">${e.karten.map((k) => `<div class="ut-karte"><b>${esc(k.name)}</b>${k.beispiel ? `<span>${esc(k.beispiel)}</span>` : ""}</div>`).join("")}</div>${typed(ph, 3, "Your sentences")}`;
      }
      body = `${foto}${inhalt}${e.kind === "fragen" ? "" : starters}`;
    } else if (ph.id === "wortschatz") {
      body = `<ul class="ut-words">${block.wortschatz.map((w, j) => `<li><button type="button" class="ut-word" data-feld="${j}" aria-expanded="false">${esc(w)}</button></li>`).join("")}</ul>
        <div class="ut-feld" data-feld-panel></div>
        ${level.words ? `<div class="ls-links"><a class="ls-link ls-link--main" href="${esc(level.words.href)}" target="${LERN_MATERIAL_WINDOW}">Flashcards: ${esc(level.words.name)}<small>One round to the end</small></a></div>` : ""}`;
    } else if (ph.id === "grammatik") {
      body = `<div class="ls-links">${topicsOf(ph).map((h) => {
        const base = `${h}?mode=present&niveau=${encodeURIComponent(cefr)}&ls=1`;
        const seen = !!ctl.extra?.seen?.[i]?.[`d:${h}`];
        return `<div class="ls-row${seen ? " ls-row--done" : ""}"><a class="ls-link ls-link--main" href="${esc(base)}">${esc(nameOf(h))}<small>${seen ? "✓ watched" : "Watch the presentation"}</small></a>
          <a class="ls-link" href="${esc(base)}&regel=1">Rule</a></div>`;
      }).join("")}</div>`;
    } else if (ph.id === "uebung" || ph.id === "test") {
      body = `<div class="ls-links">${topicsOf(ph).map((h) => `<div class="ls-row"><a class="ls-link ls-link--main" href="${esc(h)}#uebung-1">${esc(nameOf(h))}<small data-topic-progress="${esc(h)}"></small></a></div>`).join("")}</div>`;
    } else if (ph.id === "anwendung") {
      const goalsList = lesson.goals.length ? lesson.goals : [block.thema];
      body = `<ul class="ut-goals">${goalsList.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>
        ${typed(ph, 6, "Your sentences")}
        <div class="ls-links"><a class="ls-link" href="/pronunciation-check">Rather speak? Go to the pronunciation check<small>Say your sentences and hear how they sound</small></a></div>`;
    } else if (ph.id === "pruefung") {
      body = `<div class="ls-links">${(ph.links ?? []).map((l) => `<a class="ls-link ls-link--main" href="${esc(l.href)}">${esc(l.name)}<small>Through to the result</small></a>`).join("")}</div>`;
    } else if (ph.id === "abschluss") {
      if (lesson.final) {
        let ticks = [];
        try { ticks = JSON.parse(ctl.extra?.texte?.[i] ?? "[]"); } catch {}
        body = `<ul class="ls-kann">${block.kannZiele.map((z, j) => `<li><label><input type="checkbox" data-kann="${j}" ${ticks[j] ? "checked" : ""} /> ${esc(z)}</label></li>`).join("")}</ul>`;
      } else {
        const links = (ph.links ?? []).filter((l) => !l.ext);
        body = links.length ? `<div class="ls-links">${links.map((l) => `<a class="ls-link" href="${esc(l.href)}">${esc(l.name)}</a>`).join("")}</div>` : "";
      }
    }
    card.innerHTML = `${head}${bruno}${say}${body}<div class="ls-actions" data-actions></div>`;

    card.querySelectorAll("[data-answer]").forEach((b) => b.addEventListener("click", () => {
      b.closest("li").querySelector(".ut-gap").textContent = b.dataset.answer;
      b.remove();
    }));
    card.querySelectorAll("[data-feld]").forEach((b) => b.addEventListener("click", () => openFeld(card, b)));
    // What the learner types stays in the session (this device only), a little after typing.
    let typing = 0;
    card.querySelector("[data-write]")?.addEventListener("input", (e) => {
      clearTimeout(typing);
      const v = e.target.value;
      typing = setTimeout(() => ctl.patch((x) => setText(x, i, v)), 500);
    });
    card.querySelectorAll("[data-kann]").forEach((c) => c.addEventListener("change", () => {
      const ticks = [...card.querySelectorAll("[data-kann]")].map((x) => x.checked);
      ctl.patch((x) => setText(x, i, JSON.stringify(ticks)));
    }));
    // onclick, not addEventListener: the card stays, its content is redrawn per step.
    card.onclick = (e) => {
      const a = e.target.closest("[data-act]");
      if (!a) return;
      const act = a.dataset.act;
      const last = i === steps.length - 1;
      if (act === "fertig") ctl.patch((x) => finish(x, i));
      if (act === "skip") ctl.patch((x) => skip(x, i));
      if (act === "weiter" || act === "fertig" || act === "skip") {
        if (last) return endStunde(ctl);
        ctl.next();
      }
    };
  }

  // The foot of a step: how far it is, and the ways on.
  function drawActions(ctl, i) {
    const box = $("[data-actions]");
    if (!box) return;
    const goal = goals[i];
    const st = statusOf(ctl.extra, i);
    const last = i === steps.length - 1;
    const p = progressOf(goal, ctl.extra?.seen?.[i]);
    const nextName = last ? null : steps[i + 1].name;
    const on = last ? "Finish the lesson" : `Next: ${nextName}`;
    let info = "";
    if (goal.kind !== "fertig") {
      const pct = p.need ? Math.round((p.have / p.need) * 100) : 0;
      const what = goal.kind === "aufgaben" || goal.kind === "anzahl" ? `${p.have} of ${p.need} tasks${p.answered ? ` · ${p.right} correct` : ""}`
        : goal.kind === "decks" ? `${p.have} of ${p.need} presentations watched`
        : goal.kind === "karten" ? (p.done ? "One round of flashcards done" : "No round of flashcards yet")
        : p.done ? "Exam part done through to the result" : "No result yet";
      info = `<div class="ls-progress"><span class="ls-progress-bar"><i style="width:${pct}%"></i></span><span>${what}</span></div>`;
    }
    // Üben/Kurztest: per page, how many of its tasks are answered.
    document.querySelectorAll("[data-topic-progress]").forEach((el) => {
      const h = el.dataset.topicProgress;
      const seen = Object.keys(ctl.extra?.seen?.[i] ?? {}).filter((k) => k.startsWith(`a:${h}|`)).length;
      const total = goal.kind === "aufgaben" ? goal.topics[h] : null;
      el.textContent = total ? `${Math.min(seen, total)} of ${total} answered` : seen ? `${seen} answered` : "Open the exercises";
    });
    const doneNow = st === "fertig";
    const btns = doneNow
      ? `<button type="button" class="lp-btn lp-btn--primary" data-act="weiter">${esc(on)} →</button>`
      : goal.kind === "fertig"
        ? `<button type="button" class="lp-btn lp-btn--primary" data-act="fertig">${last ? "Done – finish the lesson" : "Done"}</button>
           <button type="button" class="lp-btn lp-btn--outline" data-act="skip">Skip</button>`
        : `<button type="button" class="lp-btn lp-btn--outline" data-act="skip">Skip</button>`;
    box.innerHTML = `${info}${st === "uebersprungen" ? `<p class="ls-note">Skipped – you can come back to it at any time.</p>` : ""}<div class="ls-btns">${btns}</div>`;
  }

  async function endStunde(ctl) {
    const tie = readLern()?.klasse ?? klasse;
    const snap = { id: ctl.id, key, gruppe: label, steps, extra: ctl.extra, ...(tie ? { klasse: tie } : {}) };
    // For a class: one attempt row with the Stunde's ref, which marks its Aufgabe done
    // (aufgabenStatus.js zaehlt). versuche.js only sends it for a class member.
    if (tie) {
      logSession({ skill: "stunde", ref: stundeRef(key) });
      endSet(stundeRef(key));
    }
    await ctl.end();
    archive({ ...snap, row: T.toRow(ctl.state) });
    summary(ctl.state, snap.extra);
  }

  function summary(state, extra) {
    show("done");
    const mins = Math.round(T.lessonElapsed(state, state.lastActiveAt) / 60000);
    $("[data-done-time]").textContent = `${mins} minutes`;
    $("[data-done-rows]").innerHTML = lesson.phases.map((p, i) => {
      const s = statusOf(extra, i);
      const pr = progressOf(goals[i], extra?.seen?.[i]);
      const score = pr.answered ? ` · ${pr.right}/${pr.answered} correct` : "";
      return `<tr><td><i style="background:${phaseColor(p.id).bg}"></i>${esc(p.name)}</td><td class="ls-st ls-st--${s}">${s === "fertig" ? "✓ done" : s === "uebersprungen" ? "skipped" : "open"}${score}</td></tr>`;
    }).join("");
    const next = $("[data-done-next]");
    if (nextHref) next.href = nextHref;
    else { next.href = "/progress"; next.textContent = "Go to your progress"; }
  }

  /* ----------------------------------------------------------- helpers ---- */
  // The plan's phases as a bar; on the stage each is a button, with ✓ or ↷ for its status.
  function timeline(extra, buttons = false, current = -1) {
    return lesson.phases.map((p, i) => {
      const s = statusOf(extra, i);
      const mark = s === "fertig" ? "✓ " : s === "uebersprungen" ? "↷ " : "";
      const style = `flex:${p.minutes};background:${phaseColor(p.id).bg}`;
      const cls = `ls-tl--${s}`;
      return buttons
        ? `<button type="button" class="${cls}" data-goto="${i}" style="${style}" aria-current="${i === current ? "step" : "false"}" aria-label="Go to step ${i + 1}: ${esc(p.name)}${s !== "offen" ? ` (${s === "fertig" ? "done" : "skipped"})` : ""}">${mark}${esc(p.name)}</button>`
        : `<span class="${cls}" style="${style}">${mark}${esc(p.name)}</span>`;
    }).join("");
  }

  function slideIn(card, dir) {
    if (!dir || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    [...card.children].slice(0, 10).forEach((el, i) => el.animate(
      [{ opacity: 0, transform: `translateX(${24 * dir}px)` }, { opacity: 1, transform: "none" }],
      { duration: 280, delay: i * 45, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" },
    ));
  }

  // A Wortfeld opens its task and words (the same data as the teacher's step).
  function openFeld(card, btn) {
    const panel = card.querySelector("[data-feld-panel]");
    const was = btn.getAttribute("aria-expanded") === "true";
    card.querySelectorAll("[data-feld]").forEach((b) => b.setAttribute("aria-expanded", "false"));
    if (was) { panel.removeAttribute("data-open"); return; }
    btn.setAttribute("aria-expanded", "true");
    const name = block.wortschatz[Number(btn.dataset.feld)];
    const f = data.wortfelder?.[name];
    const wort = (w, k) => `<li style="--i:${k}">
        <span class="ut-w-kopf">${w.artikel ? `<small class="ut-art ut-art--${esc(w.artikel)}">${esc(w.artikel)}</small>` : ""}<b>${esc(w.text)}</b></span>
        ${w.plural && w.plural !== "-" ? `<span class="ut-w-pl">plural: ${esc(w.plural)}</span>` : ""}
        ${w.beispiel ? `<span class="ut-w-bsp">${esc(w.beispiel)}</span>` : ""}</li>`;
    panel.innerHTML = `<div class="ut-feld-in">
      <p class="ut-label">${esc(name)}</p>
      ${f?.woerter?.length ? `<ul class="ut-feld-woerter">${f.woerter.map(wort).join("")}</ul>` : `<p class="ut-aufgabe">Which words do you know for “${esc(name)}”?</p>`}</div>`;
    requestAnimationFrame(() => panel.setAttribute("data-open", ""));
  }
}
