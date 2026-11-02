// The EnglishAcademy mascot crew as SVG strings, drawn on a 200×200 grid with the
// brand colours baked in. Source of truth for the drawings is the "EnglishAcademy
// Mascots" design canvas; keep the two in step.
//
// One module, three readers: src/components/mascots/Mascot.astro (pages),
// src/lib/mascotCelebrate.js (the milestone overlay, built in the browser) and
// scripts/lib/pdf-art.mjs (rasterised into the generated PDFs). Plain strings, no
// framework, so all three can import it.
//
// name: bruno (Dackel, coach) · regi (Igel, Grammatik) · hamsti (Hamster,
//       Wortschatz) · quaki (Frosch, Sprechen)
// expr: happy | thinking | celebrate | oops | sleepy — every mascot (Bruno had them first;
//       ouch — Regi only: Super-Blubb hit in Die Legende von Lindenau;
//       Hamsti, Regi and Quaki got theirs so the Landeskunde comics can show a mood).
// view: front | three (a ¾ turn of the face)
// extra: schleife | fliege — an accessory for a "sie" and an "er" version of the same
//       mascot (the Frau | Mann dictionary on /culture/insider). Every mascot has both;
//       Regi wears a bow tie anyway, so her "sie" turns it pink and adds the head bow.
//       klemmbrett — Bruno only: the clipboard he holds in the teacher area (/teachers),
//       BRUNO-LEHRKRAEFTE-STICKER-TIERED-PROMPT.md. Nowhere else.
//       pfeife | stoppuhr | megafon | pokal | ballon | zeigestock | bleistift | lupe |
//       mikrofon | karten — one prop per „So funktioniert's" film (/explore/films), so no
//       two films show the same figure. Any mascot can hold one (the whistle is Bruno's).
//       Each moving part has a class (mx-…); MascotGuide.astro animates them.
//       blaster — Hamsti only: no „Aa“ card and no front paws; Hör-Safari draws the paws on
//       its Gummi-Blaster, so Hamsti holds the gun.

export const MASCOT_NAMES = ["bruno", "regi", "hamsti", "quaki"];

export const MASCOT_LABELS = {
  // "Name, the animal": ruleIntro.js takes the part before the comma as the short name.
  bruno: "Bruno, the dachshund",
  regi: "Regi, the hedgehog",
  hamsti: "Hamsti, the hamster",
  quaki: "Quaki, the frog",
};

const tf = (t) => (t ? ` transform="${t}"` : "");

// Shared pieces of the moods, placed per mascot: thought bubbles rising to the top right,
// confetti around the head, a sweat drop, and the "z Z" of sleep.
const bubbles = (x, y) => `
          <circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke-width="3" />
          <circle cx="${x + 12}" cy="${y - 14}" r="6" fill="#fff" stroke-width="3" />
          <circle cx="${x + 28}" cy="${y - 32}" r="10" fill="#fff" stroke-width="3" />`;
const confetti = (dx = 0, dy = 0) => `
          <g transform="translate(${dx} ${dy})">
          <rect x="18" y="28" width="10" height="5" rx="2" fill="#f97316" stroke="none" transform="rotate(-30 23 30)" />
          <rect x="140" y="20" width="10" height="5" rx="2" fill="#0d9488" stroke="none" transform="rotate(25 145 22)" />
          <rect x="160" y="60" width="10" height="5" rx="2" fill="#f2a900" stroke="none" transform="rotate(-20 165 62)" />
          <circle cx="10" cy="64" r="4" fill="#0d9488" stroke="none" />
          <circle cx="110" cy="12" r="4" fill="#f2a900" stroke="none" />
          <circle cx="44" cy="12" r="3.5" fill="#f97316" stroke="none" />
          <path d="M176 30 L180 38 L188 40 L180 42 L176 50 L172 42 L164 40 L172 38 Z" fill="#f2a900" stroke-width="2.5" />
          </g>`;
const drop = (x, y) => `<path d="M${x} ${y} q9 13 0 18 q-9 -5 0 -18 Z" fill="#99f6e4" stroke-width="3" />`;
const zz = (x, y, voice) => `
          <text x="${x}" y="${y}" ${voice} font-weight="700" font-size="20" fill="#0d9488" stroke="none">z</text>
          <text x="${x + 14}" y="${y - 16}" ${voice} font-weight="700" font-size="28" fill="#0d9488" stroke="none">Z</text>`;

