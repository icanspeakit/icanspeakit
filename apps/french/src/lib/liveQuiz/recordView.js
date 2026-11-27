// The „Quiz“ tab on the progress page: the signed-in learner's Live-Quiz rounds, newest first,
// from /api/quiz/ergebnisse (written by ./record.js). Each round opens into its questions —
// the task, the learner's answer and the right one — as the end screen showed them, so the
// record doubles as a correction sheet. A round can be deleted.
//
// Signed out: one line and a way to sign in; nothing is fetched.
import { apiFetch } from "../api.js";
import { withBase } from "../paths.js";
import { uiLocale, getLang, loadDict, translate, onLangChange } from "../i18n.js";
import "../../styles/quiz-record.css";

// UI language, like the other two tabs: the dictionary arrives async, so every string has
// its English fallback, and a language switch repaints from the rows already loaded.
let dict = {};
const t = (key, en, vars) => (dict[key] != null ? translate(dict, key, vars) : en.replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? String(vars[k]) : m)));

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const APP = import.meta.env.PUBLIC_TARGET === "app";
const signedIn = () => APP || /(?:^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);
const MODES = { synonym: "Synonyms", "de-meaning": "Word → meaning", "meaning-de": "Meaning → word", both: "Mixed", grammatik: "Grammar" };
const mode = (m) => (MODES[m] ? t(`fq.mode.${m}`, MODES[m]) : "");

const when = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString(uiLocale(), { day: "numeric", month: "short", year: "numeric" }) + ", " + d.toLocaleTimeString(uiLocale(), { hour: "2-digit", minute: "2-digit" });
};

function card(r) {
  const pct = Math.round((r.richtig / r.gesamt) * 100);
  const level = pct >= 80 ? "good" : pct >= 50 ? "mid" : "hard";
  const where = r.art === "klasse"
    ? (r.mitspielende
      ? t("fq.classOf", "Class · place {platz} of {n}", { platz: r.platz ?? "–", n: r.mitspielende })
      : t("fq.class", "Class · place {platz}", { platz: r.platz ?? "–" }))
    : t("fq.solo", "Solo");
  const meta = [where, r.stufe, mode(r.modus)].filter(Boolean).map(esc).join(" · ");
  const fragen = (r.fragen ?? []).map((f, i) => `
    <li class="fq-q ${f.ok ? "is-ok" : "is-bad"}">
      <span class="fq-q-n">${i + 1}</span>
      <div>
        <p class="fq-q-task">${esc(f.aufgabe)}</p>
        <p class="fq-q-ans">${f.ok
          ? `<span class="fq-chip is-ok">✓ ${esc(f.antwort)}</span>`
          : `${f.antwort ? `<span class="fq-chip is-bad">✗ ${esc(f.antwort)}</span>` : `<span class="fq-chip">${esc(t("fq.noAnswer", "No answer"))}</span>`} <span class="fq-chip is-ok">✓ ${esc(f.richtig)}</span>`}</p>
      </div>
    </li>`).join("");
  return `
    <li class="fq-round is-${level}" data-id="${esc(r.id)}">
      <details>
        <summary>
          <span class="fq-score"><b>${r.richtig}/${r.gesamt}</b><span class="fq-bar" aria-hidden="true"><span style="width:${pct}%"></span></span></span>
          <span class="fq-main">
            <span class="fq-title">${esc(r.titel || t("fq.quizTitle", "Live quiz"))}</span>
            <span class="fq-meta">${meta}</span>
          </span>
          <span class="fq-side"><span class="fq-pts">${esc(t("fq.points", "{n} points", { n: r.punkte }))}</span><time datetime="${esc(r.gespielt_am)}">${esc(when(r.gespielt_am))}</time></span>
        </summary>
        ${fragen ? `<ol class="fq-qs">${fragen}</ol>` : ""}
        <p class="fq-actions"><button type="button" class="fq-del" data-del>${esc(t("fq.delete", "Delete this round"))}</button></p>
      </details>
    </li>`;
}

let mounted = false;
let listening = false;
let state = null; // "signin" | "signin-short" | "error" | { rows }

function render(root) {
  const signIn = (key, en) => `<p class="fq-empty">${esc(t(key, en))} <a href="${withBase("/compte")}">${esc(t("fq.signInLink", "Sign in →"))}</a></p>`;
  if (state === "signin") root.innerHTML = signIn("fq.signIn", "Sign in and every quiz round is saved here: points, correct answers and every question to look back at.");
  else if (state === "signin-short") root.innerHTML = signIn("fq.signInShort", "Sign in and every quiz round is saved here.");
  else if (state === "error") root.innerHTML = `<p class="fq-empty">${esc(t("fq.loadError", "The quiz rounds could not be loaded just now. Try again in a moment."))}</p>`;
  else if (!state.rows.length) {
    const text = esc(t("fq.empty", "No quiz rounds yet. Play a round of the {quiz}, on your own or with your class, and it will appear here.", { quiz: "@@QUIZ@@" }));
    root.innerHTML = `<p class="fq-empty">${text.replace("@@QUIZ@@", `<a href="${withBase("/enseignants/quiz")}">${esc(t("fq.quizLink", "live quiz"))}</a>`)}</p>`;
  } else {
    const rows = state.rows;
    const right = rows.reduce((a, r) => a + r.richtig, 0);
    const all = rows.reduce((a, r) => a + r.gesamt, 0);
    root.innerHTML = `
    <div class="fq-stats">
      <div><b>${rows.length}</b><span>${esc(t("fq.stat.rounds", "Rounds"))}</span></div>
      <div><b>${all ? Math.round((right / all) * 100) : 0} %</b><span>${esc(t("fq.stat.correct", "correct"))}</span></div>
      <div><b>${Math.max(...rows.map((r) => r.punkte))}</b><span>${esc(t("fq.stat.best", "Best score"))}</span></div>
    </div>
    <ol class="fq-list">${rows.map(card).join("")}</ol>`;
  }
}

export async function mountQuizRecord(root) {
  if (!root || mounted) return;
  mounted = true;
  dict = await loadDict(getLang()).catch(() => ({}));
  if (!listening) {
    listening = true;
    onLangChange((code, d) => { dict = d || {}; if (state) render(root); });
  }
  if (!signedIn()) {
    state = "signin";
    return render(root);
  }
  const res = await apiFetch("/api/quiz/ergebnisse", { credentials: "same-origin" }).catch(() => null);
  if (res?.status === 401) {
    state = "signin-short";
    return render(root);
  }
  if (!res?.ok) {
    state = "error";
    render(root);
    mounted = false;
    return;
  }
  const { rows } = await res.json();
  state = { rows };
  render(root);
  if (!rows.length) return;
  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del]");
    if (!btn) return;
    const li = btn.closest("[data-id]");
    btn.disabled = true;
    const del = await apiFetch("/api/quiz/ergebnisse", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ delete: li.dataset.id }),
    }).catch(() => null);
    if (del?.ok) {
      li.remove();
      if (state?.rows) state.rows = state.rows.filter((r) => String(r.id) !== li.dataset.id);
    } else btn.disabled = false;
  });
}
