// The Manners Simulator (/games/manners): one day of manners and small talk, as a life sim.
// The learner picks a mascot and lives through scenes (./scenes.js). In each turn someone
// talks, the learner picks a reply; the reply moves that person's Sympathie (0–100, starts at
// 50) and the overall Ruf (moved by delta / 2). A floating label (“+12 😊 Asked back”) rises
// over the player, the Laune-Blase above their head follows the last delta, and a “Why?”
// line explains every choice – good ones too. No single right answer, no game over.
//
// Screens: start (mascot picker) → the day's areas → scenes of an area → the area's result →
// the next area. The first day goes in order; after one full day every area is free to pick
// (localStorage, try/catch: if storage fails, everything is open). Sympathie and Ruf carry
// over from area to area within a day. Keys: 1–4 pick a reply, Enter = Next. “Next”
// before a choice stays tappable and says why (notReady.js).
import { recordAttempt } from "../progress.js";
import { MASCOT_LABELS, mascotSvg } from "../mascots.js";
import { setWaiting } from "../notReady.js";
import { t } from "../uiText.js";
import { track } from "../track.js";
import { createVoice } from "../spielKit.js";
import { withBase } from "../paths.js";
import { AREAS, MOODS, PLAYERS, TOPICS, TOPIC_DELTA, areaById, titleFor, topicById, topicKind } from "./scenes.js";

const PLAYER_KEY = "da-knigge-player";
/** "1" once a whole day was played: then every area is free to pick. */
const DAY_KEY = "da-knigge-day";
const SOUND_KEY = "da-knigge-sound";
/** The topics each person was found to like (Smalltalk-Rad): { [personId]: [topicId] }. */
const KNOWN_KEY = "da-knigge-known";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const icon = (code, size = 28, cls = "") => `<img class="${cls}" src="${withBase(`/img/openmoji/${code}.svg`)}" alt="" width="${size}" height="${size}" />`;
const clamp = (v) => Math.max(0, Math.min(100, v));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

const voice = createVoice((clip) => withBase(`/audio/knigge/${clip}.mp3`));

/** The player's mascot, as stored (or Bruno). */
export function storedPlayer() {
  const p = store.get(PLAYER_KEY);
  return PLAYERS.includes(p) ? p : "bruno";
}
export function setPlayer(name) { if (PLAYERS.includes(name)) store.set(PLAYER_KEY, name); }

function knownLikes() {
  try { return JSON.parse(localStorage.getItem(KNOWN_KEY) || "{}") || {}; } catch { return {}; }
}
function learnLike(personId, topicId) {
  const k = knownLikes();
  const list = new Set(k[personId] ?? []);
  if (list.has(topicId)) return;
  list.add(topicId);
  k[personId] = [...list];
  store.set(KNOWN_KEY, JSON.stringify(k));
}

/** The mood for a delta: { icon, expr }. */
const moodOf = (delta) => MOODS.find((m) => delta >= m.min);