function bruno(expr, three, faceT, voice, extra) {
  const faces = {
    happy: `<g>
          <ellipse cx="56" cy="72" rx="7" ry="9" fill="#1a2230" stroke="none" />
          <ellipse cx="84" cy="72" rx="7" ry="9" fill="#1a2230" stroke="none" />
          <circle cx="58.5" cy="68.5" r="2.6" fill="#fff" stroke="none" />
          <circle cx="86.5" cy="68.5" r="2.6" fill="#fff" stroke="none" />
          <path d="M70 98 L70 103 M62 102 Q66 109 70 103 Q74 109 78 102" fill="none" stroke-width="3.5" />
          <ellipse cx="44" cy="90" rx="6" ry="4" fill="#f28b82" opacity="0.6" stroke="none" />
          <ellipse cx="96" cy="90" rx="6" ry="4" fill="#f28b82" opacity="0.6" stroke="none" />
        </g>`,
    thinking: `<g>
          <ellipse cx="59" cy="70" rx="6" ry="8" fill="#1a2230" stroke="none" />
          <ellipse cx="87" cy="70" rx="6" ry="8" fill="#1a2230" stroke="none" />
          <circle cx="61" cy="67" r="2.2" fill="#fff" stroke="none" />
          <circle cx="89" cy="67" r="2.2" fill="#fff" stroke="none" />
          <path d="M47 60 L62 61" fill="none" stroke-width="3.5" />
          <path d="M78 58 Q86 51 94 57" fill="none" stroke-width="3.5" />
          <path d="M70 98 L70 103 M63 106 Q70 103 78 107" fill="none" stroke-width="3.5" />
          <circle cx="118" cy="48" r="4" fill="#fff" stroke-width="3" />
          <circle cx="130" cy="34" r="6" fill="#fff" stroke-width="3" />
          <circle cx="148" cy="18" r="10" fill="#fff" stroke-width="3" />
        </g>`,
    celebrate: `<g>
          <path d="M49 74 Q56 64 63 74" fill="none" stroke-width="4.5" />
          <path d="M77 74 Q84 64 91 74" fill="none" stroke-width="4.5" />
          <path d="M59 102 Q70 124 81 102 Z" fill="#7a2230" stroke-width="3.5" />
          <ellipse cx="70" cy="112" rx="6" ry="4" fill="#f28b82" stroke="none" />
          <ellipse cx="44" cy="88" rx="7" ry="4.5" fill="#f28b82" opacity="0.7" stroke="none" />
          <ellipse cx="96" cy="88" rx="7" ry="4.5" fill="#f28b82" opacity="0.7" stroke="none" />
          <rect x="18" y="28" width="10" height="5" rx="2" fill="#f97316" stroke="none" transform="rotate(-30 23 30)" />
          <rect x="112" y="24" width="10" height="5" rx="2" fill="#0d9488" stroke="none" transform="rotate(25 117 26)" />
          <rect x="132" y="56" width="10" height="5" rx="2" fill="#f2a900" stroke="none" transform="rotate(-20 137 58)" />
          <circle cx="10" cy="60" r="4" fill="#0d9488" stroke="none" />
          <circle cx="96" cy="16" r="4" fill="#f2a900" stroke="none" />
          <circle cx="40" cy="14" r="3.5" fill="#f97316" stroke="none" />
          <path d="M150 30 L154 38 L162 40 L154 42 L150 50 L146 42 L138 40 L146 38 Z" fill="#f2a900" stroke-width="2.5" />
        </g>`,
    oops: `<g>
          <circle cx="56" cy="72" r="9" fill="#fff" stroke-width="3" />
          <circle cx="84" cy="72" r="9" fill="#fff" stroke-width="3" />
          <circle cx="56" cy="73" r="4" fill="#1a2230" stroke="none" />
          <circle cx="84" cy="73" r="4" fill="#1a2230" stroke="none" />
          <path d="M46 58 L62 62" fill="none" stroke-width="3.5" />
          <path d="M78 62 L94 58" fill="none" stroke-width="3.5" />
          <path d="M60 107 q5 -5 10 0 q5 5 10 0" fill="none" stroke-width="3.5" />
          <path d="M112 44 q9 13 0 18 q-9 -5 0 -18 Z" fill="#99f6e4" stroke-width="3" />
        </g>`,
    sleepy: `<g>
          <path d="M49 72 Q56 79 63 72" fill="none" stroke-width="4.5" />
          <path d="M77 72 Q84 79 91 72" fill="none" stroke-width="4.5" />
          <path d="M70 98 L70 102" fill="none" stroke-width="3.5" />
          <ellipse cx="70" cy="106" rx="3.5" ry="4" fill="#7a2230" stroke-width="3" />
          <text x="112" y="52" ${voice} font-weight="700" font-size="20" fill="#0d9488" stroke="none">z</text>
          <text x="126" y="36" ${voice} font-weight="700" font-size="28" fill="#0d9488" stroke="none">Z</text>
        </g>`,
  };
  return `
    <path d="M176 118 Q196 106 190 80" fill="none" stroke-width="16" />
    <path d="M176 118 Q196 106 190 80" fill="none" stroke="#fb923c" stroke-width="6" />
    <rect x="140" y="134" width="18" height="38" rx="9" fill="#c2410c" />
    <rect x="160" y="134" width="18" height="38" rx="9" fill="#c2410c" />
    <rect x="60" y="100" width="124" height="54" rx="27" fill="#fb923c" />
    <ellipse cx="130" cy="140" rx="36" ry="7" fill="#fed7aa" stroke="none" />
    <rect x="58" y="136" width="18" height="38" rx="9" fill="#fb923c" />
    <rect x="82" y="136" width="18" height="38" rx="9" fill="#fb923c" />
    <path d="M40 108 Q72 128 106 108 L108 124 Q72 146 38 124 Z" fill="#0d9488" />
    <path d="M88 128 L102 156 L84 158 Z" fill="#115e59" />
    <circle cx="70" cy="80" r="40" fill="#fb923c" />
    <path d="M62 42 Q68 30 72 41 Q76 32 80 43" fill="none" stroke-width="4" />
    <g${tf(three ? "translate(-16 2)" : "")}>
      <ellipse cx="106" cy="88" rx="13" ry="28" transform="rotate(-16 106 88)" fill="#c2410c" />
    </g>
    <ellipse cx="34" cy="88" rx="13" ry="28" transform="rotate(16 34 88)" fill="#c2410c" />
    <g${tf(faceT)}>
      <ellipse cx="70" cy="100" rx="22" ry="15" fill="#fed7aa" />
      <ellipse cx="70" cy="92" rx="8.5" ry="6" fill="#1a2230" stroke="none" />
      <circle cx="67" cy="90" r="2" fill="#fff" stroke="none" />
      ${faces[expr] ?? faces.happy}
    </g>
    ${extra === "schleife" ? schleifeAt(46, 48, 0.85, -28) : ""}
    ${extra === "fliege" ? fliegeAt(74, 131, 0.85) : ""}
    ${extra === "klemmbrett" ? klemmbrettAt(three ? -6 : 0) : ""}
    ${propFor("bruno", extra)}`;
}

