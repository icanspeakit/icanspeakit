// Live üben, the phone's side: a topic page opened with ?live=PIN (the teacher's QR code).
// Asks for a name once, then works like the page always does – and after every checked
// answer sends this phone's summary to the teacher's board. A slim bar at the foot says
// that it is live, under which name, and how far along. See protocol.js.
//
// When the teacher opens "Live üben" on another topic, the phone follows at once if nothing
// has been answered here yet; otherwise the bar offers the way over.
import { getLang, loadDict } from "../i18n.js";
import { createBrowserSupabase } from "../supabase/browser.js";
import { onUiText, t } from "../uiText.js";
import { setWaiting } from "../notReady.js";
import { topicPath } from "../routes.js";
import { withBase } from "../paths.js";
import { animalName } from "../liveQuiz/names.js";
import { channelName, cleanName, makeId, openOf, PIN_RE, pickOf, summarize, totalOf, wrongOf } from "./protocol.js";
import "../../styles/live-uebung.css";

const NAME_KEY = "da-lu-name";
const ID_KEY = "da-lu-id";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const get = (k, store = localStorage) => { try { return store.getItem(k); } catch { return null; } };
const put = (k, v, store = localStorage) => { try { store.setItem(k, v); } catch {} };
const topicHref = (topic, pin) => `${withBase(topicPath(topic))}?live=${pin}`;

/** The PIN of this page's address, or null. */
export function livePin() {
  const pin = new URLSearchParams(location.search).get("live");
  return PIN_RE.test(pin ?? "") ? pin : null;
}

