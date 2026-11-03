// A teacher's own live quizzes: the account flag, the table, and turning a saved quiz into
// the questions the projector asks. Browser only (builder and host).
//
// Who is a teacher: user_metadata.teacher, a self-declared switch in /konto and on the
// builder page. It decides what the UI offers, nothing more — the table's RLS gives every
// account its own rows only (supabase/migrations/*_lq_quizzes.sql), so there is nothing a
// "fake teacher" could reach.
//
// A saved question is one of
//   { t: "mc", prompt, options: [2..4 strings], correct, kind? }   German text, fixed
//   { t: "word", id, dir: "de-meaning" | "meaning-de" }           a lexicon word, resolved
//                                                                  on the projector so each
//                                                                  phone sees its language
import { createBrowserSupabase } from "../supabase/browser.js";
import { withBase } from "../paths.js";

export const MAX_QUESTIONS = 50;
const TABLE = "lq_quizzes";

let client = null;
const sb = () => (client ??= createBrowserSupabase());

/**
 * The signed-in user, or null — from the session in this browser. updateUser() (the teacher
 * switch on /konto) writes the new user into that session, so the flag is current here; what
 * a teacher may save is checked by RLS anyway.
 */
export async function currentUser() {
  try {
    const { data } = await sb().auth.getSession();
    return data?.session?.user ?? null;
  } catch {
    return null;
  }
}

export const isTeacher = (user) => user?.user_metadata?.teacher === true;

/**
 * Tells the server the teacher flag changed, so it can mirror it onto the Brevo contact
 * (attribute LEHRKRAFT, src/lib/brevo.js). Fire and forget: the flag is already saved on
 * the account, and a mailing list being slow or down must never undo or delay the switch.
 * The server reads the flag from the verified user, so the request carries no value.
 * Also called by the /konto switch.
 */
export function syncTeacherFlag() {
  try {
    fetch(withBase("/api/konto/brevo"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "teacher" }),
      // Survives the page being left right after the click.
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

/** Turns the teacher tools on or off for this account. Resolves to the updated user. */
export async function setTeacher(on) {
  const { data, error } = await sb().auth.updateUser({ data: { teacher: !!on } });
  if (error) throw error;
  syncTeacherFlag();
  return data.user;
}

const clip = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** One question as it may be stored, or null when it is not a usable question. */
export function cleanQuestion(q) {
  if (q?.t === "word") {
    if (typeof q.id !== "string" || !q.id) return null;
    const out = { t: "word", id: q.id.slice(0, 80), dir: q.dir === "meaning-de" ? "meaning-de" : "de-meaning" };
    // The German word, kept only so the builder can list the question without the lexicon.
    const label = clip(q.label ?? q.de, 80);
    if (label) out.label = label;
    if (q.src) out.src = clip(q.src, 80);
    return out;
  }
  if (q?.t !== "mc") return null;
  const prompt = clip(q.prompt, 200);
  const options = (q.options ?? []).map((o) => clip(o, 80));
  const correct = Number(q.correct);
  if (!prompt || !Number.isInteger(correct) || !options[correct]) return null;
  // Empty option boxes are dropped, the right one kept wherever it was.
  const kept = options.map((o, i) => ({ o, right: i === correct })).filter((x) => x.o);
  if (kept.length < 2 || kept.length > 4) return null;
  // Two options with the same text would make a right tap count as wrong.
  if (new Set(kept.map((x) => x.o.toLowerCase())).size !== kept.length) return null;
  const out = { t: "mc", prompt, options: kept.map((x) => x.o), correct: kept.findIndex((x) => x.right) };
  const kind = clip(q.kind, 120);
  if (kind) out.kind = kind;
  // Which chapter item it came from, so the builder can tick it again; absent for own ones.
  if (q.src) out.src = clip(q.src, 80);
  return out;
}

export async function listQuizzes() {
  const { data, error } = await sb().from(TABLE).select("id, title, chapter, questions, updated_at").order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getQuiz(id) {
  const { data, error } = await sb().from(TABLE).select("id, title, chapter, questions, updated_at").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Inserts (no id) or updates a quiz. Resolves to the saved row. */
export async function saveQuiz({ id, title, chapter, questions }) {
  const row = {
    title: clip(title, 80) || "Mein Quiz",
    chapter: chapter || null,
    questions: questions.map(cleanQuestion).filter(Boolean).slice(0, MAX_QUESTIONS),
  };
  const q = id ? sb().from(TABLE).update(row).eq("id", id) : sb().from(TABLE).insert(row);
  const { data, error } = await q.select("id, title, chapter, questions, updated_at").single();
  if (error) throw error;
  return data;
}

export async function deleteQuiz(id) {
  const { error } = await sb().from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

function shuffleOptions(q) {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, options: order.map((i) => q.options[i]), correct: order.indexOf(q.correct) };
}

/**
 * A saved quiz → the projector's questions ({ prompt, options, correct, mode, kind, img? },
 * the shape buildQuestions() returns plus a per-question mode and line above the prompt).
 * `questionsModule` is ./questions.js, loaded by the host only when a quiz has words.
 */
export function resolveQuestions(saved, questionsModule) {
  const out = [];
  for (const raw of saved ?? []) {
    const q = cleanQuestion(raw);
    if (!q) continue;
    if (q.t === "mc") {
      const s = shuffleOptions(q);
      out.push({ prompt: { de: s.prompt }, options: s.options.map((de) => ({ de })), correct: s.correct, mode: "custom", kind: q.kind ?? null });
    } else {
      const w = questionsModule?.wordQuestion(q.id, q.dir);
      if (w) out.push({ ...w, mode: q.dir, kind: null });
    }
  }
  return out;
}

/** Whether a saved quiz shows translations (and so needs the projector's language). */
export const hasWords = (saved) => (saved ?? []).some((q) => q?.t === "word");
