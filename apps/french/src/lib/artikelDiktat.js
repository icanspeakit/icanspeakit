// The dictation of the articles topic (ArtikelDiktat.astro): hear "la gare" or "l'école", type
// it, get told exactly what was off (the article, the elision, the accent or the spelling) rather
// than just "wrong".
//
// There are no French recordings yet, so the browser's French voice says the words (France first,
// then any French voice). A browser without speech gets the English meaning instead: the task is
// then to write the French word.
//
// A round is ten nouns, drawn afresh each time. An answer is checked once; the learner then
// sees the right form, can hear it again, and goes on. Each answer is recorded like any other
// article answer, so it counts on /progression.
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
/** Without accents (ç counts as one, content-plan §1.2); œ and æ as oe and ae. */
const plain = (s) => s.toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/\p{M}/gu, "");
/** What counts as the same text: lower case, curly apostrophe as straight, oe typed for œ. */
const same = (s) => s.toLowerCase().replace(/[’`´]/g, "'").replace(/œ/g, "oe").replace(/æ/g, "ae");

/** The written form the learner should type: "la gare", "l'école" (no space after l'). */
export const target = (q) => (q.gender === "l'" ? `l'${q.lemma}` : `${q.gender} ${q.lemma}`);

/**
 * Article and noun of what was typed: "l'école" and "l' école" split after the apostrophe, the
 * rest on the first space. `space` is true when a space followed l'.
 */
function split(said) {
  const m = said.match(/^([a-zàâäéèêëîïôöùûüç]*')\s*(.*)$/i);
  if (m) return { art: m[1], noun: m[2], space: /'\s/.test(said) };
  const [art = "", ...rest] = said.split(" ");
  return { art, noun: rest.join(" "), space: false };
}

/**
 * What was wrong, in the order a teacher would say it. A capital at the start is fine: that is
 * how a sentence would begin.
 * @returns {{ ok: boolean, notes: string[] }}
 */
export function check(typed, q) {
  const said = typed.trim().replace(/[’`´]/g, "'").replace(/\s+/g, " ");
  const { art, noun, space } = split(said);
  const artLow = art.toLowerCase();
  const nounOk = same(noun) === same(q.lemma);
  if (artLow === q.gender && nounOk && !space) return { ok: true, notes: [] };
  const vars = { article: q.gender, said: artLow, word: q.lemma, form: target(q) };
  const notes = [];
  if (!noun) notes.push(t("akd.note.both", "Write the article and the noun, for example “la maison”."));
  else {
    if (["un", "une", "des"].includes(artLow)) notes.push(t("akd.note.indefinite", "You hear the definite article: “{article}”, not “{said}”.", vars));
    else if (!["le", "la", "l'", "les"].includes(artLow)) notes.push(t("akd.note.notArticle", "“{said}” is not an article. It is “{article}”.", vars));
    else if (q.gender === "l'" && (artLow === "le" || artLow === "la")) notes.push(t("akd.note.elide", "Before a vowel or a mute h, {said} becomes l': {form}.", vars));
    else if (artLow === "l'" && q.gender !== "l'") notes.push(t("akd.note.noElide", "l' only comes before a vowel or a mute h. Here it is “{article}”: {form}.", vars));
    else if (artLow !== q.gender) notes.push(t("akd.note.article", "The article is “{article}”, not “{said}”.", vars));
    else if (space) notes.push(t("akd.note.space", "No space after l': {form}.", vars));
    if (!nounOk) {
      if (plain(noun) === plain(q.lemma)) notes.push(t("akd.note.accent", "Check the accent: {word}.", vars));
      else notes.push(t("akd.note.spelling", "The noun is spelled differently: {word}.", vars));
    }
  }
  return { ok: false, notes };
}

/** A French voice, France first. False when the browser has no speech at all. */
const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;
function say(text, slow) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  u.rate = slow ? 0.6 : 0.9;
  const voices = synth.getVoices();
  const v = voices.find((x) => /^fr(-|_)FR/i.test(x.lang)) ?? voices.find((x) => /^fr(-|_)/i.test(x.lang));
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
    say(target(q), slow.getAttribute("aria-pressed") === "true");
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
    const answer = `<b lang="fr">${esc(target(q))}</b>`;
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
  // Accented letters for keyboards that have none, typed where the cursor is.
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