export function joinLiveUebung(data, topic, pin) {
  const exercises = data.exercises ?? [];
  // The exercises the teacher picked (null = all); the others are hidden on this phone.
  let pick = null;
  const picked = (i) => !pick || pick.includes(Number(i));
  function applyPick(raw) {
    pick = pickOf(raw, exercises.length);
    exercises.forEach((_, i) => {
      const card = document.getElementById(`uebung-${i + 1}`);
      if (card) card.hidden = !picked(i);
    });
  }
  let id = get(ID_KEY);
  if (!id) { id = makeId(); put(ID_KEY, id); }
  let name = cleanName(get(NAME_KEY));
  // This page's answers survive a reload of the tab: the teacher's row should not reset.
  const ANS_KEY = `lu:${pin}:${topic}`;
  let answers = {};
  try { answers = JSON.parse(sessionStorage.getItem(ANS_KEY) ?? "{}") ?? {}; } catch {}
  // The items wrong right now, with what was typed: for the teacher's results.
  const WRONG_KEY = `${ANS_KEY}:f`;
  let wrong = {};
  try { wrong = JSON.parse(sessionStorage.getItem(WRONG_KEY) ?? "{}") ?? {}; } catch {}
  // "Check everything and hand in" pressed on this page: the teacher's board shows a ✓.
  const AB_KEY = `${ANS_KEY}:ab`;
  let handedIn = get(AB_KEY, sessionStorage) === "1";
  const totals = exercises.map(totalOf);

  const bar = document.createElement("div");
  bar.className = "lu-bar";
  bar.setAttribute("role", "status");
  document.body.append(bar);
  document.body.classList.add("lu-mit-bar");
  // Scrolled to from code, nothing lands behind the bar.
  document.documentElement.style.scrollPaddingBottom = "72px";
  let state = "warten"; // warten | live | ende

  // The exercise's own "Check" sits at its end, so behind this bar or further down a long
  // exercise: phones answered everything and never saw it. With answers waiting and that button
  // off screen, the bar offers it too. It presses the real one, so nothing here judges anything.
  const checkBtn = document.createElement("button");
  checkBtn.type = "button";
  checkBtn.className = "lu-btn lu-btn--main lu-bar-check";
  checkBtn.hidden = true;
  let checkTarget = null;
  let barHandsIn = false;
  const hasAnswers = (scope) =>
    !!scope.querySelector(".is-chosen, .vp-chip-chosen") || [...scope.querySelectorAll("input, textarea")].some((i) => i.value.trim());
  function waitingCheck() {
    const mid = innerHeight / 2;
    const card = exercises.map((_, i) => document.getElementById(`uebung-${i + 1}`)).find((c) => {
      if (!c || c.hidden) return false;
      const r = c.getBoundingClientRect();
      return r.top <= mid && r.bottom >= mid;
    });
    if (!card) return null;
    const dist = (b) => Math.abs(b.getBoundingClientRect().top - mid);
    return activeChecks(card).sort((a, b) => dist(a) - dist(b))[0] ?? null;
  }
  // The buttons of one exercise that would judge something now. A sentence builder has one per
  // sentence; everything else one per exercise.
  function activeChecks(card) {
    return [...card.querySelectorAll(".vp-btn-check")]
      .filter((b) => !b.disabled && b.getAttribute("aria-disabled") !== "true" && b.offsetParent)
      .filter((b) => hasAnswers(b.closest(".vp-build-item") ?? card));
  }
  const shownCards = () => exercises
    .map((_, i) => [i, document.getElementById(`uebung-${i + 1}`)])
    .filter(([i, c]) => c && !c.hidden && picked(i));
  /** Chosen but not checked yet, per exercise. */
  function pendingNow() {
    const out = {};
    for (const [i, card] of shownCards()) {
      const active = activeChecks(card);
      if (!active.length) continue;
      const chosen = card.querySelectorAll(".vp-pill-opt.is-chosen, .vp-gap.is-chosen, .is-filled").length;
      const typed = [...card.querySelectorAll("input, textarea")].filter((el) => el.value.trim()).length;
      out[i] = chosen + typed + active.filter((b) => b.closest(".vp-build-item")).length;
    }
    return out;
  }
  const shownIdx = () => shownCards().map(([i]) => i).filter((i) => totals[i] > 0);
  /** Presses every button that has answers waiting. Empty tasks stay open: see "da:answer". */
  function checkAll() {
    for (const [, card] of shownCards()) activeChecks(card).forEach((b) => { if (b.isConnected) b.click(); });
  }

  // The end of the round for this phone: at the foot of the page, and in the bar once nothing
  // is open, so it cannot be missed the way "Check" was.
  const foot = document.createElement("section");
  foot.className = "lu-submit";
  foot.innerHTML = `<div class="lu-submit-t"><b data-lu-foot-h></b><p data-lu-foot-p></p></div>
    <button type="button" class="lu-btn lu-btn--main" data-lu-handin></button>`;
  document.querySelector(".vp-ex-grid")?.after(foot);
  function drawFoot(pending) {
    const shown = shownIdx();
    const sum = summarize(answers);
    const total = shown.reduce((n, i) => n + totals[i], 0);
    const open = openOf(sum, totals, shown, pending);
    const waiting = Object.values(pending).some(Boolean);
    const right = shown.reduce((n, i) => n + Math.min(sum[i]?.[0] ?? 0, totals[i]), 0);
    foot.hidden = state === "ende";
    foot.classList.toggle("lu-submit--ab", handedIn);
    foot.querySelector("[data-lu-foot-h]").textContent = handedIn ? t("lu.s.foot.done", "✓ Handed in") : t("lu.s.foot.ready", "Finished?");
    foot.querySelector("[data-lu-foot-p]").textContent = handedIn
      ? t("lu.s.foot.result", "{right} of {total} correct. You can still improve your answers – your teacher will see it.", { right, total })
      : t("lu.s.foot.count", "{done} of {total} tasks answered.", { done: total - open, total });
    const btn = foot.querySelector("[data-lu-handin]");
    btn.hidden = handedIn && !waiting;
    btn.textContent = handedIn ? t("lu.s.checkAll", "Check everything") : t("lu.s.handin", "Check everything and hand in");
    return open;
  }

  function askOpen(n) {
    return new Promise((resolve) => {
      const sheet = document.createElement("div");
      sheet.className = "lu-ask";
      sheet.innerHTML = `<div class="lu-ask-card" role="dialog" aria-modal="true">
          <h2>${n === 1 ? t("lu.s.open1", "1 task still open") : t("lu.s.openN", "{n} tasks still open", { n })}</h2>
          <p class="lu-ask-note">${t("lu.s.openNote", "Open tasks don't count as wrong. In exercises you have started, you'll see the answers afterwards.")}</p>
          <button type="button" class="lu-btn lu-btn--main" data-lu-more>${t("lu.s.more", "Keep practising")}</button>
          <button type="button" class="lu-btn" data-lu-anyway>${t("lu.s.anyway", "Hand in anyway")}</button>
        </div>`;
      document.body.append(sheet);
      const done = (v) => { sheet.remove(); resolve(v); };
      sheet.querySelector("[data-lu-more]").addEventListener("click", () => done(false));
      sheet.querySelector("[data-lu-anyway]").addEventListener("click", () => done(true));
      sheet.addEventListener("keydown", (e) => { if (e.key === "Escape") done(false); });
      sheet.querySelector("[data-lu-more]").focus();
    });
  }
  async function handIn() {
    const pending = pendingNow();
    const shown = shownIdx();
    const open = openOf(summarize(answers), totals, shown, pending);
    if (open && !handedIn && !(await askOpen(open))) {
      // Back to the first exercise with something open.
      const sum = summarize(answers);
      const first = shown.find((i) => (sum[i]?.[1] ?? 0) + (pending[i] ?? 0) < totals[i]);
      if (first != null) document.getElementById(`uebung-${first + 1}`)?.scrollIntoView({ block: "start" });
      return;
    }
    checkAll();
    handedIn = true;
    put(AB_KEY, "1", sessionStorage);
    // After checkAll's answers have come in (they arrive as events).
    setTimeout(sendNow, 0);
    sendNow();
    drawBar();
    drawCheck();
  }
  foot.querySelector("[data-lu-handin]").addEventListener("click", handIn);

  let checkFrame = 0;
  function drawCheck() {
    cancelAnimationFrame(checkFrame);
    checkFrame = requestAnimationFrame(() => {
      const open = drawFoot(pendingNow());
      const b = waitingCheck();
      const r = b?.getBoundingClientRect();
      const inView = r && r.top >= 72 && r.bottom <= bar.getBoundingClientRect().top;
      checkTarget = b && !inView ? b : null;
      // Nothing open: the bar's job is the hand-in, which checks whatever is still waiting.
      barHandsIn = !handedIn && !open && state !== "ende";
      checkBtn.hidden = !barHandsIn && !checkTarget;
      bar.classList.toggle("lu-bar--check", !checkBtn.hidden);
      if (barHandsIn) checkBtn.textContent = t("lu.s.handinShort", "Hand in");
      else if (checkTarget) checkBtn.textContent = checkTarget.textContent.trim();
    });
  }
  checkBtn.addEventListener("click", () => {
    if (barHandsIn) return handIn();
    if (!checkTarget?.isConnected) return drawCheck();
    checkTarget.scrollIntoView({ block: "center" });
    checkTarget.click();
    drawCheck();
  });
  addEventListener("scroll", drawCheck, { passive: true });
  addEventListener("resize", drawCheck);
  // After the exercise has drawn itself anew.
  for (const type of ["click", "input"]) document.addEventListener(type, () => setTimeout(drawCheck, 0));
  let away = null; // { topic, title } the teacher moved on to

  function drawBar() {
    const mine = Object.entries(answers).filter(([k]) => picked(k.split("/")[0]));
    const done = mine.length;
    const right = mine.filter(([, ok]) => ok).length;
    const total = exercises.reduce((n, ex, i) => n + (picked(i) ? totalOf(ex) : 0), 0);
    if (state === "ende") {
      bar.innerHTML = `<span class="lu-bar-t">${t("lu.s.ended", "The live round has ended. You can keep practising here.")}</span>`;
      bar.append(checkBtn);
      return;
    }
    const where = away
      ? `<a class="lu-btn lu-btn--main" href="${esc(topicHref(away.topic, pin))}">${t("lu.s.follow", "Go along: {title}", { title: esc(away.title) })}</a>`
      : "";
    const status = state === "live"
      ? t("lu.s.status", "{right} correct · {done}/{total}", { right, done: Math.min(done, total), total })
      : t("lu.s.wait", "Waiting for the teacher …");
    bar.innerHTML = `
      <span class="lu-live${state === "live" ? "" : " lu-live--wait"}" aria-hidden="true"></span>
      <span class="lu-bar-t"><b>${handedIn ? "✓ " : ""}${esc(name)}</b> · ${status}</span>
      ${where}
      <button type="button" class="lu-bar-name" data-lu-rename>${t("lu.s.rename", "Change name")}</button>`;
    bar.querySelector("[data-lu-rename]").addEventListener("click", () => ask(true));
    bar.querySelector("[data-lu-rename]").before(checkBtn);
  }

  // The name, once (kept for the next live round on this phone).
  function ask(again = false) {
    return new Promise((resolve) => {
      const sheet = document.createElement("div");
      sheet.className = "lu-ask";
      sheet.innerHTML = `<form class="lu-ask-card" novalidate>
          <p class="lu-ask-eyebrow"><span class="lu-live" aria-hidden="true"></span> ${t("lu.s.eyebrow", "Live with your class")}</p>
          <h2>${esc(data.name ?? "")}</h2>
          <label for="lu-name">${t("lu.s.askName", "What's your name?")}</label>
          <input id="lu-name" name="name" autocomplete="given-name" maxlength="24" value="${esc(again ? name : "")}" />
          <button type="button" class="lu-ask-anon" data-lu-anon>${t("lu.s.anon", "Rather stay anonymous: use an animal name")}</button>
          <p class="lu-ask-note">${t("lu.s.note", "Your name may be shown on the board with your results. You don't have to use your real name. Nothing is saved on our servers.")}</p>
          <button type="submit" class="lu-btn lu-btn--main">${t("lu.s.join", "Join")}</button>
        </form>`;
      document.body.append(sheet);
      const input = sheet.querySelector("input");
      const go = sheet.querySelector("button[type=submit]");
      const check = () => setWaiting(go, cleanName(input.value) ? null : t("lu.s.nameFirst", "Type your name first."), "#lu-name");
      input.addEventListener("input", check);
      sheet.querySelector("[data-lu-anon]").addEventListener("click", () => {
        input.value = animalName(input.value);
        check();
      });
      check();
      sheet.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const n = cleanName(input.value);
        if (!n) return;
        name = n;
        put(NAME_KEY, n);
        if (joined) ch.track({ name: n });
        sheet.remove();
        // The teacher moved on while this phone was asking for the name: go along now.
        if (away && !Object.keys(answers).length) { location.assign(topicHref(away.topic, pin)); return; }
        drawBar();
        send();
        resolve();
      });
      input.focus();
    });
  }

  const supabase = createBrowserSupabase();
  const ch = supabase.channel(channelName(pin), { config: { broadcast: { self: false }, presence: { key: id } } });
  let joined = false;
  let sendTimer = 0;
  function send() {
    if (!joined || !name) return;
    clearTimeout(sendTimer);
    sendTimer = setTimeout(sendNow, 200);
  }
  function sendNow() {
    if (!joined || !name) return;
    clearTimeout(sendTimer);
    ch.send({ type: "broadcast", event: "stand", payload: { id, name, topic, ex: summarize(answers), f: wrongOf(wrong), ab: handedIn } });
  }

  function follow(hostTopic, title) {
    if (!hostTopic || hostTopic === topic) { away = null; return; }
    // Nothing done and the name typed: just go. Otherwise the bar offers it (a reload here
    // would wipe the name someone is typing; the name form goes along once it is sent).
    if (name && !Object.keys(answers).length) { location.assign(topicHref(hostTopic, pin)); return; }
    away = { topic: hostTopic, title: title || hostTopic };
  }

  // The newest teacher tab wins: that is the topic the class is on now. Presence alone decides.
  // With an older teacher tab still open, its "hallo" names the older topic, and following that
  // too sent phones back and forth between the two pages without end.
  function newestHost() {
    const hosts = (ch.presenceState().host ?? []).filter((h) => h && h.topic);
    return hosts.sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0] ?? null;
  }

  // After "End" this phone stays in the room: the teacher can reopen the round from the
  // results. The tab that ended it may still show in presence for a moment, so a new host is
  // one with another `at` than that tab's.
  let endedAt = null;
  const stillEnded = () => {
    if (state !== "ende") return false;
    const host = newestHost();
    return !host || host.at === endedAt;
  };

  ch.on("broadcast", { event: "hallo" }, ({ payload }) => {
    if (stillEnded()) return;
    state = "live";
    const host = newestHost();
    if (host) {
      follow(String(host.topic), String(host.title ?? ""));
      if (!away) applyPick(host.ex);
    } else if (payload?.topic === topic) {
      applyPick(payload?.ex); // presence not in yet; its sync settles where the class is
    }
    drawBar();
    send();
  });
  // "End" pressed: what is chosen but not checked still counts for the results.
  ch.on("broadcast", { event: "abschluss" }, () => {
    checkAll();
    sendNow();
  });
  ch.on("broadcast", { event: "ende" }, () => {
    endedAt = newestHost()?.at ?? null;
    state = "ende";
    drawBar();
    drawCheck();
  });
  ch.on("presence", { event: "sync" }, () => {
    if (stillEnded()) return;
    const back = state === "ende";
    const host = newestHost();
    state = host ? "live" : "warten";
    if (host) follow(String(host.topic), String(host.title ?? ""));
    if (host && !away) applyPick(host.ex);
    drawBar();
    if (back) { drawCheck(); send(); }
  });
  ch.subscribe(async (status) => {
    if (status !== "SUBSCRIBED") return;
    joined = true;
    await ch.track({ name: name || "" });
    send();
  });

  // Every checked answer on this page (grammarWorkspace.js): the last result per item counts.
  addEventListener("da:answer", (e) => {
    const d = e.detail ?? {};
    if (d.topic !== (data.slug ?? data.id) || d.ex == null || d.item == null) return;
    // "Check" with a gap left empty: still open for the teacher, not a wrong answer.
    if (d.given === "") return;
    const key = `${d.ex}/${d.item}`;
    answers[key] = !!d.ok;
    put(ANS_KEY, JSON.stringify(answers), sessionStorage);
    if (d.ok) delete wrong[key];
    else wrong[key] = { g: d.given, e: d.expected, p: d.prompt };
    put(WRONG_KEY, JSON.stringify(wrongOf(wrong)), sessionStorage);
    drawBar();
    send();
  });

  drawBar();
  drawCheck();
  onUiText(() => { drawBar(); drawCheck(); });
  // After the dictionary: the name sheet is the first thing a learner reads.
  if (!name) loadDict(getLang()).catch(() => {}).then(() => { if (!name) ask(); });
}