// The film props (see the header), drawn once in Bruno's frame: the grip is at his front paw
// (100, 150). heldProp moves and scales that grip into another mascot's hand and draws the hand
// over it. The whistle is Bruno's alone (in his mouth, ¾ view), the rest can go to anyone.
const PROPS = {
  stoppuhr: `
    <rect x="113" y="98" width="10" height="8" rx="2" fill="#cbd5e1" stroke-width="3" />
    <circle cx="118" cy="124" r="19" fill="#fff" stroke-width="4" />
    <path d="M118 108 L118 111 M134 124 L131 124 M118 140 L118 137 M102 124 L105 124" fill="none" stroke-width="2.5" />
    <g class="mx-hand" style="transform-origin:118px 124px"><path d="M118 124 L118 110" fill="none" stroke="#f97316" stroke-width="3.5" /></g>
    <circle cx="118" cy="124" r="2.5" fill="#1a2230" stroke="none" />`,
  megafon: `
    <g class="mx-wellen" fill="none" stroke-width="3.5">
      <path d="M152 106 Q160 118 152 130" />
      <path d="M162 98 Q174 118 162 138" />
    </g>
    <path d="M104 126 L142 104 L142 140 Z" fill="#0d9488" stroke-width="4" />
    <rect x="98" y="118" width="12" height="16" rx="3" fill="#115e59" stroke-width="3" />`,
  pokal: `
    <path d="M104 104 Q92 106 96 116 Q100 124 108 122 M132 104 Q144 106 140 116 Q136 124 128 122" fill="none" stroke-width="3.5" />
    <path d="M104 100 L132 100 Q132 126 118 130 Q104 126 104 100 Z" fill="#f2a900" stroke-width="4" />
    <rect x="114" y="129" width="8" height="10" fill="#f2a900" stroke-width="3" />
    <rect x="106" y="138" width="24" height="8" rx="2" fill="#c2410c" stroke-width="3" />
    <g class="mx-glanz" style="transform-origin:138px 92px"><path d="M138 84 L140 90 L146 92 L140 94 L138 100 L136 94 L130 92 L136 90 Z" fill="#fff" stroke-width="2.5" /></g>`,
  ballon: `
    <g class="mx-ballon" style="transform-origin:100px 150px">
      <path d="M100 150 Q132 112 136 64" fill="none" stroke-width="2.5" />
      <ellipse cx="136" cy="40" rx="18" ry="22" fill="#f43f5e" stroke-width="4" />
      <path d="M132 62 L136 62 L140 62 L136 68 Z" fill="#f43f5e" stroke-width="3" />
      <ellipse cx="129" cy="31" rx="4" ry="7" fill="#fff" opacity=".6" stroke="none" />
    </g>`,
  zeigestock: `
    <g class="mx-zeig" style="transform-origin:100px 150px">
      <path d="M100 150 L168 84" fill="none" stroke-width="9" />
      <path d="M100 150 L168 84" fill="none" stroke="#b45309" stroke-width="4" />
      <circle cx="168" cy="84" r="5" fill="#f43f5e" stroke-width="3" />
    </g>`,
  bleistift: `
    <g transform="translate(-8 8)"><g class="mx-stift" style="transform-origin:108px 142px">
      <path d="M96 156 L140 112 L148 120 L104 164 Z" fill="#f2a900" stroke-width="3.5" />
      <path d="M140 112 L146 106 L154 114 L148 120 Z" fill="#f9a8d4" stroke-width="3.5" />
      <path d="M96 156 L104 164 L90 170 Z" fill="#fed7aa" stroke-width="3" />
      <circle cx="92" cy="167" r="2" fill="#1a2230" stroke="none" />
    </g></g>`,
  lupe: `
    <g class="mx-lupe" style="transform-origin:100px 150px">
      <path d="M100 150 L120 128" fill="none" stroke-width="11" />
      <path d="M100 150 L120 128" fill="none" stroke="#b45309" stroke-width="5" />
      <circle cx="132" cy="114" r="18" fill="#e0f2fe" stroke-width="5" />
      <path d="M122 106 Q126 100 133 99" fill="none" stroke="#fff" stroke-width="3.5" />
    </g>`,
  mikrofon: `
    <g class="mx-noten" fill="none" stroke-width="3.5">
      <g class="mx-n1"><path d="M128 100 L128 84 L136 86" /><ellipse cx="124" cy="101" rx="5" ry="4" fill="#1a2230" /></g>
      <g class="mx-n2"><path d="M150 92 L150 76 L158 78" /><ellipse cx="146" cy="93" rx="5" ry="4" fill="#1a2230" /></g>
    </g>
    <path d="M94 128 L106 128 L103 158 L97 158 Z" fill="#334155" stroke-width="3.5" />
    <circle cx="100" cy="118" r="13" fill="#cbd5e1" stroke-width="4" />
    <path d="M91 114 L109 114 M90 121 L110 121" fill="none" stroke="#64748b" stroke-width="2" />`,
  karten: `
    <rect x="108" y="98" width="40" height="28" rx="4" fill="#99f6e4" stroke-width="3.5" transform="rotate(-12 128 112)" />
    <g class="mx-karte" style="transform-origin:122px 124px">
      <rect x="102" y="110" width="40" height="28" rx="4" fill="#fff" stroke-width="3.5" />
      <path d="M110 120 L134 120 M110 128 L126 128" fill="none" stroke="#0d9488" stroke-width="3" />
    </g>`,
};
const handAt = (x, y, fill, s = 1) => `<ellipse cx="${x}" cy="${y}" rx="${10 * s}" ry="${9 * s}" fill="${fill}" />`;
/** Prop `name` held at (x, y) in a hand of colour `hand`, scaled by s. */
function heldProp(name, x, y, hand, s = 1) {
  if (!PROPS[name]) return "";
  return `<g transform="translate(${x - 100 * s} ${y - 150 * s}) scale(${s})">${PROPS[name]}</g>${handAt(x, y, hand, s)}`;
}
const brunoProps = {
  pfeife: `
    <path d="M58 112 Q72 126 92 116" fill="none" stroke="#0d9488" stroke-width="2.5" />
    <g transform="rotate(-28 58 110)">
      <g class="mx-pfeife" style="transform-origin:58px 110px">
        <rect x="30" y="104" width="28" height="13" rx="6.5" fill="#f2a900" stroke-width="3" />
        <rect x="52" y="106" width="10" height="7" rx="2" fill="#f2a900" stroke-width="3" />
        <circle cx="38" cy="110.5" r="3" fill="#1a2230" stroke="none" />
      </g>
      <g class="mx-toot" style="transform-origin:26px 110px" stroke-width="3.5">
        <path d="M22 102 L12 96 M20 111 L8 111 M22 120 L12 126" fill="none" />
      </g>
    </g>`,
};
// Where the others hold a prop: their hand (x, y), its colour, and a scale for their size.
const HANDS = { regi: [142, 154, "#ffedd5", 0.9], hamsti: [138, 152, "#fed7aa", 0.9], quaki: [142, 152, "#14b8a6", 0.95] };
const propFor = (name, extra) => {
  if (!extra) return "";
  if (name === "bruno") return brunoProps[extra] ?? heldProp(extra, 100, 150, "#fb923c");
  const h = HANDS[name];
  return h ? heldProp(extra, h[0], h[1], h[2], h[3]) : "";
};

