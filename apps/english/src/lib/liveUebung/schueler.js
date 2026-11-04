// Live üben, the phone's side: a topic page opened with ?live=PIN (the teacher's QR code).
// Asks for a name once, then works like the page always does – and after every checked
// answer sends this phone's summary to the teacher's board. A slim bar at the foot says
// that it is live, under which name, and how far along. See protocol.js.
//
// When the teacher opens "Live üben" on another topic, the phone follows at once if nothing
// has been answered here yet; otherwise the bar offers the way over.
import { createBrowserSupabase } from "../supabase/browser.js";
import { setWaiting } from "../notReady.js";
import { topicPath } from "../routes.js";
import { channelName, cleanName, makeId, PIN_RE, pickOf, summarize, totalOf, wrongOf } from "./protocol.js";
import "../../styles/live-uebung.css";

const NAME_KEY = "da-lu-name";
const ID_KEY = "da-lu-id";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const get = (k, store = localStorage) => { try { return store.getItem(k); } catch { return null; } };
const put = (k, v, store = localStorage) => { try { store.setItem(k, v); } catch {} };

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
  // The items wrong right now, with what was typed: for the teacher's Auswertung.
  const WRONG_KEY = `${ANS_KEY}:f`;
  let wrong = {};
  try { wrong = JSON.parse(sessionStorage.getItem(WRONG_KEY) ?? "{}") ?? {}; } catch {}

  const bar = document.createElement("div");
  bar.className = "lu-bar";
  bar.setAttribute("role", "status");
  document.body.append(bar);
  document.body.classList.add("lu-mit-bar");
  let state = "warten"; // warten | live | ende
  let away = null; // { topic, title } the teacher moved on to

  function drawBar() {
    const mine = Object.entries(answers).filter(([k]) => picked(k.split("/")[0]));
    const done = mine.length;
    const right = mine.filter(([, ok]) => ok).length;
    const total = exercises.reduce((n, ex, i) => n + (picked(i) ? totalOf(ex) : 0), 0);
    if (state === "ende") {
      bar.innerHTML = `<span class="lu-bar-t">The live round has ended. You can keep practising here.</span>`;
      return;
    }
    const where = away
      ? `<a class="lu-btn lu-btn--main" href="/${esc(away.topic)}?live=${pin}">Mitgehen: ${esc(away.title)}</a>`
      : "";
    bar.innerHTML = `
      <span class="lu-live${state === "live" ? "" : " lu-live--wait"}" aria-hidden="true"></span>
      <span class="lu-bar-t"><b>${esc(name)}</b> · ${state === "live" ? `${right} correct · ${Math.min(done, total)}/${total}` : "Waiting for the teacher …"}</span>
      ${where}
      <button type="button" class="lu-bar-name" data-lu-rename>Change name</button>`;
    bar.querySelector("[data-lu-rename]").addEventListener("click", () => ask(true));
  }

  // The name, once (kept for the next live round on this phone).
  function ask(again = false) {
    return new Promise((resolve) => {
      const sheet = document.createElement("div");
      sheet.className = "lu-ask";
      sheet.innerHTML = `<form class="lu-ask-card" novalidate>
          <p class="lu-ask-eyebrow"><span class="lu-live" aria-hidden="true"></span> Live with your class</p>
          <h2>${esc(data.name ?? "")}</h2>
          <label for="lu-name">What's your name?</label>
          <input id="lu-name" name="name" autocomplete="given-name" maxlength="24" value="${esc(again ? name : "")}" />
          <p class="lu-ask-note">Your teacher sees your name and how far you are. Nothing is saved.</p>
          <button type="submit" class="lu-btn lu-btn--main">Join</button>
        </form>`;
      document.body.append(sheet);
      const input = sheet.querySelector("input");
      const go = sheet.querySelector("button");
      const check = () => setWaiting(go, cleanName(input.value) ? null : "Schreib zuerst deinen Namen.", "#lu-name");
      input.addEventListener("input", check);
      check();
      sheet.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const n = cleanName(input.value);
        if (!n) return;
        name = n;
        put(NAME_KEY, n);
        if (joined) ch.track({ name: n });
        sheet.remove();
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
    sendTimer = setTimeout(() => ch.send({ type: "broadcast", event: "stand", payload: { id, name, topic, ex: summarize(answers), f: wrongOf(wrong) } }), 200);
  }

  function follow(hostTopic, title) {
    if (!hostTopic || hostTopic === topic) { away = null; return; }
    // Nothing done here yet: just go. Otherwise the bar offers it.
    if (!Object.keys(answers).length) { location.assign(`${topicPath(hostTopic)}?live=${pin}`); return; }
    away = { topic: hostTopic, title: title || hostTopic };
  }

  ch.on("broadcast", { event: "hallo" }, ({ payload }) => {
    state = "live";
    follow(String(payload?.topic ?? ""), String(payload?.title ?? ""));
    if (!away) applyPick(payload?.ex);
    drawBar();
    send();
  });
  ch.on("broadcast", { event: "ende" }, () => {
    state = "ende";
    drawBar();
    supabase.removeChannel(ch);
  });
  ch.on("presence", { event: "sync" }, () => {
    if (state === "ende") return;
    // The newest teacher tab wins: that is the topic the class is on now.
    const hosts = (ch.presenceState().host ?? []).filter((h) => h && h.topic);
    const host = hosts.sort((a, b) => (b.at ?? 0) - (a.at ?? 0))[0];
    state = host ? "live" : "warten";
    if (host) follow(String(host.topic), String(host.title ?? ""));
    if (host && !away) applyPick(host.ex);
    drawBar();
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
  if (!name) ask();
}
