// Claude Code status-line command: shows 5-hour / weekly usage and saves it for the content
// runs (automation/logs/usage.json), which stop at the cap in automation/config.json.
// Claude Code passes the session as JSON on stdin; on Pro/Max it carries
//   rate_limits.five_hour / seven_day: { used_percentage, resets_at (unix seconds) }
// once the session has had its first response.
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOGS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'logs');
let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  let j = {};
  try { j = JSON.parse(input); } catch {}
  const rl = j.rate_limits;
  const pct = (w) => (w && typeof w.used_percentage === 'number' ? Math.round(w.used_percentage) : null);
  if (rl && (rl.five_hour || rl.seven_day)) {
    const snap = {
      at: new Date().toISOString(),
      fiveHour: rl.five_hour ? { percent: rl.five_hour.used_percentage, resetsAt: rl.five_hour.resets_at ? new Date(rl.five_hour.resets_at * 1000).toISOString() : null } : null,
      sevenDay: rl.seven_day ? { percent: rl.seven_day.used_percentage, resetsAt: rl.seven_day.resets_at ? new Date(rl.seven_day.resets_at * 1000).toISOString() : null } : null,
    };
    try { mkdirSync(LOGS, { recursive: true }); writeFileSync(path.join(LOGS, 'usage.json'), JSON.stringify(snap, null, 2)); } catch {}
  }
  let saved = null;
  if (!rl) { try { saved = JSON.parse(readFileSync(path.join(LOGS, 'usage.json'), 'utf8')); } catch {} }
  const five = pct(rl?.five_hour) ?? (saved?.fiveHour ? Math.round(saved.fiveHour.percent) : null);
  const week = pct(rl?.seven_day) ?? (saved?.sevenDay ? Math.round(saved.sevenDay.percent) : null);
  const parts = [j.model?.display_name, five != null ? `5h ${five}%` : null, week != null ? `week ${week}%` : null].filter(Boolean);
  process.stdout.write(parts.join(' · '));
});