// Bruno's clipboard: held up in front of his chest by a front paw, a ticked list on it.
const klemmbrettAt = (dx) => `
    <g transform="translate(${dx} 0) rotate(-10 116 140)">
      <rect x="98" y="112" width="38" height="48" rx="5" fill="#b45309" />
      <rect x="103" y="119" width="28" height="36" rx="2" fill="#fff" stroke-width="2.5" />
      <path d="M108 128 L126 128 M108 136 L124 136" fill="none" stroke-width="2.5" opacity=".55" />
      <path d="M107 145 l4 4 l8 -9" fill="none" stroke="#0d9488" stroke-width="3.5" />
      <rect x="108" y="106" width="18" height="10" rx="3" fill="#cbd5e1" stroke-width="3" />
    </g>
    <ellipse cx="${100 + dx}" cy="150" rx="10" ry="9" fill="#fb923c" />`;

function regi(expr, faceT, voice, extra) {
  const tie = extra === "schleife" ? ["#f472b6", "#ec4899"] : ["#f97316", "#c2410c"];
  const eyes = (px, py, r = 0) => r
    ? `<circle cx="${84 + px}" cy="${118 + py}" r="${r}" fill="#1a2230" stroke="none" />
      <circle cx="${116 + px}" cy="${118 + py}" r="${r}" fill="#1a2230" stroke="none" />`
    : `<ellipse cx="${84 + px}" cy="${118 + py}" rx="4.5" ry="6" fill="#1a2230" stroke="none" />
      <ellipse cx="${116 + px}" cy="${118 + py}" rx="4.5" ry="6" fill="#1a2230" stroke="none" />
      <circle cx="${86 + px}" cy="${115 + py}" r="1.8" fill="#fff" stroke="none" />
      <circle cx="${118 + px}" cy="${115 + py}" r="1.8" fill="#fff" stroke="none" />`;
  const faces = {
    happy: `${eyes(2, 2)}<path d="M92 147 Q100 153 108 147" fill="none" stroke-width="3.5" />`,
    thinking: `${eyes(4, -3)}
      <path d="M76 99 L92 101" fill="none" stroke-width="3.5" />
      <path d="M108 97 Q116 90 124 97" fill="none" stroke-width="3.5" />
      <path d="M93 149 Q100 146 108 150" fill="none" stroke-width="3.5" />${bubbles(154, 84)}`,
    celebrate: `<path d="M77 121 Q84 111 91 121" fill="none" stroke-width="4.5" />
      <path d="M109 121 Q116 111 123 121" fill="none" stroke-width="4.5" />
      <path d="M90 146 Q100 164 110 146 Z" fill="#7a2230" stroke-width="3.5" />
      <ellipse cx="100" cy="154" rx="5" ry="3" fill="#f28b82" stroke="none" />${confetti(0, 10)}`,
    oops: `${eyes(0, 0, 3.5)}
      <path d="M74 100 L90 96" fill="none" stroke-width="3.5" />
      <path d="M110 96 L126 100" fill="none" stroke-width="3.5" />
      <path d="M90 150 q5 -5 10 0 q5 5 10 0" fill="none" stroke-width="3.5" />${drop(160, 86)}`,
    sleepy: `<path d="M77 118 Q84 125 91 118" fill="none" stroke-width="4.5" />
      <path d="M109 118 Q116 125 123 118" fill="none" stroke-width="4.5" />
      <ellipse cx="100" cy="151" rx="3.5" ry="4" fill="#7a2230" stroke-width="3" />${zz(150, 86, voice)}`,
    // Die Legende von Lindenau: Super-Blubb (Regi) hit by a monster. Eyes squeezed shut, teeth gritted, stars.
    ouch: `<path d="M77 111 L91 118 L77 125" fill="none" stroke-width="4.5" />
      <path d="M123 111 L109 118 L123 125" fill="none" stroke-width="4.5" />
      <path d="M74 100 L90 106 M126 100 L110 106" fill="none" stroke-width="3.5" />
      <rect x="86" y="144" width="28" height="13" rx="5" fill="#fff" stroke-width="3.5" />
      <path d="M93 144 V157 M100 144 V157 M107 144 V157 M86 150.5 H114" fill="none" stroke-width="2" />
      ${[[34, 58, 1], [166, 54, 0.85], [100, 22, 0.7]].map(([x, y, k]) => `<path d="M${x} ${y - 12 * k} L${x + 3.5 * k} ${y - 3.5 * k} L${x + 12 * k} ${y} L${x + 3.5 * k} ${y + 3.5 * k} L${x} ${y + 12 * k} L${x - 3.5 * k} ${y + 3.5 * k} L${x - 12 * k} ${y} L${x - 3.5 * k} ${y - 3.5 * k} Z" fill="#facc15" stroke-width="2.5" />`).join("")}`,
  };
  return `
    <ellipse cx="80" cy="174" rx="14" ry="8" fill="#ffedd5" />
    <ellipse cx="120" cy="174" rx="14" ry="8" fill="#ffedd5" />
    <path d="M44 112 L28 96 L50 88 L40 66 L64 68 L60 44 L84 54 L90 32 L104 50 L118 32 L124 54 L146 44 L142 68 L164 64 L154 88 L174 94 L158 112 Z" fill="#115e59" />
    <circle cx="100" cy="116" r="56" fill="#115e59" />
    <path d="M70 76 L78 84 M100 66 L100 76 M130 76 L122 84" fill="none" stroke="#2a8a80" stroke-width="4" />
    <g${tf(faceT)}>
      <circle cx="62" cy="96" r="10" fill="#ffedd5" />
      <circle cx="138" cy="96" r="10" fill="#ffedd5" />
      <ellipse cx="100" cy="128" rx="44" ry="38" fill="#ffedd5" />
      <ellipse cx="70" cy="140" rx="7" ry="4.5" fill="#f28b82" opacity="0.6" stroke="none" />
      <ellipse cx="130" cy="140" rx="7" ry="4.5" fill="#f28b82" opacity="0.6" stroke="none" />
      <circle cx="84" cy="118" r="14" fill="#fff" stroke-width="4" />
      <circle cx="116" cy="118" r="14" fill="#fff" stroke-width="4" />
      <path d="M98 116 Q100 111 102 116" fill="none" stroke-width="4" />
      <ellipse cx="100" cy="138" rx="7" ry="5" fill="#1a2230" stroke="none" />
      ${faces[expr] ?? faces.happy}
    </g>
    ${extra === "schleife" ? schleifeAt(64, 60, 0.9, -22) : ""}
    <path d="M100 170 L84 161 L84 179 Z" fill="${tie[0]}" stroke-width="4" />
    <path d="M100 170 L116 161 L116 179 Z" fill="${tie[0]}" stroke-width="4" />
    <circle cx="100" cy="170" r="5" fill="${tie[1]}" stroke-width="3" />
    ${propFor("regi", extra)}`;
}