export function mountKnigge(root) {
  const $ = (sel) => root.querySelector(sel);
  const stage = $("[data-stage]");
  const sheet = $("[data-sheet]");
  const live = $("[data-live]");
  let soundOn = store.get(SOUND_KEY) !== "0";

  /** @type {any} */
  let S = null;

  // --- casting: a person is played by their mascot, unless the player is that mascot ------
  function cast(scene) {
    const taken = new Set([S.player]);
    const out = {};
    for (const p of scene.people) {
      let m = p.mascot;
      if (taken.has(m)) m = PLAYERS.find((x) => !taken.has(x) && !scene.people.some((q) => q.mascot === x));
      taken.add(m);
      out[p.id] = m;
    }
    return out;
  }

  const symp = (id) => S.symp[id] ?? 50;
  const scene = () => S.area.scenes[S.sceneIdx];
  const turn = () => scene().turns[S.turnIdx];
  const person = (id) => scene().people.find((p) => p.id === id);

  // --- the stage -------------------------------------------------------------------------
  function paintStage() {
    const sc = scene();
    const casting = (S.casting = cast(sc));
    const mood = S.mood ?? moodOf(5);
    stage.className = `kn-stage kn-bg--${sc.backdrop}`;
    stage.innerHTML = `
      <div class="kn-props" aria-hidden="true">${(sc.props ?? []).map((p) => `<img src="${withBase(`/img/openmoji/${p.icon}.svg`)}" alt="" style="left:${p.x}%;top:${p.y}%;" width="56" height="56" />`).join("")}</div>
      <div class="kn-bars">${sc.people.map((p) => barHtml(p, casting[p.id])).join("")}</div>
      <div class="kn-cast">
        <div class="kn-actor kn-actor--me" data-me>
          <span class="kn-blase" data-blase>${icon(mood.icon, 34)}</span>
          <span class="kn-float" data-float hidden></span>
          <span data-me-svg>${mascotSvg({ name: S.player, expr: mood.expr, size: 112, label: t("kn.you", "You") })}</span>
          <span class="kn-actor-name">${esc(t("kn.you", "You"))}</span>
        </div>
        ${sc.people.map((p) => `
          <div class="kn-actor" data-actor="${p.id}">
            <span data-actor-svg>${mascotSvg({ name: casting[p.id], view: "three", size: 104, label: p.name })}</span>
            <span class="kn-actor-name">${esc(p.name)}</span>
          </div>`).join("")}
      </div>`;
  }

  function barHtml(p, mascot) {
    const v = symp(p.id);
    return `<div class="kn-bar" data-bar="${p.id}" role="img" aria-label="${esc(t("kn.sympAria", "How much {name} likes you: {n} of 100", { name: p.name, n: v }))}">
      <span class="kn-bar-head">${mascotSvg({ name: mascot, size: 30, label: "" })}</span>
      <span class="kn-bar-track"><i style="width:${v}%" class="${v < 40 ? "is-low" : v > 70 ? "is-high" : ""}"></i></span>
    </div>`;
  }

  function paintBars() {
    for (const p of scene().people) {
      const el = stage.querySelector(`[data-bar="${p.id}"]`);
      if (!el) continue;
      const v = symp(p.id);
      const i = el.querySelector("i");
      i.style.width = `${v}%`;
      i.className = v < 40 ? "is-low" : v > 70 ? "is-high" : "";
      el.setAttribute("aria-label", t("kn.sympAria", "How much {name} likes you: {n} of 100", { name: p.name, n: v }));
    }
  }

  function paintRuf() {
    const r = Math.round(S.ruf);
    $("[data-ruf-n]").textContent = r;
    $("[data-ruf-bar]").style.width = `${r}%`;
    $("[data-ruf]").setAttribute("aria-label", t("kn.rufAria", "Reputation: {n} of 100", { n: r }));
  }

  /** The label that rises over the player, and the mood bubble / face. */
  function feedback(o) {
    const mood = (S.mood = moodOf(o.delta));
    const me = stage.querySelector("[data-me]");
    me.querySelector("[data-blase]").innerHTML = icon(mood.icon, 34);
    me.querySelector("[data-me-svg]").innerHTML = mascotSvg({ name: S.player, expr: mood.expr, size: 112, label: t("kn.you", "You") });
    const f = me.querySelector("[data-float]");
    f.hidden = false;
    f.className = `kn-float ${o.delta >= 3 ? "is-good" : o.delta <= -3 ? "is-bad" : "is-meh"}`;
    f.textContent = `${o.delta > 0 ? "+" : o.delta < 0 ? "−" : "±"}${Math.abs(o.delta)} ${o.tag}`;
    // Restart the rise, so two choices in a row both show.
    void f.offsetWidth;
    f.classList.add("is-on");
    clearTimeout(f._t);
    f._t = setTimeout(() => { f.hidden = true; f.classList.remove("is-on"); }, 1600);
    live.textContent = `${o.delta > 0 ? "+" : ""}${o.delta} ${o.tag}`;
    const actor = stage.querySelector(`[data-actor="${o.by ?? turn().who}"]`);
    actor?.classList.remove("is-pos", "is-neg");
    void actor?.offsetWidth;
    actor?.classList.add(o.delta >= 3 ? "is-pos" : o.delta <= -3 ? "is-neg" : "is-meh");
  }

  // --- the dialogue sheet ------------------------------------------------------------------
  function paintTurn() {
    const sc = scene();
    const tu = turn();
    const who = person(tu.who);
    S.chosen = null;
    if (tu.wheel) {
      if (S.wheel?.turn !== tu) S.wheel = { turn: tu, left: tu.wheel, picked: new Set() };
      return paintWheel(sc, tu, who);
    }
    const step = t("kn.step", "{place} · {i} of {n}", { place: sc.place, i: S.turnIdx + 1, n: sc.turns.length });
    sheet.innerHTML = `
      <p class="kn-step">${esc(step)}</p>
      ${tu.situation ? `<p class="kn-situation" lang="en">${esc(tu.situation)}</p>` : ""}
      ${tu.npc ? `
        <div class="kn-who">
          ${mascotSvg({ name: S.casting[who.id], size: 40, label: "" })}
          <div><b>${esc(who.name)}</b><span>${esc(who.role)}</span></div>
        </div>
        <p class="kn-line" lang="es">“${esc(tu.npc)}”</p>
        <div class="kn-tools">
          <button type="button" class="kn-tool" data-hear>🔊 ${esc(t("kn.hear", "Listen"))}</button>
          ${tu.en ? `<button type="button" class="kn-tool" data-help aria-expanded="false">💡 ${esc(t("kn.help", "Help"))}</button>` : ""}
        </div>
        ${tu.en ? `<p class="kn-gloss" lang="en" data-gloss hidden>${esc(tu.en)}</p>` : ""}` : `<div class="kn-tools"><button type="button" class="kn-tool" data-help aria-expanded="false">💡 ${esc(t("kn.help", "Help"))}</button></div>`}
      <p class="kn-you">${esc(t("kn.youSay", "What do you do?"))}</p>
      <div class="kn-opts">${tu.options.map((o, k) => `
        <button type="button" class="kn-opt" data-opt="${k}" lang="es"><span class="kn-opt-n">${k + 1}</span><span>${esc(o.de)}${o.en ? `<small class="kn-opt-en" lang="en" data-gloss hidden>${esc(o.en)}</small>` : ""}</span></button>`).join("")}
      </div>
      <div class="kn-after" data-after></div>
      <div class="kn-btns"><button type="button" class="quiz-btn quiz-btn--primary" data-go>${esc(t("kn.next", "Next"))}</button></div>`;
    setWaiting(sheet.querySelector("[data-go]"), t("kn.pickFirst", "Pick an answer first."), ".kn-opt");
    sheet.querySelector("[data-hear]")?.addEventListener("click", () => voice.say(null, tu.npc, true));
    sheet.querySelector("[data-help]")?.addEventListener("click", (e) => {
      const open = e.currentTarget.getAttribute("aria-expanded") !== "true";
      e.currentTarget.setAttribute("aria-expanded", String(open));
      sheet.querySelectorAll("[data-gloss]").forEach((g) => (g.hidden = !open));
    });
    sheet.querySelectorAll("[data-opt]").forEach((b) => b.addEventListener("click", () => choose(Number(b.dataset.opt))));
    sheet.querySelector("[data-go]").addEventListener("click", () => { if (S.chosen != null) next(); });
    if (tu.npc && soundOn) setTimeout(() => { if (sheet.isConnected && S.chosen == null) voice.say(null, tu.npc, true); }, 250);
    sheet.scrollTop = 0;
  }

  function choose(k) {
    if (S.chosen != null) return;
    const tu = turn();
    const o = tu.options?.[k];
    if (!o) return;
    S.chosen = k;
    sheet.querySelectorAll("[data-opt]").forEach((b, n) => {
      b.setAttribute("aria-disabled", "true");
      b.tabIndex = -1;
      b.classList.toggle("is-picked", n === k);
      b.classList.toggle("is-faded", n !== k);
    });
    apply(o, `knigge-${scene().id}-${S.turnIdx}`, k);
  }

  /** A reply counts: the bars move, the label rises, the person answers, “Why?” shows. */
  function apply(o, item, option) {
    const target = o.by ?? turn().who;
    S.symp[target] = clamp(symp(target) + o.delta);
    S.ruf = clamp(S.ruf + o.delta / 2);
    S.log.push({ area: S.area.id, scene: scene().id, turn: S.turnIdx, option, delta: o.delta, tag: o.tag, de: o.de, why: o.why, who: target });
    try { recordAttempt({ skill: "sprechen", topic: "spiel-knigge", item, correct: o.delta >= 10 }); } catch {}
    const by = person(target);
    const more = scene().more;
    sheet.querySelector("[data-after]").innerHTML = `
      <div class="kn-react">
        ${mascotSvg({ name: S.casting[target], size: 36, label: "" })}
        <p lang="es"><b>${esc(by.name)}:</b> ${esc(o.react)}${o.reactEn ? `<small class="kn-opt-en" lang="en">${esc(o.reactEn)}</small>` : ""}</p>
      </div>
      <p class="kn-why"><b>${esc(t("kn.why", "Why?"))}</b> <span lang="en">${esc(o.why)}</span></p>
      ${more ? `<a class="kn-more" href="${esc(withBase(more))}" target="_blank" rel="noopener">${esc(t("kn.more", "Find out more"))} ↗</a>` : ""}`;
    const go = sheet.querySelector("[data-go]");
    setWaiting(go, null);
    go.focus({ preventScroll: true });
    feedback(o);
    paintBars();
    paintRuf();
    const spoken = o.react.replace(/\([^)]*\)/g, "").trim(); // stage directions are English
    if (soundOn && spoken) voice.say(null, spoken, true);
  }

  // --- the Smalltalk-Rad: pick a topic; the person's hidden taste decides ----------------------
  const KIND_TAG = {
    like: ["kn.topic.like", "😊 Favourite topic!"],
    ok: ["kn.topic.ok", "🙂 Safe topic"],
    dislike: ["kn.topic.dislike", "😐 Not interested"],
    taboo: ["kn.topic.taboo", "😱 Taboo topic"],
  };
  function paintWheel(sc, tu, who) {
    const w = S.wheel;
    const known = new Set(knownLikes()[who.id] ?? []);
    const n = TOPICS.length;
    sheet.innerHTML = `
      <p class="kn-step">${esc(t("kn.step", "{place} · {i} of {n}", { place: sc.place, i: S.turnIdx + 1, n: sc.turns.length }))}</p>
      ${tu.situation ? `<p class="kn-situation" lang="en">${esc(tu.situation)}</p>` : ""}
      <p class="kn-you">${esc(w.left > 1 ? t("kn.wheelPickN", "Small-talk wheel: pick a topic ({n} to go).", { n: w.left }) : t("kn.wheelPick", "Small-talk wheel: pick a topic."))}</p>
      <div class="kn-wheel" role="group" aria-label="${esc(t("kn.wheel", "Small-talk wheel"))}">
        <span class="kn-wheel-hub">${mascotSvg({ name: S.casting[who.id], size: 64, label: who.name })}</span>
        ${TOPICS.map((tp, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + 39 * Math.cos(a), y = 50 + 39 * Math.sin(a);
          const used = w.picked.has(tp.id);
          return `<button type="button" class="kn-topic${used ? " is-used" : ""}" data-topic="${tp.id}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%"${used ? ' aria-disabled="true"' : ""}>
            ${icon(tp.icon, 30)}<span lang="en">${esc(t(`kn.topic.${tp.id}`, tp.label))}</span>${known.has(tp.id) ? '<b class="kn-topic-tip" title="Likes this topic">💡</b>' : ""}
          </button>`;
        }).join("")}
      </div>
      ${known.size ? `<p class="kn-hint">💡 ${esc(t("kn.wheelKnown", "= {name} likes talking about this. You found that out earlier.", { name: who.name }))}</p>` : ""}
      <div class="kn-after" data-after></div>
      <div class="kn-btns"><button type="button" class="quiz-btn quiz-btn--primary" data-go>${esc(t("kn.next", "Next"))}</button></div>`;
    setWaiting(sheet.querySelector("[data-go]"), t("kn.pickTopic", "Pick a topic first."), ".kn-topic:not(.is-used)");
    sheet.querySelectorAll("[data-topic]").forEach((b) => b.addEventListener("click", () => pickTopic(b.dataset.topic)));
    sheet.querySelector("[data-go]").addEventListener("click", () => {
      if (S.chosen == null) return;
      if (S.wheel.left > 0) paintTurn();
      else next();
    });
  }

  function pickTopic(id) {
    const w = S.wheel;
    if (S.chosen != null || w.picked.has(id)) return;
    const tu = turn();
    const who = person(tu.who);
    const tp = topicById(id);
    const kind = topicKind(who.talk, id);
    S.chosen = id;
    w.picked.add(id);
    w.left--;
    const label = t(`kn.topic.${tp.id}`, tp.label);
    const why = kind === "taboo" ? tp.why
      : kind === "like" ? `Bingo: ${who.name} loves talking about ${label.toLowerCase()}. Remember that!`
      : kind === "dislike" ? `Not taboo – but ${who.name} doesn’t feel like talking about ${label.toLowerCase()} right now.`
      : `${label} is a safe small-talk topic.`;
    if (kind === "like") learnLike(who.id, id);
    const [tagKey, tagDe] = KIND_TAG[kind];
    sheet.querySelectorAll("[data-topic]").forEach((b) => {
      b.setAttribute("aria-disabled", "true");
      b.classList.toggle("is-picked", b.dataset.topic === id);
    });
    // What you said, above the answer.
    const said = tp.say[tu.du ? "du" : "sie"];
    const saidEn = tp.sayEn?.[tu.du ? "du" : "sie"];
    sheet.querySelector(".kn-wheel").insertAdjacentHTML("afterend", `<p class="kn-said" lang="es"><b>${esc(t("kn.you", "You"))}:</b> “${esc(said)}”</p>${saidEn ? `<p class="kn-gloss" lang="en">${esc(saidEn)}</p>` : ""}`);
    apply({ de: said, delta: TOPIC_DELTA[kind], tag: t(tagKey, tagDe), react: tp.re[kind] ?? tp.re.ok ?? tp.re.taboo, reactEn: tp.reEn?.[kind] ?? tp.reEn?.ok ?? tp.reEn?.taboo, why }, `knigge-${scene().id}-${S.turnIdx}-${id}`, id);
  }

  function next() {
    voice.stop();
    if (S.turnIdx + 1 < scene().turns.length) {
      S.turnIdx++;
      paintTurn();
      return;
    }
    if (S.sceneIdx + 1 < S.area.scenes.length) {
      S.sceneIdx++;
      S.turnIdx = 0;
      S.mood = null;
      paintStage();
      paintTurn();
      return;
    }
    areaDone();
  }

  // --- the area's result ---------------------------------------------------------------------
  function areaDone() {
    track("knigge_area_done", { area: S.area.id, ruf: Math.round(S.ruf) });
    S.done.add(S.area.id);
    const nextArea = AREAS.find((a) => !S.done.has(a.id)) ?? null;
    if (!nextArea) store.set(DAY_KEY, "1");
    const mine = S.log.filter((l) => l.area === S.area.id);
    const best = mine.reduce((a, b) => (b.delta > a.delta ? b : a), mine[0]);
    const worst = mine.reduce((a, b) => (b.delta < a.delta ? b : a), mine[0]);
    const met = new Map();
    for (const sc of S.area.scenes) for (const p of sc.people) if (!met.has(p.id)) met.set(p.id, { p, mascot: cast(sc)[p.id] });
    const title = titleFor(Math.round(S.ruf));
    stage.className = "kn-stage kn-bg--bilanz";
    stage.innerHTML = `<div class="kn-cast kn-cast--solo"><div class="kn-actor kn-actor--me">
      <span class="kn-blase">${icon(title.icon, 34)}</span>
      ${mascotSvg({ name: S.player, expr: S.ruf >= 55 ? "celebrate" : "oops", size: 120, label: t("kn.you", "You") })}
    </div></div>`;
    sheet.innerHTML = `
      <p class="kn-step">${esc(t("kn.areaDone", "Done: {area}", { area: S.area.title }))}</p>
      <h2 class="kn-result-title">${icon(title.icon, 36)} ${esc(t(title.key, title.de))}</h2>
      <p class="kn-result-ruf">${esc(t("kn.rufNow", "Your reputation: {n} of 100", { n: Math.round(S.ruf) }))}</p>
      <h3 class="kn-h3">${esc(t("kn.people", "What they think of you"))}</h3>
      <ul class="kn-people">${[...met.values()].map(({ p, mascot }) => `
        <li>${mascotSvg({ name: mascot, size: 34, label: "" })}<span><b>${esc(p.name)}</b> <small>${esc(p.role)}</small></span>
          <span class="kn-bar-track"><i style="width:${symp(p.id)}%" class="${symp(p.id) < 40 ? "is-low" : symp(p.id) > 70 ? "is-high" : ""}"></i></span></li>`).join("")}
      </ul>
      ${best ? `<div class="kn-moment is-best"><b>${esc(t("kn.best", "Best moment"))}</b><p lang="es">“${esc(best.de)}” <span class="kn-tag" lang="en">${esc(best.tag)}</span></p><p class="kn-why" lang="en">${esc(best.why)}</p></div>` : ""}
      ${worst && worst.delta < 0 ? `<div class="kn-moment is-worst"><b>${esc(t("kn.worst", "Biggest blunder"))}</b><p lang="es">“${esc(worst.de)}” <span class="kn-tag" lang="en">${esc(worst.tag)}</span></p><p class="kn-why" lang="en">${esc(worst.why)}</p></div>` : ""}
      <div class="kn-btns">
        ${nextArea ? `<button type="button" class="quiz-btn quiz-btn--primary" data-next-area>${esc(t("kn.nextArea", "Next: {area}", { area: nextArea.title }))}</button>` : ""}
        <button type="button" class="quiz-btn${nextArea ? "" : " quiz-btn--primary"}" data-areas>${esc(nextArea ? t("kn.areas", "Areas") : t("kn.dayDone", "Day done – areas"))}</button>
        <button type="button" class="quiz-btn" data-again>${esc(t("kn.againArea", "Play this area again"))}</button>
      </div>`;
    sheet.querySelector("[data-next-area]")?.addEventListener("click", () => playArea(nextArea.id));
    sheet.querySelector("[data-areas]").addEventListener("click", showAreas);
    sheet.querySelector("[data-again]").addEventListener("click", () => playArea(S.area.id));
    sheet.querySelector("button").focus({ preventScroll: true });
  }

  function exit() {
    voice.stop();
    root.dispatchEvent(new CustomEvent("kn:exit"));
  }

  // --- the day: which areas are open --------------------------------------------------------
  /** Open: a full day was played (or storage fails), or it is the next area in order. */
  function areaOpen(id) {
    let free = true;
    try { free = localStorage.getItem(DAY_KEY) === "1"; } catch {}
    if (free) return true;
    const next = AREAS.find((a) => !S.done.has(a.id));
    return S.done.has(id) || next?.id === id;
  }

  function showAreas() {
    voice.stop();
    stage.className = "kn-stage kn-bg--tag";
    stage.innerHTML = `
      <div class="kn-props" aria-hidden="true">${AREAS.map((a, i) => `<img src="${withBase(`/img/openmoji/${a.icon}.svg`)}" alt="" style="left:${12 + i * 19}%;top:16%;" width="56" height="56" />`).join("")}</div>
      <div class="kn-cast kn-cast--solo"><div class="kn-actor kn-actor--me">
        <span class="kn-blase">${icon("1F642", 34)}</span>
        ${mascotSvg({ name: S.player, expr: "happy", size: 120, label: t("kn.you", "You") })}
      </div></div>`;
    sheet.innerHTML = `
      <p class="kn-step">${esc(t("kn.dayTitle", "Your day"))}</p>
      <h2 class="kn-h2">${esc(t("kn.whereTo", "Where to now?"))}</h2>
      <div class="kn-areas">${AREAS.map((a) => {
        const done = S.done.has(a.id);
        return `<button type="button" class="kn-area${done ? " is-done" : ""}" data-area="${a.id}">
          ${icon(a.icon, 36)}
          <span><b lang="en">${esc(a.title)}</b><small lang="en">${esc(a.scenes.map((sc) => sc.place).join(" · "))}</small></span>
          <span class="kn-area-state">${done ? "✓" : areaOpen(a.id) ? "▶" : "🔒"}</span>
        </button>`;
      }).join("")}</div>`;
    sheet.querySelectorAll("[data-area]").forEach((b) => {
      const open = areaOpen(b.dataset.area);
      setWaiting(b, open ? null : t("kn.areaLocked", "The first time, the day goes in order. After that you can choose freely."));
      b.addEventListener("click", () => { if (areaOpen(b.dataset.area)) playArea(b.dataset.area); });
    });
    (sheet.querySelector(".kn-area:not([aria-disabled]):not(.is-done)") ?? sheet.querySelector(".kn-area"))?.focus({ preventScroll: true });
  }

  /** Plays one area; Sympathie and Ruf go on from the areas before. */
  function playArea(id) {
    S.area = areaById(id) ?? AREAS[0];
    S.sceneIdx = 0;
    S.turnIdx = 0;
    S.mood = null;
    S.log = S.log.filter((l) => l.area !== S.area.id);
    paintStage();
    paintTurn();
  }

  // --- start: a new day ------------------------------------------------------------------------
  function start() {
    S = { player: storedPlayer(), area: AREAS[0], sceneIdx: 0, turnIdx: 0, ruf: 50, symp: {}, log: [], mood: null, chosen: null, done: new Set() };
    track("knigge_start", { player: S.player });
    paintRuf();
    showAreas();
  }

  // --- keys: 1–4 pick a reply, Enter = Next. On the document: after “Next” the focused
  // button is gone and focus sits on <body>. ---------------------------------------------------
  document.addEventListener("keydown", (e) => {
    if (!S || root.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    if (document.querySelector("dialog[open]")) return;
    if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4 && S.chosen == null && sheet.querySelector(`[data-opt="${n - 1}"]`)) {
      e.preventDefault();
      choose(n - 1);
    } else if (e.key === "Enter" && S.chosen != null && !(e.target instanceof HTMLElement && e.target.closest("a, button:not([data-go])"))) {
      e.preventDefault();
      sheet.querySelector("[data-go]")?.click();
    }
  });

  const soundBtn = $("[data-sound]");
  const paintSound = () => {
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    soundBtn.textContent = soundOn ? "🔊" : "🔇";
  };
  paintSound();
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    store.set(SOUND_KEY, soundOn ? "1" : "0");
    if (!soundOn) voice.stop();
    paintSound();
  });

  return { start, exit };
}

export { MASCOT_LABELS };
