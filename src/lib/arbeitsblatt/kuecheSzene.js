// The kitchen for the Wechselpräpositionen sheet's „Zusatz“: a messy kitchen, and arrows
// that show where Bruno puts each thing (Akkusativ). Same drawing style as the room in
// zimmerSzene.js; our own drawing. The numbers are what the exercise in
// src/data/arbeitsblatt/wechselpraepositionen.json („zusatz“) points at:
//  1 Milch → in den Kühlschrank     2 Löffel → in die Schublade    3 Teller → in den Schrank
//  4 Topf → auf den Herd            5 Stuhl → an den Tisch         6 Papier → in den Mülleimer
//  7 Pflanze → ans Fenster          8 Handtuch → an den Haken      9 Kalender → an die Wand
// Each thing lies in a strip under its new place, so the arrows do not cross.
// English: 1 milk → in the fridge, 2 spoon → in the drawer, 3 plates → in the cupboard,
// 4 pot → on the hob, 5 chair → next to the table, 6 paper → in the bin, 7 plant → on the
// windowsill, 8 towel → on the hook, 9 calendar → on the wall.
// Moving a thing means changing its sentence and the answer key too.

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** The things' own numbers: [n, x, y]. */
const NUMS = [
  [1, 100, 372], [2, 200, 420], [3, 288, 396], [4, 300, 324], [5, 402, 302],
  [6, 512, 340], [7, 630, 252], [8, 692, 272], [9, 770, 276],
];

/** Where each thing goes: from the thing to its new place (c = the curve's control point). */
const MOVES = [
  { n: 1, from: [70, 344], to: [66, 232], c: [36, 290] },      // Milch → in den Kühlschrank
  { n: 2, from: [170, 390], to: [170, 236], c: [146, 314] },   // Löffel → in die Schublade
  { n: 3, from: [250, 372], to: [250, 112], c: [276, 244] },   // Teller → in den Schrank
  { n: 4, from: [344, 322], to: [346, 198], c: [318, 262] },   // Topf → auf den Herd
  { n: 5, from: [394, 404], to: [552, 404], c: [474, 436] },   // Stuhl → an den Tisch
  { n: 6, from: [476, 316], to: [432, 238], c: [470, 266] },   // Papier → in den Mülleimer
  { n: 7, from: [596, 248], to: [478, 144], c: [566, 164] },   // Pflanze → ans Fenster
  { n: 8, from: [660, 284], to: [596, 138], c: [646, 196] },   // Handtuch → an den Haken
  { n: 9, from: [732, 284], to: [712, 96], c: [756, 182] },    // Kalender → an die Wand
];

function numbers() {
  return `<g font-family="system-ui, sans-serif" font-weight="700" font-size="15" text-anchor="middle">${NUMS.map(([n, x, y]) =>
    `<g><circle cx="${x}" cy="${y}" r="13" fill="#f97316" stroke="#fff" stroke-width="2.5" /><text x="${x}" y="${y + 5}" fill="#fff">${n}</text></g>`).join("")}</g>`;
}

function arrows() {
  return `<g fill="none" stroke="#c2410c" stroke-width="3.5" stroke-linecap="round">${MOVES.map(({ n, from: [x1, y1], to: [x2, y2], c: [cx, cy] }) => {
    const a = Math.atan2(y2 - cy, x2 - cx);
    const h = (d) => `${(x2 - 14 * Math.cos(a + d)).toFixed(1)} ${(y2 - 14 * Math.sin(a + d)).toFixed(1)}`;
    const lx = (x2 - 22 * Math.cos(a)).toFixed(1), ly = (y2 - 22 * Math.sin(a)).toFixed(1);
    return `<path d="M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}" stroke-dasharray="9 7" stroke="#fff" stroke-width="7" opacity=".7" />
      <path d="M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}" stroke-dasharray="9 7" />
      <path d="M${h(0.45)} L${x2} ${y2} L${h(-0.45)}" stroke-width="4" stroke-linejoin="round" />
      <g font-family="system-ui, sans-serif" font-weight="700" font-size="12" text-anchor="middle" stroke="none">
        <circle cx="${lx}" cy="${ly}" r="10" fill="#fff" stroke="#c2410c" stroke-width="2" />
        <text x="${lx}" y="${+ly + 4}" fill="#c2410c">${n}</text>
      </g>`;
  }).join("")}</g>`;
}