function hamsti(expr, three, faceT, voice, extra) {
  const nose = `<path d="M95 106 L105 106 L100 112 Z" fill="#f28b82" stroke-width="3" />`;
  const openEyes = (px = 0, py = 0) => `
      <ellipse cx="${82 + px}" cy="${94 + py}" rx="7" ry="9" fill="#1a2230" stroke="none" />
      <ellipse cx="${118 + px}" cy="${94 + py}" rx="7" ry="9" fill="#1a2230" stroke="none" />
      <circle cx="${84.5 + px}" cy="${90.5 + py}" r="2.6" fill="#fff" stroke="none" />
      <circle cx="${120.5 + px}" cy="${90.5 + py}" r="2.6" fill="#fff" stroke="none" />`;
  const faces = {
    happy: `${openEyes()}${nose}
      <rect x="96" y="118" width="8" height="7" rx="1.5" fill="#fff" stroke-width="2.5" />
      <path d="M91 116 Q95.5 122 100 116 Q104.5 122 109 116" fill="none" stroke-width="3.5" />`,
    thinking: `${openEyes(3, -3)}
      <path d="M72 78 L90 80" fill="none" stroke-width="3.5" />
      <path d="M110 76 Q119 69 128 76" fill="none" stroke-width="3.5" />${nose}
      <path d="M92 119 Q100 115 108 120" fill="none" stroke-width="3.5" />${bubbles(150, 62)}`,
    celebrate: `<path d="M74 96 Q82 85 90 96" fill="none" stroke-width="4.5" />
      <path d="M110 96 Q118 85 126 96" fill="none" stroke-width="4.5" />${nose}
      <path d="M89 115 Q100 136 111 115 Z" fill="#7a2230" stroke-width="3.5" />
      <rect x="96" y="115" width="8" height="6" rx="1.5" fill="#fff" stroke-width="2.5" />
      <ellipse cx="100" cy="127" rx="5" ry="3" fill="#f28b82" stroke="none" />${confetti()}`,
    oops: `
      <circle cx="82" cy="95" r="9" fill="#fff" stroke-width="3" />
      <circle cx="118" cy="95" r="9" fill="#fff" stroke-width="3" />
      <circle cx="82" cy="96" r="4" fill="#1a2230" stroke="none" />
      <circle cx="118" cy="96" r="4" fill="#1a2230" stroke="none" />
      <path d="M71 83 L88 79" fill="none" stroke-width="3.5" />
      <path d="M112 79 L129 83" fill="none" stroke-width="3.5" />${nose}
      <path d="M90 121 q5 -5 10 0 q5 5 10 0" fill="none" stroke-width="3.5" />${drop(154, 66)}`,
    sleepy: `<path d="M75 94 Q82 101 89 94" fill="none" stroke-width="4.5" />
      <path d="M111 94 Q118 101 125 94" fill="none" stroke-width="4.5" />${nose}
      <ellipse cx="100" cy="121" rx="3.5" ry="4" fill="#7a2230" stroke-width="3" />${zz(150, 60, voice)}`,
  };
  return `
    <ellipse cx="78" cy="178" rx="13" ry="7" fill="#fed7aa" />
    <ellipse cx="122" cy="178" rx="13" ry="7" fill="#fed7aa" />
    <g${tf(three ? "translate(-8 0)" : "")}>
      <circle cx="62" cy="64" r="17" fill="#f2a900" />
      <circle cx="62" cy="64" r="8" fill="#f7a8a0" stroke="none" />
      <circle cx="138" cy="64" r="17" fill="#f2a900" />
      <circle cx="138" cy="64" r="8" fill="#f7a8a0" stroke="none" />
    </g>
    <ellipse cx="100" cy="118" rx="58" ry="60" fill="#f2a900" />
    <ellipse cx="100" cy="142" rx="38" ry="32" fill="#fff7e0" stroke="none" />
    <g${tf(faceT)}>
      <ellipse cx="64" cy="112" rx="19" ry="16" fill="#fff7e0" stroke-width="4" />
      <ellipse cx="136" cy="112" rx="19" ry="16" fill="#fff7e0" stroke-width="4" />
      <ellipse cx="64" cy="114" rx="9" ry="6" fill="#f7a8a0" opacity="0.8" stroke="none" />
      <ellipse cx="136" cy="114" rx="9" ry="6" fill="#f7a8a0" opacity="0.8" stroke="none" />
      ${faces[expr] ?? faces.happy}
    </g>
    ${extra === "blaster" ? "" : `<rect x="76" y="136" width="48" height="34" rx="6" fill="#fff" stroke-width="4" />
    <text x="100" y="160" text-anchor="middle" ${voice} font-weight="700" font-size="19" fill="#0d9488" stroke="none">Aa</text>
    <ellipse cx="77" cy="150" rx="9" ry="7" fill="#f2a900" stroke-width="4" />
    <ellipse cx="123" cy="150" rx="9" ry="7" fill="#f2a900" stroke-width="4" />`}
    ${extra === "schleife" ? schleifeAt(84, 58, 0.85, -14) : ""}
    ${extra === "fliege" ? fliegeAt(100, 139, 0.6) : ""}
    ${propFor("hamsti", extra)}`;
}

