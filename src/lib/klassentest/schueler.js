// /test — a phone takes a Klassentest: code → name → one question per screen → a last look →
// handed in, with the score. Every question may be skipped; „Weiter“ says „Überspringen“
// while nothing is chosen. The answers go out once, at the end, through klassentest_abgeben
// (daten.js), which grades them in the database.
//
// Where the phone stands (name, answers, question, the shuffled order of each question's
// options) is kept on the phone, so a reload or a locked screen does not start the test
// again. After handing in, the result is kept too: the test opens on it next time.
import { loadText, t } from "../liveQuiz/text.js";
import { abgeben, isCode, laden, normCode } from "./daten.js";
import { profil, teilOf, teileOf } from "./niveau.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const STAND_KEY = (code) => `da_test_stand_${code}`;
const FERTIG_KEY = (code) => `da_test_fertig_${code}`;
const NAME_KEY = "da_test_name";
const read = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
};
const write = (key, v) => {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
};

/** A Lesen text as HTML: paragraphs, **bold** for the headings the texts use. */
function textHtml(md) {
  return String(md ?? "")
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>")}</p>`)
    .join("");
}
const words = (x) => String(x ?? "").trim().split(/\s+/).filter(Boolean).length;
const TEIL_TEXT = {
  grammatik: () => t("kt.t.teil.grammatik", "Grammatik"),
  lesen: () => t("kt.t.teil.lesen", "Lesen"),
  hoeren: () => t("kt.t.teil.hoeren", "Hören"),
  schreiben: () => t("kt.t.teil.schreiben", "Schreiben"),
};

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function mountTest(root) {
  const $ = (s) => root.querySelector(s);
  const screens = [...root.querySelectorAll("[data-screen]")];
  let screen = "loading";
  const go = (name) => {
    screen = name;
    screens.forEach((s) => (s.hidden = s.dataset.screen !== name));
    window.scrollTo({ top: 0 });
  };

  let code = normCode(new URLSearchParams(location.search).get("c"));
  let test = null;
  let stand = null; // { name, a: [answer|null], i, order: [[option…]] }
  let result = null; // { richtig, gesamt, korrekt, antworten }
  await loadText(() => {
    if (!test) return;
    if (screen === "name") drawIntro();
    if (screen === "frage") drawQuestion();
    if (screen === "check") drawCheck();
    if (screen === "fertig") drawDone();
  });

  const save = () => write(STAND_KEY(code), stand);
  const fatal = (msg) => {
    $("[data-fatal]").textContent = msg;
    go("fehler");
  };
  const NET = () => t("uf.s.err.net", "Keine Verbindung. Prüfe das Internet und versuch es noch einmal.");

  /* ------------------------------------------------------------- code ---- */
  async function open() {
    go("loading");
    const done = read(FERTIG_KEY(code));
    try {
      test = await laden(code);
    } catch (err) {
      console.error(err);
      if (done) { result = done; return drawDone(); }
      return fatal(NET());
    }
    if (!test) {
      go("code");
      $("[data-code-input]").value = code;
      $("[data-code-error]").textContent = t("uf.s.err.code", "Diesen Code gibt es nicht. Schau noch einmal auf die Tafel.");
      return;
    }
    history.replaceState(null, "", `/test?c=${code}`);
    if (done) { result = done; return drawDone(); }
    if (!test.offen) return go("zu");
    const kept = read(STAND_KEY(code));
    if (kept && Array.isArray(kept.a) && kept.a.length === test.fragen.length) {
      stand = kept;
      drawQuestion();
      return go("frage");
    }
    stand = null;
    drawIntro();
    go("name");
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

  /* ------------------------------------------------------------- name ---- */
  function drawIntro() {
    $("[data-test-title]").textContent = test.titel;
    const n = test.fragen.length;
    $("[data-intro-count]").textContent = (test.niveau ? `${test.niveau} · ` : "")
      + t("kt.s.count", "{n} Fragen, etwa {m} Minuten. Du kannst Fragen überspringen.", { n, m: Math.max(2, Math.round(n / 2)) })
      + (test.art === "einstufung" ? " " + t("kt.s.countE", "Es wird schwerer. Das ist normal: Beantworte, was du kannst.") : "");
    const input = $("[data-name-input]");
    if (!input.value) input.value = read(NAME_KEY) ?? "";
  }
  $("[data-name-form]").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("[data-name-input]").value.replace(/\s+/g, " ").trim();
    if (!name) {
      $("[data-name-error]").textContent = t("kt.s.err.name", "Schreib deinen Namen, damit deine Lehrkraft weiß, von wem der Test ist.");
      $("[data-name-input]").focus();
      return;
    }
    write(NAME_KEY, name);
    stand = { name: name.slice(0, 40), a: test.fragen.map(() => null), i: 0, order: test.fragen.map((f) => shuffle(f.o ?? [])) };
    save();
    drawQuestion();
    go("frage");
  });

  /* ------------------------------------------------------------ frage ---- */
  function drawQuestion() {
    const n = test.fragen.length;
    const f = test.fragen[stand.i];
    // A test with several parts names the part: „Lesen · Frage 18 von 49“.
    const parts = teileOf(test.fragen);
    $("[data-step]").textContent = (parts.length > 1 ? `${TEIL_TEXT[teilOf(f)]()} · ` : "")
      + t("uf.s.step", "Frage {n} von {total}", { n: stand.i + 1, total: n });
    drawMedia(f);
    $("[data-progress-bar]").style.width = `${Math.round((100 * stand.i) / n)}%`;
    $("[data-task]").textContent = f.x ?? "";
    $("[data-task]").hidden = !f.x;
    $("[data-ask-q]").textContent = f.q;
    $("[data-hint]").textContent = f.h ?? "";
    $("[data-hint]").hidden = !f.h;
    const chosen = stand.a[stand.i];
    if (f.typ === "text") {
      const task = test.material?.schreiben?.[f.ref] ?? {};
      $("[data-ask-q]").textContent = task.title ?? f.q;
      $("[data-task]").hidden = true;
      $("[data-opts]").innerHTML = `
        <div class="kt-write-task">
          <p>${esc(task.situation ?? f.q)}</p>
          ${task.source ? `<blockquote class="kt-source">${textHtml(task.source)}</blockquote>` : ""}
          ${task.points?.length ? `<ul>${task.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
        </div>
        <textarea class="uf-text kt-write" rows="10" maxlength="3000" data-write lang="de" aria-label="${esc(t("kt.s.write", "Dein Text"))}">${esc(chosen ?? "")}</textarea>
        <p class="kl-muted kt-words" data-words>${esc(t("kt.s.words", "{n} Wörter", { n: words(chosen) }))}</p>`;
      return syncNav();
    }
    $("[data-opts]").innerHTML = (stand.order?.[stand.i]?.length ? stand.order[stand.i] : f.o ?? [])
      .map((o) => `<label class="uf-opt">
        <input type="radio" name="opt" value="${esc(o)}" ${o === chosen ? "checked" : ""} />
        <span class="uf-opt-text" lang="de" dir="ltr">${esc(o)}</span>
      </label>`)
      .join("");
    syncNav();
  }

  /* The reading text or the clip above its questions. The clip's player stays the same
   * element while the questions about it go by, so it keeps playing and keeps its place. */
  let mediaRef = null;
  function drawMedia(f) {
    const box = $("[data-media]");
    const teil = teilOf(f);
    const key = teil === "lesen" || teil === "hoeren" ? `${teil}/${f.ref}` : null;
    if (key === mediaRef) return;
    mediaRef = key;
    box.hidden = !key;
    if (!key) { box.innerHTML = ""; return; }
    const m = test.material?.[teil]?.[f.ref] ?? {};
    box.innerHTML = teil === "lesen"
      ? `<details class="kt-text" open><summary>${esc(m.title ?? t("kt.t.teil.lesen", "Lesen"))}</summary><div lang="de">${textHtml(m.text)}</div></details>`
      : `<div class="kt-audio"><p><strong>${esc(m.title ?? "")}</strong> · ${esc(t("kt.s.listen", "Hör zu. Du kannst den Text zweimal hören."))}</p><audio controls preload="auto" src="${esc(m.src ?? "")}"></audio></div>`;
  }

  function syncNav() {
    const last = stand.i === test.fragen.length - 1;
    const v = stand.a[stand.i];
    const has = v != null && v !== "";
    $("[data-next]").textContent = has ? (last ? t("kt.s.toCheck", "Fertig") : t("lq.join.next", "Weiter")) : t("uf.s.skip", "Überspringen");
    $("[data-back]").hidden = stand.i === 0;
  }

  $("[data-opts]").addEventListener("change", (e) => {
    if (e.target.name !== "opt") return;
    stand.a[stand.i] = e.target.value;
    save();
    syncNav();
  });
  // Writing: kept as it is typed, so a reload or a locked screen loses nothing.
  $("[data-opts]").addEventListener("input", (e) => {
    if (!e.target.matches("[data-write]")) return;
    stand.a[stand.i] = e.target.value.slice(0, 3000);
    save();
    $("[data-words]").textContent = t("kt.s.words", "{n} Wörter", { n: words(e.target.value) });
    syncNav();
  });
  $("[data-next]").addEventListener("click", () => {
    if (stand.i < test.fragen.length - 1) {
      stand.i++;
      save();
      drawQuestion();
      return go("frage");
    }
    drawCheck();
    go("check");
  });
  $("[data-back]").addEventListener("click", () => {
    if (stand.i === 0) return;
    stand.i--;
    save();
    drawQuestion();
    go("frage");
  });

  /* ------------------------------------------------------------ check ---- */
  function drawCheck() {
    const n = test.fragen.length;
    const done = stand.a.filter((x) => x != null && x !== "").length;
    $("[data-check-text]").textContent = done === n
      ? t("kt.s.check.all", "Du hast alle {n} Fragen beantwortet. Nach dem Abgeben kannst du nichts mehr ändern.", { n })
      : t("kt.s.check.some", "Du hast {d} von {n} Fragen beantwortet. Tippe auf eine Nummer, um zu einer Frage zurückzugehen. Nach dem Abgeben kannst du nichts mehr ändern.", { d: done, n });
    $("[data-check-list]").innerHTML = stand.a
      .map((x, i) => `<li><button type="button" class="kt-dot ${x != null && x !== "" ? "is-done" : ""}" data-goto="${i}" aria-label="${esc(t("uf.s.step", "Frage {n} von {total}", { n: i + 1, total: n }))}">${i + 1}</button></li>`)
      .join("");
    $("[data-send-error]").textContent = "";
  }
  $("[data-check-list]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-goto]");
    if (!b) return;
    stand.i = +b.dataset.goto;
    save();
    drawQuestion();
    go("frage");
  });
  $("[data-review]").addEventListener("click", () => {
    stand.i = 0;
    save();
    drawQuestion();
    go("frage");
  });
  $("[data-send]").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    $("[data-send-error]").textContent = "";
    try {
      const r = await abgeben(code, stand.name, stand.a);
      if (r.status === "ok" || r.status === "schon") {
        result = { richtig: r.richtig, gesamt: r.gesamt, korrekt: r.korrekt, antworten: r.status === "ok" ? stand.a : null, schon: r.status === "schon" };
        write(FERTIG_KEY(code), result);
        try { localStorage.removeItem(STAND_KEY(code)); } catch {}
        return drawDone();
      }
      if (r.status === "zu") return go("zu");
      $("[data-send-error]").textContent = r.status === "voll"
        ? t("kt.s.err.full", "Dieser Test nimmt keine Abgaben mehr an. Sag deiner Lehrkraft Bescheid.")
        : t("kt.s.err.invalid", "Das hat nicht geklappt. Prüfe deinen Namen und versuch es noch einmal.");
    } catch (err) {
      console.error(err);
      $("[data-send-error]").textContent = NET();
    } finally {
      btn.disabled = false;
    }
  });

  /* ------------------------------------------------------------- done ---- */
  function drawDone() {
    const { richtig, gesamt, korrekt = [], antworten } = result;
    $("[data-score]").textContent = `${richtig} / ${gesamt}`;
    // An Einstufungstest tells the student their level too, by the same rule the teacher sees:
    // per part when there are several. The writing is rated by the teacher, so it says that.
    const p = test?.art === "einstufung" ? profil(test.fragen, korrekt, null) : null;
    const name = (x) => (x?.niveau ? x.niveau : t("kt.t.below", "unter {l}", { l: x?.unter ?? "A1" }));
    $("[data-level]").hidden = !p?.gesamt;
    $("[data-parts]").hidden = !p || Object.keys(p.teile).length < 2;
    if (p?.gesamt) $("[data-level]").textContent = t("kt.s.level", "Dein Niveau: {l}", { l: name(p.gesamt) });
    if (p && Object.keys(p.teile).length > 1) {
      $("[data-parts]").innerHTML = Object.entries(p.teile).map(([teil, x]) => `<li><span>${esc(TEIL_TEXT[teil]())}</span> <strong>${esc(teil === "schreiben" ? t("kt.s.rated", "bewertet deine Lehrkraft") : name(x))}</strong></li>`).join("");
    }
    $("[data-score-text]").textContent = result.schon
      ? t("kt.s.done.before", "Du hattest diesen Test schon abgegeben. Das ist dein Ergebnis von damals.")
      : t("kt.s.done.text", "{r} von {n} richtig. Dein Ergebnis ist bei deiner Lehrkraft angekommen.", { r: richtig, n: gesamt });
    $("[data-done-list]").innerHTML = test
      ? test.fragen.map((f, i) => {
        const ok = korrekt[i] === true;
        const a = antworten?.[i];
        if (f.typ === "text") {
          return `<li class="is-text"><span class="kt-mark" aria-hidden="true">✍</span><span class="kt-q-text">${esc(test.material?.schreiben?.[f.ref]?.title ?? TEIL_TEXT.schreiben())}</span>
            <span class="kt-q-ans">${a ? esc(t("kt.s.written", "{n} Wörter abgegeben", { n: words(a) })) : `<em>${esc(t("kt.t.skipped", "übersprungen"))}</em>`}</span></li>`;
        }
        return `<li class="${ok ? "is-right" : "is-wrong"}">
          <span class="kt-mark" aria-hidden="true">${ok ? "✓" : "✗"}</span>
          <span class="kt-q-text" lang="de">${esc(f.q)}</span>
          ${antworten ? `<span class="kt-q-ans">${a == null ? `<em>${esc(t("kt.t.skipped", "übersprungen"))}</em>` : ok ? esc(a) : `<s>${esc(a)}</s>`}</span>` : ""}
        </li>`;
      }).join("")
      : "";
    go("fertig");
  }

  $("[data-retry]").addEventListener("click", () => open());
  $("[data-restart]").addEventListener("click", () => {
    try { localStorage.removeItem(FERTIG_KEY(code)); } catch {}
    result = null;
    open();
  });

  if (isCode(code)) open();
  else go("code");
}
