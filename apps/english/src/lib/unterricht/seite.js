// /teachers/lesson: start a Stunde from the plan with a group, then teach it step by
// step on the projector. Two views on one static page:
//   ?niveau=a1-1&block=1&stunden=3&stunde=1&min=90   pick (or create) the group, then
//                                                    "Unterricht starten" / "Fortsetzen"
//   ?sitzung=<id>                                   the step screens, the bar and the clock
// One step = one phase of the Stunde (Einstieg, Wortschatz, …). Materials open from a step;
// the bar (leiste.js) comes along to those pages and leads back here.
//
// Nothing is generated: every screen is made from the plan (build() in stundenplan.js), the
// course plan and photos that already exist (src/data/einstieg-bilder.json).
import QRCode from "qrcode";
import { currentUser, isTeacher, setTeacher } from "../liveQuiz/custom.js";
import { meineKlassen, klasseAnlegen } from "../klassen.js";
import { setWaiting } from "../notReady.js";
import { cefrOf, lessonFor } from "../stundenplan.js";
import { phaseColor } from "./phasen.js";
import * as T from "./timer.js";
import { keyFromParams, keyOf, planHref, sessionHref, readLocal, clearLocal } from "./speichern.js";
import { offeneSitzung, sitzungAnlegen, sitzungLaden, sitzungSpeichern } from "./sitzung.js";
import { createSteuerung } from "./steuerung.js";
import { einstiegInhalt } from "./einstieg.js";
import { mountLeiste } from "./leiste.js";
import { LESSON_WINDOW, MATERIAL_WINDOW } from "./zurueck.js";
import { currentPath } from "../paths.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const SOC = { EA: "Solo work", PA: "Pair work", GA: "Group work", PL: "Whole class" };
const ERR = "That did not work just now. Check your internet connection and try again.";


export const stepsOf = (lesson) => lesson.phases.map((p) => ({ id: p.id, name: p.name, minutes: p.minutes }));


