// Nests the build under cf-dist/intern/ (the route keeps the /intern prefix) and puts the
// _headers file at the root of cf-dist, where Cloudflare reads it, with /intern/* rules.
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
execFileSync("node", ["../../scripts/nest-dist.mjs", "dist", "/intern"], { stdio: "inherit" });
rmSync("cf-dist/intern/_headers", { force: true });
writeFileSync("cf-dist/_headers", "/intern/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Cache-Control: no-store\n");
