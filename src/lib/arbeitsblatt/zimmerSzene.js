// The room for the Wechselpräpositionen sheets, as an SVG string: furniture with twelve
// numbered things in clear places — something lies on, stands in front of, hangs over,
// sits under. Our own drawing (the textbook's room is the publisher's). A plain string so
// the worksheet (ZimmerSzene.astro) and the Tandembogen (partneruebungen) both draw it.
//
// Variant "a" is the worksheet's room; its numbers are what the exercises point at
// (src/data/arbeitsblatt/wechselpraepositionen.json):
//  1 Buch auf dem Bett        2 Vase auf dem Tisch        3 Lampe auf dem Schreibtisch
//  4 Bild über dem Bett       5 Katze unter dem Tisch     6 Schuhe vor dem Schrank
//  7 Jacke über dem Stuhl (the door has a hook: B hangs it there)     8 Teppich vor dem Bett      9 Handy unter dem Bett
// 10 Ball zwischen Schrank und Bett   11 Pflanze am Fenster   12 Uhr über der Tür
// English: 1 book on the bed, 2 vase on the table, 3 lamp on the desk, 4 picture above the bed,
// 5 cat under the table, 6 shoes in front of the wardrobe (Schrank), 7 jacket on/over the chair,
// 8 rug in front of the bed, 9 phone under the bed, 10 ball between the wardrobe and the bed,
// 11 plant by the window, 12 clock above the door.
// Variant "b" is Partner B's room for „Unterschiede finden": five things elsewhere (DIFFS).
// Moving a thing means changing its sentences and the answer keys too.

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Partner B's room: how far each moved thing goes, and the sentence for the key. */
export const DIFFS = [
  { key: "katze", dx: 540, dy: -186, a: "The cat is under the table.", b: "The cat is on the bed." },
  { key: "vase", dx: 520, dy: -136, a: "The vase is on the table.", b: "The vase is on the windowsill." },
  { key: "schuhe", dx: 236, dy: 4, a: "The shoes are in front of the wardrobe.", b: "The shoes are under the bed." },
  { key: "ball", dx: -446, dy: 6, a: "The ball is between the wardrobe and the bed.", b: "The ball is in front of the door." },
  { key: "uhr", dx: 252, dy: 70, a: "The clock is above the door.", b: "The clock is above the desk." },
];

const NUMS = [
  [1, 666, 206], [2, 230, 282], [3, 262, 150], [4, 642, 52], [5, 214, 396], [6, 482, 334],
  [7, 432, 360], [8, 742, 392], [9, 652, 330], [10, 550, 262], [11, 720, 150], [12, 118, 34],
];

function numbers() {
  return `<g font-family="system-ui, sans-serif" font-weight="700" font-size="15" text-anchor="middle">${NUMS.map(([n, x, y]) =>
    `<g><circle cx="${x}" cy="${y}" r="13" fill="#f97316" stroke="#fff" stroke-width="2.5" /><text x="${x}" y="${y + 5}" fill="#fff">${n}</text></g>`).join("")}</g>`;
}

/** Exercise B („Räumen Sie auf!"): where Bruno puts each thing. From the thing to its new
    place, short and close by so the arrows do not cross (c = the curve's control point); the number sits on the arrow's
    head, so a learner follows the arrow from the thing's own number to where it ends. */
export const MOVES = [
  { n: 6, from: [482, 294], to: [482, 192], c: [504, 244] },   // Schuhe → in den Schrank
  { n: 7, from: [392, 272], to: [94, 130], c: [262, 150] },    // Jacke → an die Tür (Haken)
  { n: 9, from: [624, 310], to: [700, 244], c: [650, 252] },   // Handy → aufs Bett
  { n: 2, from: [190, 238], to: [190, 64], c: [140, 150] },    // Vase → aufs Regal
  { n: 5, from: [150, 390], to: [104, 300], c: [176, 330] },   // Katze → auf den Tisch
  { n: 10, from: [548, 312], to: [744, 308], c: [640, 392] },  // Ball → unter das Bett
  { n: 4, from: [600, 94], to: [334, 112], c: [470, 46] },     // Bild → über den Schreibtisch
  { n: 8, from: [640, 384], to: [508, 346], c: [576, 398] },   // Teppich → vor den Schrank
];

function arrows() {
  return `<g fill="none" stroke="#c2410c" stroke-width="3.5" stroke-linecap="round">${MOVES.map(({ n, from: [x1, y1], to: [x2, y2], c: [cx, cy] }) => {
    // The head points along the curve's last stretch: from the control point to the end.
    const a = Math.atan2(y2 - cy, x2 - cx);
    const h = (d) => `${(x2 - 14 * Math.cos(a + d)).toFixed(1)} ${(y2 - 14 * Math.sin(a + d)).toFixed(1)}`;
    return `<path d="M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}" stroke-dasharray="9 7" stroke="#fff" stroke-width="7" opacity=".7" />
      <path d="M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}" stroke-dasharray="9 7" />
      <path d="M${h(0.45)} L${x2} ${y2} L${h(-0.45)}" stroke-width="4" stroke-linejoin="round" />
      <g font-family="system-ui, sans-serif" font-weight="700" font-size="12" text-anchor="middle" stroke="none">
        <circle cx="${x2 - 22 * Math.cos(a)}" cy="${y2 - 22 * Math.sin(a)}" r="10" fill="#fff" stroke="#c2410c" stroke-width="2" />
        <text x="${x2 - 22 * Math.cos(a)}" y="${y2 - 22 * Math.sin(a) + 4}" fill="#c2410c">${n}</text>
      </g>`;
  }).join("")}</g>`;
}

