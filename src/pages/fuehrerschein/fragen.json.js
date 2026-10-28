// The whole own question bank, prepared for the browser (fahrQuiz.js), as one static file.
// /fuehrerschein/ueben and /fuehrerschein/simulation fetch it instead of carrying it in their
// HTML: a learner who opens both downloads the bank once, from the browser cache. The scenes
// that serve as question pictures come separately (szenen.json), once per scene.
import { questions, lessonLinks } from "../../lib/fuehrerscheinData.js";
import { prepareQuestion, sceneHtml } from "../../lib/fuehrerschein.js";

export function GET() {
  const qs = questions.map((q) => prepareQuestion(q, lessonLinks, { inlineScene: false }));
  const scenes = Object.fromEntries([...new Set(qs.filter((q) => q.scene).map((q) => q.scene))].map((id) => [id, sceneHtml(id)]));
  return new Response(JSON.stringify({ questions: qs, scenes }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
