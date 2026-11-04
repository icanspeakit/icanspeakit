// RLS check for public.lernstunden (supabase/migrations/20261027120000_lernstunden.sql):
// owner, teacher of the class, another teacher, a stranger, anon. Runs against the real
// database inside ONE transaction that is rolled back at the end – nothing stays.
//
// Not part of `npm run test:unterricht` (needs the database and the `pg` package, which is not
// a dependency of the site). Run:
//   npm i --prefix <some folder> pg@8
//   PG_DIR=<some folder> node tests/unterricht/lernstunden-rls.mjs
// It reads SUPABASE_DB_URL from .env.local.
import { createRequire } from "node:module";
// `pg` is not a site dependency: PG_DIR is a folder where it is installed.
const pg = createRequire(process.env.PG_DIR ? `${process.env.PG_DIR.replace(/[\/]$/, "")}/` : import.meta.url)("pg");
import fs from "node:fs";
import crypto from "node:crypto";
const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/^SUPABASE_DB_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");
const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();
const id = () => crypto.randomUUID();
const [learner, teacher, stranger, other] = [id(), id(), id(), id()];
let pass = 0, fail = 0;
const ok = (name, cond) => { (cond ? pass++ : fail++); console.log(cond ? "ok  " : "FAIL", name); };
const as = async (uid, fn) => {
  await c.query("savepoint s");
  await c.query("set local role authenticated");
  await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: "authenticated" })]);
  try { return await fn(); } catch (e) { return { error: e.message }; } finally { await c.query("reset role"); await c.query("release savepoint s").catch(async () => {}); }
};
const tryAs = async (uid, sql, args = []) => {
  await c.query("savepoint t");
  await c.query("set local role authenticated");
  await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: "authenticated" })]);
  try { const r = await c.query(sql, args); await c.query("reset role"); await c.query("release savepoint t"); return r; }
  catch (e) { await c.query("rollback to savepoint t"); await c.query("reset role"); return { error: e.message }; }
};
await c.query("begin");
for (const u of [learner, teacher, stranger, other])
  await c.query(`insert into auth.users (id, email, aud, role) values ($1, $2, 'authenticated', 'authenticated')`, [u, `${u.slice(0, 8)}@test.invalid`]);
const kl = (await c.query(`insert into public.klassen (owner, name) values ($1, 'RLS-Test') returning id`, [teacher])).rows[0].id;
const kl2 = (await c.query(`insert into public.klassen (owner, name) values ($1, 'Fremde') returning id`, [other])).rows[0].id;
await c.query(`insert into public.klassen_mitglieder (klasse_id, user_id, anzeigename, beigetreten_at) values ($1, $2, 'Lea', now() - interval '1 day')`, [kl, learner]);
const key = "'a1-1', 1, 3, 1, 90";
// learner inserts own row with class
let r = await tryAs(learner, `insert into public.lernstunden (klasse_id, niveau, block, stunden, stunde, minuten) values ($1, ${key}) returning id`, [kl]);
ok("learner inserts own row with own class", !r.error && r.rows?.length === 1);
const rowId = r.rows?.[0]?.id;
r = await tryAs(learner, `insert into public.lernstunden (klasse_id, niveau, block, stunden, stunde, minuten) values ($1, 'a1-1', 1, 3, 2, 90)`, [kl2]);
ok("learner cannot attach a class they are not in", !!r.error);
r = await tryAs(learner, `insert into public.lernstunden (niveau, block, stunden, stunde, minuten) values (${key})`);
ok("second open row for same key refused", !!r.error);
r = await tryAs(learner, `insert into public.lernstunden (user_id, niveau, block, stunden, stunde, minuten) values ($1, 'a1-1', 1, 3, 3, 90)`, [stranger]);
ok("learner cannot insert for someone else", !!r.error);
r = await tryAs(learner, `update public.lernstunden set current_step = 3, step_status = '{"0":"fertig"}' where id = $1 returning current_step`, [rowId]);
ok("learner updates own row", r.rows?.[0]?.current_step === 3);
r = await tryAs(teacher, `select id, step_status from public.lernstunden where id = $1`, [rowId]);
ok("teacher reads member's row of own class", r.rows?.length === 1);
r = await tryAs(teacher, `update public.lernstunden set current_step = 0 where id = $1 returning id`, [rowId]);
ok("teacher cannot update", (r.rows?.length ?? 0) === 0);
r = await tryAs(teacher, `delete from public.lernstunden where id = $1 returning id`, [rowId]);
ok("teacher cannot delete", (r.rows?.length ?? 0) === 0);
r = await tryAs(stranger, `select id from public.lernstunden where id = $1`, [rowId]);
ok("stranger reads nothing", r.rows?.length === 0);
r = await tryAs(other, `select id from public.lernstunden where id = $1`, [rowId]);
ok("other teacher reads nothing", r.rows?.length === 0);
// learner row without class: teacher must not see
r = await tryAs(learner, `insert into public.lernstunden (niveau, block, stunden, stunde, minuten) values ('a1-1', 1, 3, 2, 90) returning id`);
const solo = r.rows?.[0]?.id;
r = await tryAs(teacher, `select id from public.lernstunden where id = $1`, [solo]);
ok("teacher cannot read a row without class", r.rows?.length === 0);
// row started before joining
const early = (await c.query(`insert into public.lernstunden (user_id, klasse_id, niveau, block, stunden, stunde, minuten, started_at) values ($1, $2, 'a1-1', 2, 3, 1, 90, now() - interval '3 days') returning id`, [learner, kl])).rows[0].id;
r = await tryAs(teacher, `select id from public.lernstunden where id = $1`, [early]);
ok("teacher cannot read a Stunde started before the join", r.rows?.length === 0);
// completed stays completed
await c.query(`update public.lernstunden set status = 'completed' where id = $1`, [solo]);
r = await tryAs(learner, `update public.lernstunden set status = 'active' where id = $1 returning status`, [solo]);
ok("completed stays completed", r.rows?.[0]?.status === "completed");
r = await tryAs(learner, `update public.lernstunden set user_id = $2 where id = $1`, [solo, stranger]);
ok("user_id not updatable", !!r.error);
r = await c.query("select 1"); // anon
await c.query("savepoint a"); await c.query("set local role anon");
try { await c.query("select * from public.lernstunden"); ok("anon reads nothing", false); } catch { ok("anon has no access", true); }
await c.query("rollback to savepoint a");
await c.query("rollback");
await c.end();
console.log(`${pass} ok, ${fail} failed`);