// "sie" and "er" accessories, placed per mascot: a pink bow on the head, an orange bow
// tie at the neck. Drawn at the origin and moved/scaled into place.
const schleifeAt = (x, y, s = 1, r = -18) => `
      <g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">
        <path d="M0 0 L-20 -12 Q-24 0 -20 12 Z" fill="#f472b6" stroke-width="4" />
        <path d="M0 0 L20 -12 Q24 0 20 12 Z" fill="#f472b6" stroke-width="4" />
        <circle cx="0" cy="0" r="6" fill="#ec4899" stroke-width="4" />
      </g>`;
const fliegeAt = (x, y, s = 1) => `
      <g transform="translate(${x} ${y}) scale(${s})">
        <path d="M0 0 L-20 -10 Q-23 0 -20 10 Z" fill="#f97316" stroke-width="4" />
        <path d="M0 0 L20 -10 Q23 0 20 10 Z" fill="#f97316" stroke-width="4" />
        <rect x="-6" y="-6" width="12" height="12" rx="3" fill="#ea580c" stroke-width="4" />
      </g>`;

// Accessories for Quaki: a bow on the left eye bump with lashes for "sie", a bow tie on
// the belly for "er". The head pieces follow the ¾ turn (faceT) like the face does.
const quakiExtras = {
  schleife: `
      <path d="M61 82 l-9 -7 M60 75 l-6 -9 M66 70 l-2 -9" fill="none" stroke-width="3" />
      <g transform="rotate(-18 58 58)">
        <path d="M58 58 L38 46 Q34 58 38 70 Z" fill="#f472b6" stroke-width="4" />
        <path d="M58 58 L78 46 Q82 58 78 70 Z" fill="#f472b6" stroke-width="4" />
        <circle cx="58" cy="58" r="6" fill="#ec4899" stroke-width="4" />
      </g>`,
  fliege: `
      <path d="M100 160 L80 150 Q77 160 80 170 Z" fill="#f97316" stroke-width="4" />
      <path d="M100 160 L120 150 Q123 160 120 170 Z" fill="#f97316" stroke-width="4" />
      <rect x="94" y="154" width="12" height="12" rx="3" fill="#ea580c" stroke-width="4" />`,
};

