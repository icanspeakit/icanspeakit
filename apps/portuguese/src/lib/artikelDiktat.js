// The dictation of the articles topic (ArtikelDiktat.astro): hear "a estação", type it, get told
// exactly what was off (the article, the accent or the spelling) rather than just "wrong".
//
// There are no pt-PT recordings yet, so the browser's Portuguese voice says the words (pt-PT first;
// many devices only have pt-BR). A browser without speech gets the English meaning instead: the
// task is then to write the Portuguese word.
//
// A round is ten nouns, drawn afresh each time. An answer is checked once; the learner then
// sees the right form, can hear it again, and goes on. Each answer is recorded like any other
// article answer, so it counts on /progress.
import { recordAttempt } from "./progress.js";
import { t } from "./uiText.js";

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
/** Without accents and the cedilla (ç → c): only to tell an accent slip from a spelling mistake. */
const plain = (s) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/**
 * What was wrong, in the order a teacher would say it. `typed` is split into article and noun on
 * the first space. A capital at the start is fine: that is how a sentence would begin.
 * @returns {{ ok: boolean, notes: string[] }}
 */
export function check(typed, q) {
  const said = typed.trim().replace(/\s+/g, " ");
  const [art = "", ...rest] = said.split(" ");
  const noun = rest.join(" ");
  const artLow = art.toLowerCase();
  if (artLow === q.gender && noun.toLowerCase() === q.lemma.toLowerCase()) return { ok: true, notes: [] };
  const vars = { article: q.gender, said: artLow, word: q.lemma };
  const notes = [];
  if (!noun) notes.push(t("akd.note.both", "Write the article and the noun, for example “a casa”."));
  else {
    if (["um", "uma", "uns", "umas"].includes(artLow)) notes.push(t("akd.note.indefinite", "You hear the definite article: “{article}”, not “{said}”.", vars));
    else if (!["o", "a", "os", "as"].includes(artLow)) notes.push(t("akd.note.notArticle", "“{said}” is not an article. It is “{article}”.", vars));
    else if (artLow !== q.gender) notes.push(t("akd.note.article", "The article is “{article}”, not “{said}”.", vars));
    const low = noun.toLowerCase();
    if (low !== q.lemma.toLowerCase()) {
      if (plain(low) === plain(q.lemma)) notes.push(t("akd.note.accent", "Check the accent: {word}.", vars));
      else notes.push(t("akd.note.spelling", "The noun is spelled differently: {word}.", vars));
    }
  }
  return { ok: false, notes };
}

/** A Portuguese voice, Portugal first. False when the browser has no speech at all. */
const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;
function say(text, slow) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-PT";
  u.rate = slow ? 0.6 : 0.9;
  const voices = synth.getVoices();
  const v = voices.find((x) => /^pt(-|_)PT/i.test(x.lang)) ?? voices.find((x) => /^pt(-|_)/i.test(x.lang));
  if (v) u.voice = v;
  synth.speak(u);
}

export function mountDiktat(root, { round: ROUND, pool }) {
  const $ = (s) => root.querySelector(s);
  const input = $("[data-akd-input]");
  const form = $("[data-akd-form]");
  const feedback = $("[data-akd-feedback]");
  const next = $("[data-akd-next]");
  const count = $("[data-akd-count]");
  const score = $("[data-akd-score]");
  const slow = $("[data-akd-slow]");
  const done = $("[data-akd-done]");
  const checkBtn = $("[data-akd-check]");
  const meaning = $("[data-akd-meaning]");

  let items = [];
  let i = 0;
  let right = 0;
  let answered = false;

  function play() {
    const q = items[i];
    if (!q) return;
    say(`${q.gender} ${q.lemma}`, slow.getAttribute("aria-pressed") === "true");
  }

  function show() {
    const q = items[i];
    answered = false;
    form.hidden = false;
    done.hidden = true;
    feedback.hidden = true;
    next.hidden = true;
    input.value = "";
    input.disabled = false;
    checkBtn.hidden = false;
    input.classList.remove("is-ok", "is-no");
    count.textContent = `${i + 1} / ${items.length}`;
    score.textContent = i ? t("akd.right", "{n} right", { n: right }) : "";
    // No voice: the meaning is the prompt. With a voice it would give nothing away either, but a
    // dictation is about listening.
    if (meaning) {
      meaning.hidden = canSpeak();
      meaning.textContent = q ? q.en : "";
    }
  }

  function start() {
    items = shuffle(pool.slice()).slice(0, ROUND);
    i = 0;
    right = 0;
    show();
  }

  function finish() {
    form.hidden = true;
    feedback.hidden = true;
    next.hidden = true;
    done.hidden = false;
    if (meaning) meaning.hidden = true;
    count.textContent = `${items.length} / ${items.length}`;
    score.textContent = "";
    $("[data-akd-done-title]").textContent = t("akd.done.title", "{n} of {m} written correctly.", { n: right, m: items.length });
    $("[data-akd-done-text]").textContent =
      right === items.length
        ? t("akd.done.all", "All correct: articles, accents and spelling.")
        : t("akd.done.some", "The mistakes may come back in the next dictation. Again?");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = items[i];
    if (!q || answered || !input.value.trim()) return;
    answered = true;
    const r = check(input.value, q);
    if (r.ok) right++;
    input.disabled = true;
    checkBtn.hidden = true;
    input.classList.add(r.ok ? "is-ok" : "is-no");
    feedback.hidden = false;
    feedback.className = `akd-feedback ${r.ok ? "is-ok" : "is-no"}`;
    const answer = `<b lang="pt-PT">${esc(q.gender)} ${esc(q.lemma)}</b>`;
    feedback.innerHTML = r.ok
      ? `<p class="akd-verdict">${esc(t("akd.ok", "Correct:"))} ${answer}</p>`
      : `<p class="akd-verdict">${esc(t("akd.no", "The right answer:"))} ${answer}</p><ul>${r.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`;
    score.textContent = t("akd.right", "{n} right", { n: right });
    next.hidden = false;
    next.textContent = i + 1 < items.length ? t("akd.next", "Next") : t("akd.result", "Result");
    next.focus();
    recordAttempt({ skill: "grammatik", correct: r.ok, id: q.id, trackVocab: true, topic: "artikel", ref: "g:artikel/diktat" });
  });

  next.addEventListener("click", () => {
    i++;
    if (i >= items.length) return finish();
    show();
    input.focus();
    play();
  });

  $("[data-akd-play]").addEventListener("click", () => { play(); if (!answered) input.focus(); });
  slow.addEventListener("click", () => {
    slow.setAttribute("aria-pressed", String(slow.getAttribute("aria-pressed") !== "true"));
    play();
  });
  // Accents and ñ for keyboards that have none, typed where the cursor is.
  root.querySelectorAll("[data-akd-key]").forEach((b) =>
    b.addEventListener("click", () => {
      if (input.disabled) return;
      const { selectionStart: s = input.value.length, selectionEnd: e = s } = input;
      input.value = input.value.slice(0, s) + b.dataset.akdKey + input.value.slice(e);
      input.setSelectionRange(s + 1, s + 1);
      input.focus();
    }),
  );
  $("[data-akd-again]").addEventListener("click", () => { start(); input.focus(); play(); });

  // Silent whenever the panel is not on screen: leaving the beat must not leave a voice.
  const panel = root.closest("[data-beat-panel]");
  if (panel && canSpeak()) new MutationObserver(() => { if (panel.hidden) window.speechSynthesis.cancel(); }).observe(panel, { attributes: true, attributeFilter: ["hidden"] });

  start();
}