/**
 * @param {{ variant?: "a" | "b", nums?: boolean, moves?: boolean, label?: string }} [o]
 */
export function zimmerSvg({ variant = "a", nums = true, moves = false, label = "A room with a bed, a wardrobe, a desk, shelves, a table and a chair." } = {}) {
  const moved = variant === "b" ? Object.fromEntries(DIFFS.map((d) => [d.key, d])) : {};
  const move = (k) => (moved[k] ? ` transform="translate(${moved[k].dx} ${moved[k].dy})"` : "");
  return `<svg viewBox="0 0 800 440" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">
    <g stroke="#1c2b3f" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
      <!-- Wand und Boden -->
      <rect x="0" y="0" width="800" height="290" fill="#dcefd6" stroke="none" />
      <polygon points="0,290 800,290 800,440 0,440" fill="#d7a173" stroke="none" />
      <g stroke="#b9845a" stroke-width="2" fill="none">
        <path d="M0 322 H800 M0 360 H800 M0 402 H800" />
        <path d="M120 290 L90 322 M330 290 L310 322 M560 290 L548 322 M60 322 L30 360 M260 322 L236 360 M700 322 L690 360 M160 360 L130 402 M430 360 L410 402 M640 360 L628 402" />
      </g>
      <path d="M0 290 H800" fill="none" />

      <!-- Tür und Uhr (12) -->
      <rect x="30" y="64" width="96" height="226" fill="#f6f2ea" />
      <rect x="44" y="80" width="68" height="84" rx="3" fill="none" stroke-width="2" />
      <rect x="44" y="178" width="68" height="96" rx="3" fill="none" stroke-width="2" />
      <path d="M108 176 h12" stroke-width="4" />
      <!-- a coat hook on the door: „Ich hänge die Jacke an die Tür.“ -->
      <rect x="68" y="98" width="20" height="7" rx="2" fill="#8a96a8" stroke-width="2" />
      <path d="M78 105 v12 q0 10 10 7 l2 -5" fill="none" stroke-width="4" />
      <g${move("uhr")}>
      <circle cx="78" cy="34" r="20" fill="#fff" />
      <path d="M78 34 V22 M78 34 L88 38" stroke-width="2.5" />
      </g>

      <!-- Regal -->
      <rect x="148" y="70" width="86" height="220" fill="#e9c08f" />
      <path d="M148 124 H234 M148 178 H234 M148 232 H234" />
      <rect x="156" y="88" width="10" height="36" fill="#0d9488" stroke-width="2" />
      <rect x="168" y="94" width="9" height="30" fill="#f97316" stroke-width="2" />
      <rect x="179" y="90" width="11" height="34" fill="#f2a900" stroke-width="2" />
      <rect x="198" y="100" width="28" height="24" fill="#fff" stroke-width="2" />
      <rect x="158" y="146" width="12" height="32" fill="#5b8def" stroke-width="2" />
      <rect x="172" y="142" width="9" height="36" fill="#ef6f6c" stroke-width="2" />
      <path d="M186 178 l18 -30 l9 5 l-18 30" fill="#99f6e4" stroke-width="2" />
      <rect x="160" y="204" width="60" height="28" rx="3" fill="#cfd8e3" stroke-width="2" />

      <!-- Schreibtisch, Lampe (3), Bildschirm -->
      <rect x="244" y="196" width="160" height="12" fill="#e9c08f" />
      <rect x="252" y="208" width="10" height="82" fill="#e9c08f" />
      <rect x="352" y="208" width="44" height="82" fill="#e9c08f" />
      <path d="M352 236 H396 M352 262 H396" stroke-width="2" />
      <path d="M266 196 h28 M280 196 L280 168 L302 146" fill="none" stroke-width="3.5" />
      <path d="M294 136 L316 132 L312 160 Z" fill="#0d9488" />
      <rect x="322" y="140" width="62" height="42" rx="3" fill="#2b3a4f" />
      <rect x="328" y="146" width="50" height="30" fill="#7dd3c8" stroke="none" />
      <path d="M353 182 v14 M340 196 h26" stroke-width="3" />

      <!-- Stuhl und Jacke (7): out on the open floor, in front of everything, so the jacket
           plainly hangs over the chair's back (not on the desk or the table) -->
      <rect x="392" y="276" width="12" height="108" rx="3" fill="#b07a4a" />
      <rect x="330" y="336" width="74" height="12" rx="3" fill="#b07a4a" />
      <path d="M338 348 v44 M398 348 v44" stroke-width="5" stroke="#7a5230" />
      <g transform="translate(8 86)">
      <path d="M372 188 q12 -6 24 0 l10 40 q-6 32 -12 40 l-10 -2 l2 -36 l-6 36 l-12 0 l-4 -40 Z" fill="#5b8def" />
      <path d="M384 188 v26" stroke-width="2" />
      </g>

      <!-- Schrank -->
      <rect x="424" y="62" width="112" height="228" fill="#e9c08f" />
      <path d="M480 62 V290" />
      <path d="M472 160 v24 M488 160 v24" stroke-width="4" />
      <rect x="418" y="52" width="124" height="12" fill="#d9a873" />

      <!-- Schuhe (6) vor dem Schrank -->
      <g${move("schuhe")}>
      <path d="M440 306 q0 -14 12 -14 l10 0 q14 6 18 14 Z" fill="#ef6f6c" />
      <path d="M484 312 q0 -14 12 -14 l10 0 q14 6 18 14 Z" fill="#ef6f6c" />
      </g>

      <!-- Ball (10) zwischen Schrank und Bett -->
      <g${move("ball")}>
      <circle cx="550" cy="296" r="14" fill="#f2a900" />
      <path d="M537 292 q13 8 26 0 M550 282 v28" fill="none" stroke-width="2" />
      </g>

      <!-- Bild (4) über dem Bett -->
      <rect x="600" y="70" width="84" height="60" fill="#fff" />
      <rect x="608" y="78" width="68" height="44" fill="#bfe9f7" stroke-width="2" />
      <path d="M608 122 l20 -22 l14 12 l12 -16 l22 26 Z" fill="#7cc58a" stroke-width="2" />
      <circle cx="660" cy="92" r="6" fill="#f2a900" stroke-width="2" />

      <!-- Fenster und Pflanze (11) -->
      <rect x="700" y="40" width="88" height="130" fill="#e8f7ff" />
      <path d="M744 40 V170 M700 104 H788" stroke-width="2" />
      <rect x="694" y="170" width="100" height="10" fill="#fff" />
      <path d="M742 170 l6 -22 h18 l6 22 Z" fill="#d9773e" transform="translate(14 0)" />
      <path d="M770 148 q-4 -24 -18 -34 M770 148 q2 -26 16 -36 M770 148 q-14 -10 -24 -6" fill="none" stroke="#2f8f4e" stroke-width="3.5" />

      <!-- Bett, Buch (1), Handy (9) -->
      <rect x="566" y="214" width="20" height="96" rx="4" fill="#e9c08f" />
      <rect x="586" y="250" width="200" height="44" fill="#e9c08f" />
      <path d="M598 294 v20 M774 294 v20" stroke-width="6" />
      <rect x="586" y="226" width="200" height="26" rx="8" fill="#fff" />
      <path d="M640 226 q40 -8 140 0 v26 h-140 Z" fill="#9fd8cf" />
      <rect x="594" y="214" width="44" height="18" rx="8" fill="#f6f2ea" />
      <path d="M612 230 l20 -8 l22 6 l-20 8 Z" fill="#f97316" stroke-width="2" />
      <path d="M632 222 l2 8" stroke-width="2" />
      <rect x="610" y="312" width="22" height="9" rx="2" fill="#2b3a4f" stroke-width="2" />

      <!-- Teppich (8) vor dem Bett -->
      <ellipse cx="682" cy="384" rx="96" ry="24" fill="#f6c6d0" />
      <ellipse cx="682" cy="384" rx="74" ry="15" fill="none" stroke="#e58aa0" stroke-width="2.5" />

      <!-- Tisch, Vase (2), Katze (5) -->
      <rect x="40" y="306" width="230" height="14" fill="#e9c08f" />
      <path d="M54 320 V432 M256 320 V432" stroke-width="10" stroke="#b07a4a" />
      <g${move("vase")}>
      <path d="M182 306 q-6 -18 4 -30 h12 q10 12 4 30 Z" fill="#fff" />
      <path d="M192 276 v-22 M192 262 l-10 -14 M192 262 l10 -12" fill="none" stroke="#2f8f4e" stroke-width="3" />
      <circle cx="192" cy="250" r="7" fill="#ef6f6c" stroke-width="2" />
      <circle cx="181" cy="246" r="5" fill="#f2a900" stroke-width="2" />
      <circle cx="203" cy="248" r="5" fill="#f97316" stroke-width="2" />
      </g>
      <g${move("katze")}>
      <ellipse cx="148" cy="412" rx="36" ry="16" fill="#a1a8b3" />
      <circle cx="116" cy="400" r="14" fill="#a1a8b3" />
      <path d="M106 390 l2 -12 l8 8 M120 386 l6 -10 l2 12" fill="#a1a8b3" />
      <path d="M110 400 q3 3 6 0 M118 400 q3 3 6 0" fill="none" stroke-width="2" />
      <path d="M182 414 q24 4 20 -16" fill="none" stroke-width="5" stroke="#a1a8b3" />
      <path d="M182 414 q24 4 20 -16" fill="none" stroke-width="2" />
      </g>
    </g>

    ${nums ? numbers(variant) : ""}
    ${moves ? arrows() : ""}
  </svg>`;
}
