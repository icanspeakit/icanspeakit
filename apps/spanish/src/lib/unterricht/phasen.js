// The colour of each lesson phase, in one place: the plan's timeline bar and swatches
// (/teachers/timetable), the session's clock sectors and the session bar.
// `bg` is the light fill the plan has always used (dark text on top); `ink` is the same hue
// dark enough for text and outlines on white.
export const PHASE_COLORS = {
  einstieg: { bg: "#dbeafe", ink: "#1d4ed8" },
  wortschatz: { bg: "#fef3c7", ink: "#b45309" },
  grammatik: { bg: "#ccfbf1", ink: "#0f766e" },
  uebung: { bg: "#ede9fe", ink: "#6d28d9" },
  anwendung: { bg: "#fce7f3", ink: "#be185d" },
  pruefung: { bg: "#ffedd5", ink: "#c2410c" },
  test: { bg: "#e0e7ff", ink: "#4338ca" },
  abschluss: { bg: "#e5e7eb", ink: "#4b5563" },
};

const FALLBACK = { bg: "#e5e7eb", ink: "#4b5563" };
export const phaseColor = (id) => PHASE_COLORS[id] ?? FALLBACK;
