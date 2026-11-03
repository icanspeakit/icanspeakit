// Bruno as the game master of Bruno sucht den Hochstapler: the site's Dackel with his
// magnifying glass (the mascot's own `lupe` prop) and a detective's cap drawn over his head.
// Our own drawing, nothing from the famous impostor game.
import { mascotSvg } from "../mascots.js";

// The cap on Bruno's 200×200 grid (front view: his head sits around x 30–110, top near y 34):
// a checked dome, a short peak to the front and ear flaps tied up on top.
const CAP = `
  <g class="hst-cap" stroke="#1a2230" stroke-width="4.5" stroke-linejoin="round">
    <path d="M30 52 Q32 18 70 16 Q108 18 110 52 Q70 40 30 52 Z" fill="#a16207" />
    <path d="M44 24 L46 46 M58 18 L58 42 M72 16 L72 41 M86 18 L85 42 M98 24 L96 46" stroke="#713f12" stroke-width="2.5" fill="none" />
    <path d="M34 34 Q70 26 106 34" stroke="#713f12" stroke-width="2.5" fill="none" />
    <path d="M42 50 Q70 44 98 50 L104 60 Q70 52 36 60 Z" fill="#854d0e" />
    <path d="M62 16 Q70 8 78 16" fill="none" stroke-width="3.5" />
  </g>`;

/** Bruno the detective as an inline <svg>. */
export function detectiveSvg({ size = 160, expr = "happy", className = "", lupe = true } = {}) {
  const svg = mascotSvg({ name: "bruno", expr, size, className: `hst-bruno ${className}`.trim(), label: "Bruno the detective", extra: lupe ? "lupe" : undefined });
  return svg.replace(/<\/svg>$/, `${CAP}</svg>`);
}