function quaki(expr, faceT, voice, extra) {
  const whites = `
      <circle cx="72" cy="80" r="14" fill="#fff" stroke-width="4" />
      <circle cx="128" cy="80" r="14" fill="#fff" stroke-width="4" />`;
  const pupils = (px = 0, py = 0, r = 7) => `
      <circle cx="${75 + px}" cy="${82 + py}" r="${r}" fill="#1a2230" stroke="none" />
      <circle cx="${131 + px}" cy="${82 + py}" r="${r}" fill="#1a2230" stroke="none" />
      ${r > 5 ? `<circle cx="${77 + px}" cy="${79 + py}" r="2.4" fill="#fff" stroke="none" />
      <circle cx="${133 + px}" cy="${79 + py}" r="2.4" fill="#fff" stroke="none" />` : ""}`;
  const bigMouth = `
      <path d="M66 116 Q100 152 134 116 Q100 128 66 116 Z" fill="#7a2230" stroke-width="4" />
      <ellipse cx="100" cy="130" rx="12" ry="4.5" fill="#f28b82" stroke="none" />`;
  const faces = {
    happy: `${whites}${pupils()}${bigMouth}`,
    thinking: `${whites}${pupils(2, -5, 6)}
      <path d="M58 56 L82 59" fill="none" stroke-width="3.5" />
      <path d="M116 55 Q128 47 140 55" fill="none" stroke-width="3.5" />
      <path d="M78 122 Q100 128 122 119" fill="none" stroke-width="4" />${bubbles(154, 56)}`,
    celebrate: `
      <path d="M62 84 Q72 70 82 84" fill="none" stroke-width="4.5" />
      <path d="M118 84 Q128 70 138 84" fill="none" stroke-width="4.5" />
      <path d="M62 114 Q100 162 138 114 Q100 126 62 114 Z" fill="#7a2230" stroke-width="4" />
      <ellipse cx="100" cy="134" rx="14" ry="5" fill="#f28b82" stroke="none" />${confetti()}`,
    oops: `${whites}${pupils(-3, 0, 4)}
      <path d="M58 60 L80 55" fill="none" stroke-width="3.5" />
      <path d="M120 55 L142 60" fill="none" stroke-width="3.5" />
      <path d="M78 124 q5.5 -5 11 0 q5.5 5 11 0 q5.5 -5 11 0 q5.5 5 11 0" fill="none" stroke-width="3.5" />${drop(160, 62)}`,
    sleepy: `
      <path d="M61 82 Q72 91 83 82" fill="none" stroke-width="4.5" />
      <path d="M117 82 Q128 91 139 82" fill="none" stroke-width="4.5" />
      <ellipse cx="100" cy="122" rx="4" ry="4.5" fill="#7a2230" stroke-width="3" />${zz(152, 52, voice)}`,
  };
  return `
    <ellipse cx="66" cy="172" rx="22" ry="9" fill="#0f766e" />
    <ellipse cx="134" cy="172" rx="22" ry="9" fill="#0f766e" />
    <g${tf(faceT)}>
      <circle cx="72" cy="82" r="23" fill="#14b8a6" />
      <circle cx="128" cy="82" r="23" fill="#14b8a6" />
    </g>
    <ellipse cx="100" cy="126" rx="66" ry="48" fill="#14b8a6" />
    <ellipse cx="100" cy="152" rx="40" ry="18" fill="#ccfbf1" stroke="none" />
    <g${tf(faceT)}>
      ${faces[expr] ?? faces.happy}
      <circle cx="94" cy="106" r="2" fill="#1a2230" stroke="none" />
      <circle cx="106" cy="106" r="2" fill="#1a2230" stroke="none" />
      <ellipse cx="56" cy="120" rx="9" ry="5.5" fill="#f28b82" opacity="0.65" stroke="none" />
      <ellipse cx="144" cy="120" rx="9" ry="5.5" fill="#f28b82" opacity="0.65" stroke="none" />
      ${extra === "schleife" ? quakiExtras.schleife : ""}
    </g>
    ${extra === "fliege" ? quakiExtras.fliege : ""}
    ${propFor("quaki", extra)}`;
}

