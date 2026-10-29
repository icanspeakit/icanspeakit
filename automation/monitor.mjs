// EnglishAcademy content-run monitor: a local dashboard for automation/run-next.ps1.
//   node automation/monitor.mjs        (or double-click automation\monitor.cmd)
//   → http://localhost:4455            (bound to 127.0.0.1 only)
// No dependencies. Reads the run logs and status in automation/logs, the queue, commits and
// reports on the `content` worktree, and the Windows scheduled task. The buttons start, stop,
// pause and resume runs.
import http from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.MONITOR_PORT ?? 4455);
const AUTO = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.dirname(AUTO);
const WORK = path.join(path.dirname(REPO), 'englishacademy-content');
const LOGS = path.join(AUTO, 'logs');
const TASK = 'EnglishAcademy content run';
const SHELL = existsSync('C:\\Program Files\\PowerShell\\7\\pwsh.exe') ? 'C:\\Program Files\\PowerShell\\7\\pwsh.exe' : 'powershell.exe';

const run = (cmd, args, opts = {}) => new Promise((resolve) => {
  execFile(cmd, args, { windowsHide: true, timeout: 20000, maxBuffer: 8 << 20, ...opts }, (err, stdout, stderr) => resolve({ ok: !err, out: String(stdout), err: String(stderr || err?.message || '') }));
});
const ps = (command) => run(SHELL, ['-NoProfile', '-NonInteractive', '-Command', command]);
const readText = async (p) => { try { return await readFile(p, 'utf8'); } catch { return null; } };
const readJson = async (p) => { const t = await readText(p); try { return t ? JSON.parse(t.replace(/^\uFEFF/, '')) : null; } catch { return null; } };
const alive = (pid) => { if (!pid) return false; try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
// The runner's PID: run-next.ps1 holds it in this lock file for as long as it runs or waits.
const LOCK = path.join(process.env.TEMP ?? process.env.TMP ?? '', 'englishacademy-content-run.lock');
const runnerPid = async () => { const t = await readText(LOCK); const n = Number.parseInt(String(t ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };

let taskCache = { at: 0, value: null };
async function taskInfo(force = false) {
  if (!force && Date.now() - taskCache.at < 20000) return taskCache.value;
  const r = await ps(`$t = Get-ScheduledTask -TaskName '${TASK}' -ErrorAction SilentlyContinue; if ($t) { $i = $t | Get-ScheduledTaskInfo; [pscustomobject]@{ state = $t.State.ToString(); next = if ($i.NextRunTime) { $i.NextRunTime.ToString('o') } else { $null }; last = if ($i.LastRunTime -and $i.LastRunTime.Year -gt 2000) { $i.LastRunTime.ToString('o') } else { $null }; result = $i.LastTaskResult } | ConvertTo-Json -Compress } else { 'null' }`);
  let value = null;
  try { value = JSON.parse(r.out.trim() || 'null'); } catch {}
  taskCache = { at: Date.now(), value };
  return value;
}

async function queue() {
  const t = (await readText(path.join(WORK, 'automation', 'QUEUE.md'))) ?? (await readText(path.join(AUTO, 'QUEUE.md'))) ?? '';
  return [...t.matchAll(/^- \[( |x)\] `([^`]+)`:\s*(.+)$/gm)].map((m) => ({ id: m[2], desc: m[3], done: m[1] === 'x' }));
}

async function runsLog() {
  const t = (await readText(path.join(LOGS, 'runs.log'))) ?? '';
  return t.split(/\r?\n/).filter(Boolean).slice(-60).reverse().map((l) => ({ at: l.slice(0, 16), text: l.slice(17) }));
}

async function commits() {
  if (!existsSync(WORK)) return [];
  const r = await run('git', ['-C', WORK, 'log', 'main..content', '--date=iso-strict', '--format=%h%x09%ad%x09%s', '-n', '80']);
  return r.out.split('\n').filter(Boolean).map((l) => { const [hash, date, ...s] = l.split('\t'); return { hash, date, subject: s.join('\t') }; });
}

async function diffStat() {
  if (!existsSync(WORK)) return null;
  const r = await run('git', ['-C', WORK, 'diff', '--shortstat', 'main...content']);
  const w = await run('git', ['-C', WORK, 'status', '--porcelain']);
  return { committed: r.out.trim(), uncommitted: w.out.split('\n').filter(Boolean).length };
}

async function reports() {
  const dir = path.join(WORK, 'automation', 'reports');
  try { return (await readdir(dir)).filter((f) => f.endsWith('.md')).sort(); } catch { return []; }
}

async function logs() {
  try {
    const files = (await readdir(LOGS)).filter((f) => /^\d{4}-\d\d-\d\d_\d{4}-.+\.log$/.test(f)).sort().reverse();
    return Promise.all(files.slice(0, 40).map(async (f) => ({ name: f, size: (await stat(path.join(LOGS, f))).size })));
  } catch { return []; }
}

const short = (p) => String(p ?? '').replaceAll('\\', '/').replace(WORK.replaceAll('\\', '/') + '/', '');
function toolDetail(name, input = {}) {
  if (input.command) return input.command;
  if (input.file_path) return short(input.file_path) + (input.offset ? ` @${input.offset}` : '');
  if (input.pattern) return `${input.pattern}${input.path ? ' in ' + short(input.path) : ''}`;
  if (input.query) return input.query;
  if (input.url) return input.url;
  if (input.todos) return input.todos.map((t) => `${t.status === 'completed' ? '✓' : t.status === 'in_progress' ? '▶' : '·'} ${t.content}`).join('\n');
  return JSON.stringify(input).slice(0, 200);
}

async function events(name, limit = 120) {
  if (!/^[\w.-]+\.log$/.test(name)) return { events: [], result: null };
  const t = (await readText(path.join(LOGS, name))) ?? '';
  const out = [];
  let result = null, init = null;
  for (const line of t.split(/\r?\n/)) {
    if (!line.startsWith('{')) { if (line.trim()) out.push({ kind: 'raw', text: line.slice(0, 400) }); continue; }
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.type === 'system' && e.subtype === 'init') init = { model: e.model, cwd: short(e.cwd) };
    else if (e.type === 'assistant') {
      for (const c of e.message?.content ?? []) {
        if (c.type === 'text' && c.text.trim()) out.push({ kind: 'text', text: c.text.trim().slice(0, 1500) });
        if (c.type === 'tool_use') out.push({ kind: 'tool', name: c.name, text: toolDetail(c.name, c.input).slice(0, 600) });
      }
    } else if (e.type === 'user') {
      for (const c of e.message?.content ?? []) if (c.type === 'tool_result' && c.is_error) out.push({ kind: 'error', text: String(Array.isArray(c.content) ? c.content.map((x) => x.text).join(' ') : c.content).slice(0, 400) });
    } else if (e.type === 'result') result = { subtype: e.subtype, isError: e.is_error, turns: e.num_turns, durationMs: e.duration_ms, text: String(e.result ?? '').slice(-1500) };
  }
  const counts = out.reduce((a, e) => ((a[e.kind] = (a[e.kind] ?? 0) + 1), a), {});
  return { init, result, counts, total: out.length, events: out.slice(-limit) };
}

async function state() {
  const status = await readJson(path.join(LOGS, 'status.json'));
  const usage = await readJson(path.join(LOGS, 'usage.json'));
  const config = await readJson(path.join(AUTO, 'config.json'));
  if (status && (status.state === 'running' || status.state === 'waiting') && !alive(await runnerPid())) status.state = 'stopped';
  const [q, r, c, d, rep, l, task] = await Promise.all([queue(), runsLog(), commits(), diffStat(), reports(), logs(), taskInfo()]);
  return { now: new Date().toISOString(), status, usage, config, queue: q, runs: r, commits: c, diff: d, reports: rep, logs: l, task, worktree: existsSync(WORK) };
}

const actions = {
  // Clears a wait or a halt first: "Run now" means now, even before a limit has reset.
  'run-now': async () => {
    const f = path.join(LOGS, 'status.json');
    const s = await readJson(f);
    if (s && (s.state === 'waiting' || s.state === 'halted')) {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(f, JSON.stringify({ ...s, state: 'idle', cleared: new Date().toISOString() }, null, 2));
    }
    return ps(`Start-ScheduledTask -TaskName '${TASK}'`);
  },
  pause: () => ps(`Disable-ScheduledTask -TaskName '${TASK}' | Out-Null`),
  resume: () => ps(`Enable-ScheduledTask -TaskName '${TASK}' | Out-Null`),
  stop: async () => {
    const pid = await runnerPid();
    if (!alive(pid)) return { ok: false, err: 'not running' };
    return run('taskkill', ['/PID', String(pid), '/T', '/F']);
  },
};

const send = (res, code, body, type = 'application/json; charset=utf-8') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/') return send(res, 200, await readFile(path.join(AUTO, 'monitor.html'), 'utf8'), 'text/html; charset=utf-8');
    if (url.pathname === '/api/state') return send(res, 200, await state());
    if (url.pathname === '/api/events') return send(res, 200, await events(url.searchParams.get('log') ?? '', Number(url.searchParams.get('n') ?? 120)));
    if (url.pathname === '/api/report') {
      const name = url.searchParams.get('name') ?? '';
      if (!/^[\w.-]+\.md$/.test(name)) return send(res, 400, { error: 'bad name' });
      return send(res, 200, { name, text: (await readText(path.join(WORK, 'automation', 'reports', name))) ?? '' });
    }
    if (req.method === 'POST' && url.pathname === '/api/config') {
      const origin = req.headers.origin;
      if (origin && origin !== `http://localhost:${PORT}` && origin !== `http://127.0.0.1:${PORT}`) return send(res, 403, { error: 'forbidden' });
      let body = ''; for await (const c of req) body += c;
      let patch; try { patch = JSON.parse(body); } catch { return send(res, 400, { error: 'bad json' }); }
      const cap = (v) => (v === null ? null : Number.isFinite(v) && v >= 10 && v <= 100 ? Math.round(v) : undefined);
      const cfgPath = path.join(AUTO, 'config.json');
      const cfg = (await readJson(cfgPath)) ?? {};
      for (const k of ['weeklyCapPercent', 'fiveHourCapPercent']) {
        if (k in patch) { const v = cap(patch[k]); if (v === undefined) return send(res, 400, { error: `bad ${k}` }); cfg[k] = v; }
      }
      const { writeFile } = await import('node:fs/promises');
      await writeFile(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
      return send(res, 200, { ok: true, config: cfg });
    }
    if (req.method === 'POST' && url.pathname.startsWith('/api/action/')) {
      // Same-origin only: a page elsewhere must not be able to start or stop runs.
      const origin = req.headers.origin;
      if (origin && origin !== `http://localhost:${PORT}` && origin !== `http://127.0.0.1:${PORT}`) return send(res, 403, { error: 'forbidden' });
      const act = actions[url.pathname.slice('/api/action/'.length)];
      if (!act) return send(res, 404, { error: 'unknown action' });
      const r = await act();
      await taskInfo(true);
      return send(res, r.ok ? 200 : 500, r);
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 500, { error: String(e?.message ?? e) }); }
}).on('error', (e) => {
  if (e.code === 'EADDRINUSE') { console.log(`Monitor already running on http://localhost:${PORT}`); process.exit(0); }
  throw e;
}).listen(PORT, '127.0.0.1', () => console.log(`EnglishAcademy monitor: http://localhost:${PORT}`));
