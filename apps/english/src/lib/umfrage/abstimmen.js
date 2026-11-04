// /survey — a phone answers a class poll: code → intro → one question per screen → sent.
// Every question may be skipped; „Weiter“ says „Überspringen“ while nothing is chosen.
// The answer goes out once, at the end, through umfrage_abstimmen (daten.js). A phone that
// answered before starts from its last answer, so changing it is the same walk again.
// With a time limit (umfragen.zeit, minutes for the whole poll) every question has its own
// clock, its share of that time by length (zeit.js), shown large above the question. When a
// question's time is up the walk moves on, keeping what was chosen; after the last one the
// answers go out on their own. There is no „Zurück“ then: each question had its time.
// Where the walk stands (question, answers, end of its clock) is kept on the phone, so a
// reload does not start a clock again; each new walk („Antwort ändern“) starts fresh.
import { getLang } from "../i18n.js";
import { loadText, t } from "../liveQuiz/text.js";
import { abstimmen, isCode, laden, meineAntwort, normCode } from "./daten.js";
import { sichtbar } from "./katalog.js";
import { verteilung } from "./zeit.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const MAX_TEXT = 500;
const STAND_KEY = (code) => `da_umfrage_stand_${code}`;
const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const readStand = (code) => {
  try { return JSON.parse(localStorage.getItem(STAND_KEY(code)) || "null"); } catch { return null; }
};
const dropStand = (code) => {
  try { localStorage.removeItem(STAND_KEY(code)); } catch {}
};