/** The inner drawing only (everything inside <svg>), on the 200×200 grid. */
export function mascotBody({ name, expr = "happy", view = "front", font, extra } = {}) {
  const three = view === "three";
  const faceT = three ? (name === "bruno" ? "translate(-12 2)" : "translate(-14 2)") : "";
  // Pages resolve the token; the PDF rasteriser has no CSS, so it passes a family name.
  const voice = font
    ? `font-family="${font}"`
    : `style="font-family: var(--font-voice, 'Fredoka', sans-serif)"`;
  const body =
    name === "bruno" ? bruno(expr, three, faceT, voice, extra)
    : name === "regi" ? regi(expr, faceT, voice, extra)
    : name === "hamsti" ? hamsti(expr, three, faceT, voice, extra)
    : name === "quaki" ? quaki(expr, faceT, voice, extra)
    : "";
  return `<g stroke="#1a2230" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">${body}</g>`;
}

/** A complete inline <svg> for a page. */
export function mascotSvg({ name, expr, view, size = 200, className = "", label, extra } = {}) {
  const cls = ["mascot", className].filter(Boolean).join(" ");
  const aria = label === "" ? `aria-hidden="true"` : `role="img" aria-label="${label ?? MASCOT_LABELS[name] ?? ""}"`;
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" ${aria} class="${cls}" style="display:block;overflow:visible">${mascotBody({ name, expr, view, extra })}</svg>`;
}
