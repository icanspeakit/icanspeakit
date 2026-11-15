// The Klassentest question pool — see src/lib/klassentest/pool.js. Prerendered, one static
// file; only the teacher's page loads it.
import { klassentestPool } from "../../../lib/klassentest/pool.js";

export function GET() {
  return new Response(JSON.stringify(klassentestPool()), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