export async function mountAbstimmen(root) {
  const $ = (s) => root.querySelector(s);
  const screens = [...root.querySelectorAll("[data-screen]")];
  const show = (name) => {
    screens.forEach((s) => (s.hidden = s.dataset.screen !== name));
    window.scrollTo({ top: 0 });
  };

  let code = normCode(new URLSearchParams(location.search).get("c"));
  let poll = null;
  let a = {};
  let i = 0; // index into the questions shown (sichtbar) right now
  let screen = "loading";
  let ende = 0; // when the current question's time runs out (ms), 0 = no limit
  let dauer = 0; // that question's whole time (ms), for the bar
  let sek = new Map(); // question id → its seconds (zeit.js), empty without a limit
  let tick = null;
  const go = (name) => {
    screen = name;
    if (name !== "frage") stopTimer();
    show(name);
  };
  await loadText(() => { if (poll) { drawIntro(); if (screen === "frage") drawQuestion(); } });

  const fragen = () => poll.fragen.filter((f) => sichtbar(f, a));
  const answered = (f) => {
    const v = a[f.id];
    return Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== "";
  };

  /* ------------------------------------------------------------- code ---- */
  async function open() {
    go("loading");
    try {
      poll = await laden(code);
    } catch (err) {
      console.error(err);
      return fatal(t("uf.s.err.net", "Keine Verbindung. Prüfe das Internet und versuch es noch einmal."));
    }
    if (!poll) {
      go("code");
      $("[data-code-input]").value = code;
      $("[data-code-error]").textContent = t("uf.s.err.code", "Diesen Code gibt es nicht. Schau noch einmal auf die Tafel.");
      return;
    }
    if (!poll.offen) return go("zu");
    history.replaceState(null, "", `/survey?c=${code}`);
    a = structuredClone(meineAntwort(code) ?? {});
    drawIntro();
    go("intro");
  }

  $("[data-code-form]").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("[data-code-input]").value;
    if (!isCode(v)) {
      $("[data-code-error]").textContent = t("uf.s.err.format", "Der Code hat 6 Zeichen, zum Beispiel ABC234.");
      return;
    }
    code = normCode(v);
    open();
  });

  /* ------------------------------------------------------------ intro ---- */
  function drawIntro() {
    $("[data-poll-title]").textContent = poll.titel;
    const n = poll.fragen.length;
    if (poll.zeit) {
      const s = verteilung(poll.fragen, poll.niveau, poll.zeit);
      sek = new Map(poll.fragen.map((f, k) => [f.id, s[k]]));
      $("[data-intro-count]").textContent = t("uf.s.zeit.intro", "{n} kurze Fragen. Jede Frage hat ihre eigene Zeit, {a} bis {b} Sekunden. Die Uhr siehst du groß über der Frage.", { n, a: Math.min(...s), b: Math.max(...s) });
    } else {
      $("[data-intro-count]").textContent = t("uf.s.count", "{n} kurze Fragen, etwa {m} Minuten.", { n, m: Math.max(1, Math.round(n / 3)) });
    }
    const again = !!meineAntwort(code);
    $("[data-again]").hidden = !again;
    $("[data-start]").textContent = again ? t("uf.s.change", "Antwort ändern") : t("uf.s.start", "Los geht's");
  }
  $("[data-start]").addEventListener("click", () => {
    // A timed walk that a reload interrupted goes on where it was, with the clock it had.
    const stand = poll.zeit ? readStand(code) : null;
    if (stand?.a && Number.isInteger(stand.i)) {
      a = stand.a;
      i = Math.min(stand.i, fragen().length - 1);
      drawQuestion();
      go("frage");
      return startTimer(stand.ende, stand.dauer);
    }
    i = 0;
    drawQuestion();
    go("frage");
    startTimer();
  });

  /* ------------------------------------------------------------ timer ---- */
  /** The current question's clock: a fresh one, or (after a reload) the one it had. */
  function startTimer(keptEnde, keptDauer) {
    stopTimer();
    $("[data-clock]").hidden = !poll.zeit;
    if (!poll.zeit) return (ende = 0);
    const f = fragen()[i];
    dauer = keptDauer || (sek.get(f.id) ?? 30) * 1000;
    ende = keptEnde || Date.now() + dauer;
    saveStand();
    drawTimer();
    tick = setInterval(drawTimer, 250);
  }
  function stopTimer() {
    clearInterval(tick);
    tick = null;
  }
  function saveStand() {
    if (!poll.zeit || !ende) return;
    try { localStorage.setItem(STAND_KEY(code), JSON.stringify({ i, a, ende, dauer })); } catch {}
  }
  function drawTimer() {
    const left = Math.max(0, ende - Date.now());
    const share = dauer ? left / dauer : 0;
    const s = Math.ceil(left / 1000);
    const el = $("[data-clock]");
    $("[data-clock-num]").textContent = s >= 60 ? mmss(left) : String(s);
    $("[data-clock-unit]").hidden = s >= 60;
    $("[data-clock-bar]").style.width = `${(share * 100).toFixed(1)}%`;
    el.classList.toggle("is-low", share <= 0.34 || left <= 10_000);
    el.classList.toggle("is-end", left <= 5_000);
    el.setAttribute("aria-label", t("uf.s.zeit.left", "Noch {t} für diese Frage", { t: mmss(left) }));
    if (left <= 0) {
      stopTimer();
      timeUp();
    }
  }
  /** A question's time is up: on to the next one with what was chosen, or send after the last. */
  function timeUp() {
    const list = fragen();
    if (i >= list.length - 1) return send(true);
    i++;
    drawQuestion();
    startTimer();
    const note = $("[data-zeit-note]");
    note.textContent = t("uf.s.zeit.next", "Die Zeit für die letzte Frage war um. Weiter geht's.");
    note.hidden = false;
  }

  /* --------------------------------------------------------- question ---- */
  const de = () => getLang() === "de";

  function drawQuestion() {
    const list = fragen();
    const f = list[i];
    $("[data-step]").textContent = t("uf.s.step", "Frage {n} von {total}", { n: i + 1, total: list.length });
    $("[data-progress-bar]").style.width = `${Math.round((100 * i) / list.length)}%`;
    const q = t(f.k ?? "", f.frage);
    $("[data-ask-q]").textContent = q;
    // The German under the translation: it is a German class, and the question is short.
    $("[data-ask-de]").hidden = de() || q === f.frage;
    $("[data-ask-de]").textContent = f.frage;
    $("[data-ask-hint]").textContent = f.typ === "multi"
      ? t("uf.s.multi", "Wähle bis zu {max}.", { max: f.max ?? f.optionen.length })
      : f.typ === "single" ? t("uf.s.single", "Wähle eine Antwort.") : t("uf.s.text", "Schreib auf Deutsch oder in deiner Sprache.");
    $("[data-ask-error]").textContent = "";
    $("[data-zeit-note]").hidden = true;

    if (f.typ === "text") {
      $("[data-opts]").innerHTML = `<textarea class="uf-text" rows="5" maxlength="${MAX_TEXT}" data-text aria-label="${esc(q)}">${esc(a[f.id] ?? "")}</textarea>`;
    } else {
      const chosen = [a[f.id]].flat();
      const type = f.typ === "single" ? "radio" : "checkbox";
      $("[data-opts]").innerHTML = f.optionen
        .map((o) => {
          // Grammar topics have no key: they are German content, shown as they are.
          const label = o.k ? t(o.k, o.text) : o.text;
          return `<label class="uf-opt">
            <input type="${type}" name="opt" value="${esc(o.id)}" ${chosen.includes(o.id) ? "checked" : ""} />
            ${o.emoji ? `<span class="uf-opt-ic" aria-hidden="true">${o.emoji}</span>` : ""}
            <span class="uf-opt-text" ${o.k ? "" : 'lang="en" dir="ltr"'}>${esc(label)}</span>
          </label>`;
        })
        .join("");
    }
    syncNext();
  }

  function syncNext() {
    const list = fragen();
    const f = list[i];
    const last = i === list.length - 1;
    $("[data-next]").textContent = last ? t("uf.s.send", "Absenden") : answered(f) ? t("lq.join.next", "Weiter") : t("uf.s.skip", "Überspringen");
    $("[data-back]").hidden = i === 0 || !!poll.zeit;
    saveStand();
  }

  $("[data-opts]").addEventListener("change", (e) => {
    const f = fragen()[i];
    if (e.target.name !== "opt") return;
    if (f.typ === "single") {
      a[f.id] = e.target.value;
    } else {
      const picks = [...$("[data-opts]").querySelectorAll("input:checked")].map((x) => x.value);
      if (picks.length > (f.max ?? 99)) {
        e.target.checked = false;
        $("[data-ask-error]").textContent = t("uf.s.err.max", "Höchstens {max}. Nimm erst eine andere Antwort heraus.", { max: f.max });
        return;
      }
      $("[data-ask-error]").textContent = "";
      a[f.id] = picks;
    }
    syncNext();
  });
  $("[data-opts]").addEventListener("input", (e) => {
    if (!e.target.matches("[data-text]")) return;
    a[fragen()[i].id] = e.target.value.slice(0, MAX_TEXT);
    syncNext();
  });

  $("[data-back]").addEventListener("click", () => {
    if (i === 0 || poll.zeit) return;
    i--;
    drawQuestion();
  });
  $("[data-next]").addEventListener("click", () => {
    const list = fragen();
    if (i < list.length - 1) {
      i++;
      drawQuestion();
      startTimer();
      return;
    }
    // The last question: its clock stops while sending; if that fails, a tap tries again.
    stopTimer();
    send(false);
  });

  /** Sends the answers: at the end of the walk, or when the last question's time is up. */
  async function send(timeUp) {
    const list = fragen();
    // Only what the questions shown still ask: an answer to a question that a later choice
    // hid (Schreiben-Arten after switching to Sprechen) is dropped.
    const out = {};
    for (const f of list) if (answered(f)) out[f.id] = f.typ === "text" ? a[f.id].trim() : a[f.id];
    const btn = $("[data-next]");
    if (timeUp) btn.textContent = t("uf.s.send", "Absenden"); // if sending fails, a tap tries again
    btn.disabled = true;
    try {
      const r = await abstimmen(code, out);
      if (r === "ok") {
        dropStand(code);
        $("[data-timeup]").hidden = !timeUp;
        return go("fertig");
      }
      if (r === "zu") return go("zu");
      $("[data-ask-error]").textContent = r === "voll"
        ? t("uf.s.err.full", "Diese Umfrage hat schon zu viele Antworten.")
        : t("kl.t.err.generic", "Das hat gerade nicht geklappt. Prüfe die Internetverbindung und versuch es noch einmal.");
    } catch (err) {
      console.error(err);
      $("[data-ask-error]").textContent = t("uf.s.err.net", "Keine Verbindung. Prüfe das Internet und versuch es noch einmal.");
    } finally {
      btn.disabled = false;
    }
  }
  $("[data-change]").addEventListener("click", () => {
    a = structuredClone(meineAntwort(code) ?? {});
    i = 0;
    drawQuestion();
    go("frage");
    startTimer();
  });

  /* ------------------------------------------------------------ error ---- */
  function fatal(msg) {
    $("[data-fatal]").textContent = msg;
    go("fehler");
  }
  $("[data-retry]").addEventListener("click", open);

  if (isCode(code)) open();
  else go("code");
}
