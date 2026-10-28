// Loads /fuehrerschein/fragen.json (src/pages/fuehrerschein/fragen.json.js) once per page and
// puts each scene's two pictures back on the questions that use it.
let cache = null;
export function loadFragen() {
  cache ??= fetch("/fuehrerschein/fragen.json")
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(({ questions, scenes }) => questions.map((q) => (q.scene && scenes[q.scene] ? { ...q, ...scenes[q.scene] } : q)));
  return cache;
}
