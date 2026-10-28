// The short rule behind each grammar topic, for "Meine Fehler" (src/pages/meine-fehler.astro):
// beside a mistake it shows what the learner got wrong, in the topic's own words — the
// one-line subtitle, the example sentence, and the hint of each exercise. Keyed by the topic
// key grammarWorkspace.js stores in a mistake's itemId (`<topic>/<exercise>/<item>`).
// Fetched only once there are grammar mistakes, so the page does not carry 60 topics' rules.
import type { APIRoute } from "astro";

export const prerender = true;

const mods = import.meta.glob("../data/grammatik/*.json", { eager: true });

export const GET: APIRoute = () => {
  const rules: Record<string, { name: string; subtitle: string; example: string; hints: string[] }> = {};
  for (const m of Object.values(mods) as any[]) {
    const t = m.default ?? m;
    rules[t.slug ?? t.id] = {
      name: t.name ?? "",
      subtitle: t.subtitle ?? "",
      example: t.concept?.exampleHtml ?? "",
      hints: (t.exercises ?? []).map((ex: any) => ex.hint ?? ""),
    };
  }
  return new Response(JSON.stringify(rules), { headers: { "Content-Type": "application/json" } });
};
