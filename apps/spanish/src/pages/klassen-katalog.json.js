// What a teacher can assign, as one static file (src/lib/aufgabenKatalog.js). Fetched by the
// Aufgaben picker on the teacher dashboard and by the students' "Aufgaben" card, only when
// there is something to show.
import { aufgabenKatalog } from "../lib/aufgabenKatalog.js";

export function GET() {
  return new Response(JSON.stringify(aufgabenKatalog()), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
