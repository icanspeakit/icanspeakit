// The admin menu: groups and pages in one place (same idea as deutschacademy's internMenu.js).
// `db: true` = needs a database/service the icanspeak sites do not have yet; the page says what is missing.
export const GROUPS = [
  { id: "center", name: "Center", icon: "◧", color: "#0d9488" },
  { id: "crm", name: "CRM", icon: "🗂", color: "#db2777" },
  { id: "people", name: "People", icon: "👥", color: "#3b82f6" },
  { id: "growth", name: "Growth", icon: "📈", color: "#16a34a" },
  { id: "quality", name: "Quality", icon: "⚑", color: "#ea580c" },
  { id: "data", name: "Data", icon: "🗄", color: "#8b5cf6" },
] as const;

export interface Page { id: string; name: string; info: string; group: string; icon: string; db?: boolean }

export const PAGES: Page[] = [
  { id: "", name: "Cockpit", info: "reminders, audio and content per course, links", group: "center", icon: "◧" },
  { id: "features", name: "Features", info: "what is built, and where to find it", group: "center", icon: "✨" },
  { id: "ideen", name: "Ideas Bucket", info: "tested ideas that fit many pages", group: "center", icon: "🪣" },
  { id: "fehler", name: "Sentry · Errors", info: "open errors", group: "center", icon: "🐞", db: true },
  { id: "nutzer", name: "B2C-CRM", info: "learners, accounts, access", group: "crm", icon: "👤", db: true },
  { id: "crm", name: "B2B-CRM", info: "schools and teachers to write to", group: "crm", icon: "🏫", db: true },
  { id: "lehrkraefte", name: "Teachers", info: "teacher accounts", group: "people", icon: "🧑‍🏫", db: true },
  { id: "abos", name: "Subscriptions", info: "plans and payments", group: "people", icon: "€", db: true },
  { id: "marketing", name: "Marketing", info: "posts, outreach, AI-visibility texts", group: "growth", icon: "📣" },
  { id: "partner", name: "Partners", info: "partners and affiliates", group: "growth", icon: "🤝" },
  { id: "meldungen", name: "Reports", info: "mistakes reported by learners", group: "quality", icon: "⚑", db: true },
  { id: "replays", name: "Replays", info: "session replays (PostHog)", group: "quality", icon: "▶" },
  { id: "audits", name: "Audits", info: "checks of what the sites show", group: "quality", icon: "🔎" },
  { id: "offen", name: "Open", info: "to-do board", group: "quality", icon: "📋" },
  { id: "ux", name: "UX checklist", info: "what a page must show, what can go", group: "quality", icon: "🧭" },
  { id: "daten", name: "Data", info: "services and links", group: "data", icon: "🗄" },
];
export const href = (p: Page) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return p.id ? `${base}/${p.id}` : base || "/";
};