/**
 * @param {{ nums?: boolean, moves?: boolean, label?: string }} [o]
 */
export function kuecheSvg({ nums = true, moves = true, label = "A messy kitchen. Nine things are numbered, and arrows show where they go." } = {}) {
  return `<svg viewBox="0 0 800 440" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">
    <g stroke="#1c2b3f" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
      <!-- Wand (Fliesen) und Boden -->
      <rect x="0" y="0" width="800" height="290" fill="#e3eef6" stroke="none" />
      <g stroke="#cbdbe8" stroke-width="1.5" fill="none">
        <path d="M116 150 H410 M116 175 H410 M150 150 V200 M190 150 V200 M230 150 V200 M270 150 V200 M310 150 V200 M350 150 V200 M390 150 V200" />
      </g>
      <polygon points="0,290 800,290 800,440 0,440" fill="#e7d3b0" stroke="none" />
      <g stroke="#cdb48c" stroke-width="2" fill="none">
        <path d="M0 326 H800 M0 368 H800 M0 412 H800" />
        <path d="M100 290 L84 326 M260 290 L250 326 M420 290 L418 326 M580 290 L586 326 M740 290 L752 326 M40 326 L24 368 M200 326 L188 368 M360 326 L356 368 M520 326 L524 368 M680 326 L690 368 M120 368 L104 412 M280 368 L270 412 M440 368 L438 412 M600 368 L606 412" />
      </g>
      <path d="M0 290 H800" fill="none" />

      <!-- Kühlschrank -->
      <rect x="20" y="70" width="92" height="220" rx="6" fill="#f6f2ea" />
      <path d="M20 150 H112" />
      <path d="M100 100 v30 M100 170 v44" stroke-width="4.5" />

      <!-- Hängeschrank -->
      <rect x="130" y="54" width="160" height="82" fill="#e9c08f" />
      <path d="M210 54 V136" />
      <path d="M200 112 v14 M220 112 v14" stroke-width="4" />

      <!-- Dunstabzug -->
      <rect x="334" y="0" width="24" height="60" fill="#cfd8e3" />
      <polygon points="314,60 378,60 394,98 298,98" fill="#cfd8e3" />

      <!-- Arbeitsplatte, Schublade, Spüle, Herd -->
      <rect x="122" y="212" width="278" height="78" fill="#e9c08f" />
      <rect x="130" y="218" width="80" height="22" rx="2" fill="#e9c08f" stroke-width="2" />
      <path d="M160 229 h20" stroke-width="4" />
      <rect x="130" y="246" width="80" height="38" rx="2" fill="none" stroke-width="2" />
      <rect x="218" y="218" width="74" height="66" rx="2" fill="none" stroke-width="2" />
      <path d="M282 240 v18" stroke-width="4" />
      <rect x="300" y="218" width="94" height="66" rx="2" fill="#cfd8e3" stroke-width="2" />
      <rect x="310" y="236" width="74" height="38" rx="3" fill="#2b3a4f" stroke-width="2" />
      <path d="M318 228 h58" stroke-width="3" />
      <rect x="116" y="200" width="290" height="12" fill="#d9a873" />
      <!-- Spüle -->
      <rect x="226" y="196" width="56" height="6" rx="2" fill="#8a96a8" stroke-width="2" />
      <path d="M272 198 v-22 q0 -8 -10 -8 h-10" fill="none" stroke-width="4" />
      <!-- Herdplatten -->
      <ellipse cx="326" cy="199" rx="14" ry="3.5" fill="#2b3a4f" stroke-width="2" />
      <ellipse cx="368" cy="199" rx="14" ry="3.5" fill="#2b3a4f" stroke-width="2" />

      <!-- Mülleimer -->
      <rect x="416" y="248" width="32" height="42" rx="4" fill="#8a96a8" />
      <rect x="412" y="240" width="40" height="9" rx="3" fill="#a1a8b3" />

      <!-- Fenster mit Fensterbank -->
      <rect x="424" y="44" width="110" height="100" fill="#e8f7ff" />
      <path d="M479 44 V144 M424 94 H534" stroke-width="2" />
      <rect x="414" y="144" width="130" height="10" fill="#fff" />

      <!-- Haken (8) und Nagel für den Kalender (9) -->
      <rect x="586" y="108" width="20" height="7" rx="2" fill="#8a96a8" stroke-width="2" />
      <path d="M596 115 v10 q0 9 9 6 l2 -4" fill="none" stroke-width="4" />
      <circle cx="712" cy="70" r="3.5" fill="#8a96a8" stroke-width="2" />

      <!-- Tisch -->
      <rect x="560" y="300" width="220" height="14" fill="#e9c08f" />
      <path d="M574 314 V432 M766 314 V432" stroke-width="10" stroke="#b07a4a" />

      <!-- Pflanze (7) auf dem Tisch -->
      <path d="M588 300 l4 -20 h18 l4 20 Z" fill="#d9773e" />
      <path d="M601 280 q-4 -22 -16 -30 M601 280 q2 -24 14 -32 M601 280 q-12 -8 -22 -4" fill="none" stroke="#2f8f4e" stroke-width="3.5" />

      <!-- Handtuch (8) auf dem Tisch -->
      <rect x="642" y="290" width="38" height="10" rx="2" fill="#5b8def" />
      <path d="M650 290 v10 M672 290 v10" stroke="#fff" stroke-width="2" />

      <!-- Kalender (9) auf dem Tisch -->
      <rect x="712" y="292" width="42" height="8" rx="1" fill="#fff" />
      <path d="M714 290 h38" stroke="#ef6f6c" stroke-width="4" />

      <!-- Papier (6) auf dem Boden -->
      <path d="M466 330 l6 -10 l10 2 l8 -6 l4 10 l-4 10 l-10 4 l-10 -2 Z" fill="#fff" />
      <path d="M474 326 l8 4 l6 -4" fill="none" stroke-width="1.5" />

      <!-- Stuhl (5) mitten im Raum, Topf (4) darauf -->
      <rect x="370" y="290" width="12" height="70" rx="3" fill="#b07a4a" />
      <rect x="318" y="350" width="64" height="11" rx="3" fill="#b07a4a" />
      <path d="M326 361 v50 M376 361 v50" stroke-width="5" stroke="#7a5230" />
      <rect x="326" y="328" width="38" height="22" rx="4" fill="#ef6f6c" />
      <path d="M322 334 h4 M364 334 h4" stroke-width="4" />
      <ellipse cx="345" cy="327" rx="20" ry="4" fill="#cfd8e3" stroke-width="2" />

      <!-- Milch (1) vor dem Kühlschrank -->
      <rect x="56" y="356" width="28" height="40" fill="#fff" />
      <polygon points="56,356 84,356 78,346 62,346" fill="#fff" />
      <path d="M56 372 h28" stroke="#5b8def" stroke-width="5" />

      <!-- Löffel (2) auf dem Boden -->
      <ellipse cx="156" cy="404" rx="10" ry="6" fill="#cfd8e3" stroke-width="2" />
      <path d="M166 403 l26 -4" stroke-width="4" />

      <!-- Teller (3) auf dem Boden -->
      <ellipse cx="250" cy="392" rx="26" ry="7" fill="#fff" stroke-width="2" />
      <ellipse cx="250" cy="386" rx="26" ry="7" fill="#fff" stroke-width="2" />
      <ellipse cx="250" cy="380" rx="26" ry="7" fill="#fff" stroke-width="2" />
    </g>

    ${nums ? numbers() : ""}
    ${moves ? arrows() : ""}
  </svg>`;
}
