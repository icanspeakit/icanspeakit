// Lesen, Hören and Schreiben for the ausführliche Einstufung — see
// src/lib/klassentest/fertigkeiten.js. Prerendered; only the teacher's pages load it.
import { fertigkeitenPool } from "../../../lib/klassentest/fertigkeiten.js";

export function GET() {
  return new Response(JSON.stringify(fertigkeitenPool()), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