export async function mountUnterricht(root, data) {
  // The material's „Zurück zur Stunde“ finds this tab by its name (zurueck.js).
  window.name = LESSON_WINDOW;
  const $ = (s) => root.querySelector(s);
  const gates = [...root.querySelectorAll("[data-gate]")];
  const gate = (name) => gates.forEach((g) => (g.hidden = g.dataset.gate !== name));
  const views = [...root.querySelectorAll("[data-view]")];
  const show = (name) => views.forEach((v) => (v.hidden = v.dataset.view !== name));

  /* -------------------------------------------------------------- who ---- */
  $("[data-signin-link]").href = `/anmelden?next=${encodeURIComponent(currentPath() + location.search)}`;
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
          $("[data-teacher-error]").textContent = ERR;
        }
      });
    });
  }
  gate("ok");

  const q = new URLSearchParams(location.search);
  if (q.get("sitzung")) return mountStage(q.get("sitzung"));
  const key = keyFromParams(q);
  if (!key) return show("missing");
  return mountStart(key);

  /* ------------------------------------------------------------ start ---- */
  async function mountStart(key) {
    const found = lessonFor(data.levels, key);
    if (!found?.lesson) return show("missing");
    const { level, block, lesson } = found;
    show("start");
    $("[data-start-plan]").href = planHref(key);
    $("[data-start-meta]").textContent = `${level.label} · Block ${key.block}: ${block.thema} · ${key.minuten} minutes`;
    $("[data-start-title]").textContent = `Lesson ${key.stunde}: ${lesson.final ? "Use and revise" : lesson.focus}`;
    $("[data-start-bar]").innerHTML = phaseBar(lesson.phases);

    const status = (msg) => { $("[data-start-status]").textContent = msg; };
    const list = $("[data-groups]");
    const go = $("[data-go]");
    const open = $("[data-open]");
    let groups = [];
    let chosen = null;
    let existing = null;

    try {
      groups = (await meineKlassen()).filter((k) => !k.archiviert);
    } catch {
      status("Your groups could not be loaded.");
    }

    function drawGroups() {
      list.innerHTML = groups.length
        ? groups.map((k) => `
          <label class="ut-group">
            <input type="radio" name="gruppe" value="${k.id}" ${chosen === k.id ? "checked" : ""} />
            <span>${esc(k.name)}${k.niveau ? ` <small>${esc(k.niveau)}</small>` : ""}</span>
          </label>`).join("")
        : `<p class="ut-muted">No group yet. Type a name below and the lesson will start with it.</p>`;
    }

    async function choose(id) {
      chosen = id;
      existing = null;
      open.hidden = true;
      go.hidden = false;
      setWaiting(go, null);
      try {
        existing = await offeneSitzung(id, key);
      } catch {
        status("Could not check whether a lesson is already running for this group.");
      }
      if (existing) {
        const s = T.restore(existing, stepsOf(lesson), Date.now());
        const step = lesson.phases[s.current];
        $("[data-open-text]").textContent = `You have already started lesson ${key.stunde} with this group: at ${step?.name ?? "step " + (s.current + 1)}, ${Math.round(T.lessonElapsed(s, Date.now()) / 60000)} of ${key.minuten} minutes.`;
        open.hidden = false;
        go.hidden = true;
      }
      // The next press is the start: put the keyboard there (Enter starts).
      (existing ? $("[data-resume]") : go).focus({ preventScroll: true });
    }

    const nameInput = $("[data-new-name]");
    const NOT_READY = ["Choose a group first – or type the name of a new one.", "[data-groups], [data-new-name]"];
    drawGroups();
    setWaiting(go, ...NOT_READY);
    list.addEventListener("change", (e) => {
      if (e.target.name !== "gruppe") return;
      nameInput.value = ""; // a group chosen: the start is for that one, not a new name
      choose(e.target.value);
    });
    if (groups.length === 1) { list.querySelector("input").checked = true; choose(groups[0].id); }

    // A name typed: the start is for a new group. Any chosen one lets go, and an open
    // lesson of it (Fortsetzen / Neu starten) makes room for the start button again.
    nameInput.addEventListener("input", () => {
      if (!nameInput.value.trim()) {
        if (!chosen) setWaiting(go, ...NOT_READY);
        return;
      }
      if (chosen) {
        chosen = null;
        existing = null;
        list.querySelectorAll("input:checked").forEach((r) => (r.checked = false));
      }
      open.hidden = true;
      go.hidden = false;
      setWaiting(go, null);
    });

    // „Unterricht starten“ (or Enter in the name): a new name creates the group first.
    $("[data-new]").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      if (!name) {
        if (chosen && !existing) begin(false);
        return;
      }
      go.disabled = true; // saving
      try {
        const k = await klasseAnlegen({ name, niveau: cefrOf(level.label) });
        groups = [k, ...groups];
        chosen = k.id;
        existing = null;
        nameInput.value = "";
        drawGroups(); // checked: if the start fails, the new group is there to pick
        status(`Group “${k.name}” created. The lesson is starting …`);
        await begin(false);
      } catch (err) {
        status(err?.code === "limit" ? "You already have 20 active groups. Archive one under “My classes”." : ERR);
        go.disabled = false;
      }
    });

    async function begin(fresh) {
      const btns = root.querySelectorAll("[data-go], [data-resume], [data-restart]");
      btns.forEach((b) => (b.disabled = true)); // saving
      try {
        let id = existing?.id;
        if (!existing || fresh) {
          if (existing) await sitzungSpeichern(existing.id, { status: "completed", completed_at: new Date().toISOString() });
          const now = Date.now();
          const row = await sitzungAnlegen(chosen, key, T.toRow(T.start(T.create(stepsOf(lesson), now), now)));
          id = row.id;
        }
        location.assign(sessionHref(id));
      } catch {
        status(ERR);
        btns.forEach((b) => (b.disabled = false));
      }
    }
    $("[data-resume]").addEventListener("click", () => begin(false));
    $("[data-restart]").addEventListener("click", () => begin(true));
  }

  /* ------------------------------------------------------------ stage ---- */
  async function mountStage(id) {
    let row = null;
    try {
      row = await sitzungLaden(id);
    } catch {
      // Offline: the local copy, if it is this session, still knows enough to teach.
    }
    const local = readLocal();
    if (!row && local?.id === id) row = { ...local.row, ...local.key, gruppe: local.gruppe, id };
    if (!row) return show("missing");
    const key = keyOf(row);
    const found = lessonFor(data.levels, key);
    if (!found?.lesson) return show("missing");
    const { level, block, lesson, plan } = found;
    const steps = stepsOf(lesson);
    const prev = plan.lessons[key.stunde - 2] ?? null;
    // A grammar topic page opens in present mode and gets a QR code; the Wortliste, exam
    // pages, games and teacher tools open as they are.
    const topics = new Set(block.grammar.flat().map((l) => l.href));
    const isTopic = (href) => topics.has(href);
    // The topic pages a Stunde teaches: its Grammatik links; the last Stunde has none, so the
    // block's first two grammar lines.
    const linksOf = (ls) => ls.final
      ? block.grammar.slice(0, 2).map((g) => g[0]).filter(Boolean)
      : (ls.phases.find((p) => p.id === "grammatik")?.links ?? []).filter((l) => isTopic(l.href));
    if (local?.id === id) row = { ...row, ...T.newer(local.row, row) };

    if (row.status === "completed") return showSummary(T.fromRow(row, steps), key);

    show("stage");
    const bild = data.bilder[key.niveau]?.[key.block - 1] ?? null;
    const meta = `${level.label} · Block ${key.block}: ${block.thema} · Lesson ${key.stunde}`;
    const ctl = createSteuerung({ id, key, gruppe: row.gruppe, steps, row });
    mountLeiste(ctl, { home: true, onEnd: () => { const s = ctl.state; ctl.destroy(); showSummary(s, key); } });
    $("[data-stage-meta]").textContent = `${row.gruppe} · ${meta}`;

    const timeline = $("[data-stage-bar]");
    timeline.innerHTML = phaseBar(lesson.phases, true);
    timeline.addEventListener("click", (e) => {
      const b = e.target.closest("[data-goto]");
      if (b) ctl.goTo(Number(b.dataset.goto));
    });

    let shown = -1;
    ctl.on((state) => {
      timeline.querySelectorAll("[data-goto]").forEach((b, i) => b.setAttribute("aria-current", i === state.current ? "step" : "false"));
      if (state.current === shown) return;
      const dir = shown < 0 ? 0 : state.current > shown ? 1 : -1;
      shown = state.current;
      drawStep(lesson.phases[state.current], state.current);
      slideIn($("[data-stage-card]"), dir);
    });

    // A new step comes in from the side it lies on (→ from the right, ← from the left), its
    // parts a little after each other, like the site's switches (segSwitch.js). The first
    // step on load just appears.
    function slideIn(card, dir) {
      if (!dir || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const ease = "cubic-bezier(.2,.8,.2,1)";
      [...card.children].slice(0, 10).forEach((el, i) => el.animate(
        [{ opacity: 0, transform: `translateX(${32 * dir}px)` }, { opacity: 1, transform: "none" }],
        { duration: 300, delay: i * 50, easing: ease, fill: "backwards" },
      ));
    }

    function drawStep(ph, i) {
      const card = $("[data-stage-card]");
      const col = phaseColor(ph.id);
      card.style.setProperty("--ph-bg", col.bg);
      card.style.setProperty("--ph-ink", col.ink);
      const soc = `<p class="ut-soc">${ph.social.map((f) => `<span>${SOC[f] ?? f}</span>`).join("")}</p>`;
      // Phase and Sozialform in one row at the top: how the class works is the first thing
      // the teacher says, so it is the first thing on the card.
      const head = `<div class="ut-head"><p class="ut-phase"><i></i>${i + 1}/${lesson.phases.length} · ${esc(ph.name)} · ${ph.minutes} min</p>${soc}</div>`;
      const notes = `<details class="ut-notes"${["einstieg", "anwendung"].includes(ph.id) ? "" : " open"}><summary>Procedure (for you)</summary><p>${esc(ph.text)}</p></details>`;
      // How a topic page opens: Grammatik shows it as a deck (?mode=present, few words on
      // the projector), Üben as the page itself with its exercises and „Live üben“ (?ut=1).
      // The small label says which, so the two steps' buttons do not look the same.
      // Decks (with their „Regel“) come first as an aligned table, one topic per row; videos
      // and other material after them as pills. A video that belongs to a deck (`for`, see
      // stundenplan.js) sits in that deck's row as a third choice; the others stay pills.
      const mat = (how) => {
        if (!ph.links.length) return "";
        const deckHrefs = new Set(how === "present" ? ph.links.filter((l) => isTopic(l.href)).map((l) => l.href) : []);
        const rowVideo = (href) => ph.links.find((l) => l.ext && l.for === href);
        const items = ph.links.map((l) => {
          if (l.ext && deckHrefs.has(l.for)) return "";
          if (l.ext) return `<a class="ut-mat-btn" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.name)}</a>`;
          const topic = isTopic(l.href);
          // ?ut=1: opened from the lesson, so its side list starts folded (sideNavFold.js).
          const base = how === "present" && topic ? `${l.href}?mode=present&niveau=${encodeURIComponent(cefrOf(level.label))}` : l.href;
          // Üben: „Live üben“ starts with the page (?live-start=1), the QR code is up at once.
          const href = `${base}${base.includes("?") ? "&" : "?"}ut=1${how === "ueben" && topic ? "&live-start=1" : ""}`;
          const tag = topic && how === "present" ? " <small>Present</small>" : topic && how === "ueben" ? " <small>Practise live</small>" : "";
          // A new tab: the session stays where it is; the bar there runs the same lesson.
          // „Regel“ beside a deck: the whole rule card at once (?regel=1, praesentationDeck.js),
          // the same view as „Regel ansehen“ at the end of the deck – easy to find again.
          if (topic && how === "present") {
            return { deck: true, html: `<div class="ut-deck"><a class="ut-mat-btn ut-deck-main" href="${esc(href)}" target="${MATERIAL_WINDOW}"><span>${esc(l.name)}</span><small>Present</small></a><a class="ut-mat-btn ut-deck-rule" href="${esc(href)}&amp;regel=1" target="${MATERIAL_WINDOW}" aria-label="${esc(l.name)}: view the rule">Rule</a>${(() => { const v = rowVideo(l.href); return v ? `<a class="ut-mat-btn ut-deck-video" href="${esc(v.href)}" target="_blank" rel="noopener" aria-label="${esc(v.name)}">Video</a>` : ""; })()}</div>` };
          }
          return `<a class="ut-mat-btn" href="${esc(href)}" target="${MATERIAL_WINDOW}">${esc(l.name)}${tag}</a>`;
        });
        const decks = items.filter((x) => x.deck).map((x) => x.html).join("");
        const rest = items.filter((x) => !x.deck).join("");
        return `${decks ? `<div class="ut-decks">${decks}</div>` : ""}${rest ? `<div class="ut-mat">${rest}</div>` : ""}`;
      };
      let body = "";
      if (ph.id === "einstieg") {
        const e = einstiegInhalt({ phase: ph, lesson, prev, block, bild, themen: data.themen ?? {}, linksOf });
        const foto = e.bild ? `<figure class="ut-bild"><picture>
            <source type="image/avif" srcset="${e.bild.src}-800.avif 800w, ${e.bild.src}-1600.avif 1600w" sizes="(min-width: 900px) 900px, 100vw" />
            <img src="${e.bild.src}-1200.webp" alt="${esc(e.bild.alt)}" width="1600" height="600" decoding="async" /></picture>
            ${e.bild.credit ? `<figcaption>Photo: <a href="${esc(e.bild.credit.href)}" target="_blank" rel="noopener">${esc(e.bild.credit.label)}</a></figcaption>` : ""}</figure>` : "";
        const starters = e.redemittel?.length ? `<p class="ut-label">You can start like this</p><ul class="ut-starters">${e.redemittel.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : "";
        let inhalt = "";
        if (e.kind === "bild") {
          inhalt = `<ol class="ut-fragen">${e.fragen.map((f) => `<li>${esc(f)}</li>`).join("")}</ol>`;
        } else if (e.kind === "wortigel") {
          inhalt = `<div class="ut-igel" aria-hidden="true"><span class="ut-igel-mitte">${esc(e.mitte)}</span>${"<i></i>".repeat(8)}</div>`;
        } else if (e.kind === "blitzlicht") {
          inhalt = e.beispiele.length ? `<ul class="ut-beispiele">${e.beispiele.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
        } else if (e.kind === "fragen") {
          inhalt = e.quiz.length
            ? `<ol class="ut-quiz">${e.quiz.map((q) => `<li><span>${esc(q.prompt).replace("___", '<b class="ut-gap">___</b>')}</span>
                <button type="button" class="ut-reveal" data-answer="${esc(q.answer)}">Reveal</button></li>`).join("")}</ol>`
            : `<ul class="ut-beispiele">${e.beispiele.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
        } else if (e.kind === "wiederholung") {
          inhalt = `<div class="ut-karten">${e.karten.map((k) => `<div class="ut-karte"><b>${esc(k.name)}</b>${k.beispiel ? `<span>${esc(k.beispiel)}</span>` : ""}</div>`).join("")}</div>`;
        }
        body = `
          ${foto}
          <h2 class="ut-big">${esc(e.titel)}</h2>
          ${e.untertitel ? `<p class="ut-sub">${esc(e.untertitel)}</p>` : ""}
          ${inhalt}${starters}${notes}`;
      } else if (ph.id === "anwendung") {
        const goals = lesson.goals.length ? lesson.goals : [block.thema];
        const task = ph.text.includes(" – ") ? ph.text.slice(ph.text.lastIndexOf(" – ") + 3).replace(/\.$/, "") : "";
        body = `
          <p class="ut-eyebrow">Speaking task</p>
          <ul class="ut-goals">${goals.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>
          ${task && !lesson.final ? `<p class="ut-sub">${esc(task)}</p>` : `<p class="ut-sub">${esc(ph.text)}</p>`}
          `;
      } else if (ph.id === "wortschatz") {
        body = `
          <h2 class="ut-big ut-big--sm">${esc(block.thema)}</h2>
          <ul class="ut-words">${block.wortschatz.map((w, j) => `<li><button type="button" class="ut-word" data-feld="${j}" aria-expanded="false">${esc(w)}</button></li>`).join("")}</ul>
          <div class="ut-feld" data-feld-panel></div>
          ${mat(false)}${notes}`;
      } else if (ph.id === "grammatik") {
        body = `
          <h2 class="ut-big ut-big--sm">${esc(lesson.final ? block.grammatik.join(" · ") : lesson.focus)}</h2>
          ${mat("present")}${notes}`;
      } else if (ph.id === "uebung") {
        const topics = ph.links.filter((l) => isTopic(l.href));
        body = `
          <h2 class="ut-big ut-big--sm">Practice: ${esc(lesson.focus)}</h2>
          ${mat("ueben")}
          ${topics.length ? `<p class="ut-sub ut-sub--hint">Open the exercises with a QR code: the class does them on their phones and you see the results.</p>` : ""}
          ${topics.length ? `<button type="button" class="lp-btn lp-btn--outline ut-qr-open" data-qr-open>Link/QR for learners</button>` : ""}
          ${notes}`;
      } else {
        body = `<h2 class="ut-big ut-big--sm">${esc(ph.name)}</h2><p class="ut-sub">${esc(ph.text)}</p>${mat(false)}`;
      }
      card.innerHTML = head + body;
      card.querySelector("[data-qr-open]")?.addEventListener("click", () => openQr(ph.links.filter((l) => isTopic(l.href))));
      card.querySelectorAll("[data-answer]").forEach((b) => b.addEventListener("click", () => {
        b.closest("li").querySelector(".ut-gap").textContent = b.dataset.answer;
        b.remove();
      }));
      card.querySelectorAll("[data-feld]").forEach((b) => b.addEventListener("click", () => openFeld(card, b)));
    }

    // A Wortfeld pill opens what the class does with it: the task to read out and the words,
    // with article and plural where the A1 list has them (src/data/unterricht-wortschatz.json).
    function openFeld(card, btn) {
      const panel = card.querySelector("[data-feld-panel]");
      const was = btn.getAttribute("aria-expanded") === "true";
      card.querySelectorAll("[data-feld]").forEach((b) => b.setAttribute("aria-expanded", "false"));
      if (was) { panel.removeAttribute("data-open"); return; }
      btn.setAttribute("aria-expanded", "true");
      const name = block.wortschatz[Number(btn.dataset.feld)];
      const f = data.wortfelder?.[name];
      // One card per word, all the same shape: article + word, plural, example.
      const wort = (w, i) => `<li style="--i:${i}">
          <span class="ut-w-kopf">${w.artikel ? `<small class="ut-art ut-art--${esc(w.artikel)}">${esc(w.artikel)}</small>` : ""}<b>${esc(w.text)}</b></span>
          ${w.plural && w.plural !== "-" ? `<span class="ut-w-pl">plural: ${esc(w.plural)}</span>` : ""}
          ${w.beispiel ? `<span class="ut-w-bsp">${esc(w.beispiel)}</span>` : ""}</li>`;
      panel.innerHTML = `<div class="ut-feld-in">
        <p class="ut-label">Task · ${esc(name)}</p>
        <p class="ut-aufgabe">${esc(f?.aufgabe ?? `Collect words for “${name}”: with a/an/some and the plural, in pairs, then on the board.`)}</p>
        ${f?.woerter?.length ? `<ul class="ut-feld-woerter">${f.woerter.map(wort).join("")}</ul>` : ""}</div>`;
      panel.hidden = false;
      // Next frame, so a closed panel grows open instead of appearing.
      requestAnimationFrame(() => panel.setAttribute("data-open", ""));
    }


    // QR codes for the students' phones: the plain topic page, no session, no account.
    const qr = $("[data-qr]");
    async function openQr(links) {
      const items = await Promise.all(links.map(async (l) => {
        const url = new URL(l.href, location.origin).href;
        return `<figure class="ut-qr-item"><div class="ut-qr-svg">${await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" })}</div>
          <figcaption><b>${esc(l.name)}</b><span>${esc(url.replace(/^https?:\/\//, ""))}</span></figcaption></figure>`;
      }));
      $("[data-qr-list]").innerHTML = items.join("");
      qr.hidden = false;
      $("[data-qr-close]").focus();
    }
    $("[data-qr-close]").addEventListener("click", () => (qr.hidden = true));

    // Projector remote and keyboard: → / PageDown next, ← / PageUp back, P pause.
    document.addEventListener("keydown", (e) => {
      if (e.target.closest?.("input, textarea, select, [contenteditable]") || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "Escape" && !qr.hidden) return (qr.hidden = true);
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); ctl.next(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); ctl.prev(); }
      else if (e.key === "p" || e.key === "P") ctl.toggle();
    });

    const stage = $("[data-stage]");
    $("[data-fullscreen]").addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else document.documentElement.requestFullscreen?.().catch(() => {});
    });
    stage.hidden = false;
  }

  /* ---------------------------------------------------------- summary ---- */
  function showSummary(state, key) {
    clearLocal();
    show("done");
    const now = state.lastActiveAt;
    $("[data-done-time]").textContent = `${Math.round(T.lessonElapsed(state, now) / 60000)} of ${state.steps.reduce((s, x) => s + x.minutes, 0)} minutes`;
    $("[data-done-rows]").innerHTML = state.steps.map((st, i) => {
      const m = Math.round(T.elapsed(state, now, i) / 60000);
      return `<tr><td><i style="background:${phaseColor(st.id).bg}"></i>${esc(st.name)}</td><td>${st.minutes} min</td><td${m > st.minutes ? ' class="ut-over"' : ""}>${m} min</td></tr>`;
    }).join("");
    $("[data-done-plan]").href = planHref(key);
  }
}

/** The plan's timeline bar; on the stage each phase is a button that jumps to it. */
function phaseBar(phases, buttons = false) {
  return phases.map((p, i) => {
    const style = `flex:${p.minutes};background:${phaseColor(p.id).bg}`;
    // every phase named, the short ones too (a 5-minute Abschluss was a blank tab); the
    // tab is at least as wide as its name (unterricht.css), the rest by minutes
    const label = esc(p.name);
    return buttons
      ? `<button type="button" data-goto="${i}" style="${style}" title="${esc(p.name)} · ${p.minutes} min" aria-label="Go to step ${i + 1}: ${esc(p.name)}">${label}</button>`
      : `<span style="${style}" title="${esc(p.name)} · ${p.minutes} min">${label}</span>`;
  }).join("");
}

