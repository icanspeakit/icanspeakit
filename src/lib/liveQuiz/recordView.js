// The „Quiz“ tab on /fortschritt: the signed-in learner's Live-Quiz rounds, newest first,
// from /api/quiz/ergebnisse (written by ./record.js). Each round opens into its questions —
// the task, the learner's answer and the right one — as the end screen showed them, so the
// record doubles as a correction sheet. A round can be deleted.
//
// Signed out: one line and a way to sign in; nothing is fetched.
import { apiFetch } from "../api.js";
import "../../styles/quiz-record.css";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const APP = import.meta.env.PUBLIC_TARGET === "app";
const signedIn = () => APP || /(?:^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);
const MODES = { synonym: "Synonyms", "de-meaning": "Word → meaning", "meaning-de": "Meaning → word", grammatik: "Grammar" };

const when = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

function card(r) {
  const pct = Math.round((r.richtig / r.gesamt) * 100);
  const level = pct >= 80 ? "good" : pct >= 50 ? "mid" : "hard";
  const where = r.art === "klasse"
    ? `Class · place ${r.platz ?? "–"}${r.mitspielende ? ` of ${r.mitspielende}` : ""}`
    : "Solo";
  const meta = [where, r.stufe, MODES[r.modus]].filter(Boolean).map(esc).join(" · ");
  const fragen = (r.fragen ?? []).map((f, i) => `
    <li class="fq-q ${f.ok ? "is-ok" : "is-bad"}">
      <span class="fq-q-n">${i + 1}</span>
      <div>
        <p class="fq-q-task">${esc(f.aufgabe)}</p>
        <p class="fq-q-ans">${f.ok
          ? `<span class="fq-chip is-ok">✓ ${esc(f.antwort)}</span>`
          : `${f.antwort ? `<span class="fq-chip is-bad">✗ ${esc(f.antwort)}</span>` : `<span class="fq-chip">No answer</span>`} <span class="fq-chip is-ok">✓ ${esc(f.richtig)}</span>`}</p>
      </div>
    </li>`).join("");
  return `
    <li class="fq-round is-${level}" data-id="${esc(r.id)}">
      <details>
        <summary>
          <span class="fq-score"><b>${r.richtig}/${r.gesamt}</b><span class="fq-bar" aria-hidden="true"><span style="width:${pct}%"></span></span></span>
          <span class="fq-main">
            <span class="fq-title">${esc(r.titel || "Live quiz")}</span>
            <span class="fq-meta">${meta}</span>
          </span>
          <span class="fq-side"><span class="fq-pts">${r.punkte} points</span><time datetime="${esc(r.gespielt_am)}">${esc(when(r.gespielt_am))}</time></span>
        </summary>
        ${fragen ? `<ol class="fq-qs">${fragen}</ol>` : ""}
        <p class="fq-actions"><button type="button" class="fq-del" data-del>Delete this round</button></p>
      </details>
    </li>`;
}

let mounted = false;

export async function mountQuizRecord(root) {
  if (!root || mounted) return;
  mounted = true;
  if (!signedIn()) {
    root.innerHTML = `<p class="fq-empty">Sign in and every quiz round is saved here: points, correct answers and every question to look back at. <a href="/konto">Sign in →</a></p>`;
    return;
  }
  const res = await apiFetch("/api/quiz/ergebnisse", { credentials: "same-origin" }).catch(() => null);
  if (res?.status === 401) {
    root.innerHTML = `<p class="fq-empty">Sign in and every quiz round is saved here. <a href="/konto">Sign in →</a></p>`;
    return;
  }
  if (!res?.ok) {
    root.innerHTML = `<p class="fq-empty">The quiz rounds could not be loaded just now. Try again in a moment.</p>`;
    mounted = false;
    return;
  }
  const { rows } = await res.json();
  if (!rows.length) {
    root.innerHTML = `<p class="fq-empty">No quiz rounds yet. Play a round of the <a href="/lehrkraefte/quiz">live quiz</a>, on your own or with your class, and it will appear here.</p>`;
    return;
  }
  const right = rows.reduce((a, r) => a + r.richtig, 0);
  const all = rows.reduce((a, r) => a + r.gesamt, 0);
  root.innerHTML = `
    <div class="fq-stats">
      <div><b>${rows.length}</b><span>Rounds</span></div>
      <div><b>${all ? Math.round((right / all) * 100) : 0} %</b><span>correct</span></div>
      <div><b>${Math.max(...rows.map((r) => r.punkte))}</b><span>Best score</span></div>
    </div>
    <ol class="fq-list">${rows.map(card).join("")}</ol>`;
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
    if (del?.ok) li.remove();
    else btn.disabled = false;
  });
}
