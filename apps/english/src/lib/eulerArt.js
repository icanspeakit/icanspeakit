// Euler diagrams for verb pairs with and without a prefix (concept.pictures "euler",
// topic nutzen-benutzen): how the meanings of the two verbs relate as sets. benutzen lies
// inside nutzen (Teilmenge), kaufen and einkaufen share a part (Schnittmenge), kommen and
// bekommen have nothing in common (getrennt). Plain SVG strings like verbPairsArt.js, but
// coloured through classes (src/styles/verben-praepositionen.css, .eu-*), so they follow
// the light and dark theme on the page.

/** The three panels: kind, the two verbs (outer/left first), the words in each region, the caption. */
export const EULER_PANELS = [
  {
    kind: "teilmenge",
    a: "nutzen",
    b: "benutzen",
    onlyA: ["die Chance", "die Zeit", "Das nutzt nichts."],
    both: ["das Handy", "den Bus"],
    title: "Teilmenge",
    caption: "Was man benutzt, kann man auch nutzen. Eine Chance oder die Zeit nutzt man nur.",
  },
  {
    kind: "schnittmenge",
    a: "kaufen",
    b: "einkaufen",
    onlyA: ["ein Haus", "ein Ticket"],
    both: ["Brot", "Obst"],
    onlyB: ["Ich gehe", "einkaufen."],
    title: "Schnittmenge",
    caption: "Brot kann man kaufen und einkaufen. Ein Haus kauft man nur. „Ich gehe einkaufen“ geht nur mit ein-.",
  },
  {
    kind: "getrennt",
    a: "kommen",
    b: "bekommen",
    onlyA: ["nach Hause", "zu spät"],
    onlyB: ["einen Brief", "Hunger"],
    title: "getrennt",
    caption: "Zwei ganz verschiedene Wörter: kommen = an einen Ort, bekommen = etwas erhalten. bekommen ist nicht „become“!",
  },
];

const FONT = `font-family="Fredoka, 'Noto Sans', Arial, sans-serif"`;

const words = (list, x, y, step = 19) =>
  list.map((w, i) => `<text class="eu-word" x="${x}" y="${y + i * step}" text-anchor="middle" ${FONT} font-size="14">${w}</text>`).join("");
const label = (text, x, y, cls) =>
  `<text class="eu-label ${cls}" x="${x}" y="${y}" text-anchor="middle" ${FONT} font-size="18" font-weight="700">${text}</text>`;

function shapes(p) {
  if (p.kind === "teilmenge") {
    return `<ellipse class="eu-set eu-set--a" cx="150" cy="112" rx="138" ry="84"/>`
      + `<circle class="eu-set eu-set--b" cx="196" cy="118" r="56"/>`
      + label(p.a, 82, 62, "eu-label--a")
      + label(p.b, 196, 100, "eu-label--b")
      + words(p.both, 196, 124)
      + words(p.onlyA, 82, 96, 22);
  }
  if (p.kind === "schnittmenge") {
    return `<circle class="eu-set eu-set--a" cx="108" cy="118" r="76"/>`
      + `<circle class="eu-set eu-set--b" cx="192" cy="118" r="76"/>`
      + label(p.a, 84, 30, "eu-label--a")
      + label(p.b, 216, 30, "eu-label--b")
      + words(p.onlyA, 72, 112)
      + words(p.both, 150, 112)
      + words(p.onlyB, 228, 112);
  }
  return `<circle class="eu-set eu-set--a" cx="76" cy="118" r="60"/>`
    + `<circle class="eu-set eu-set--b" cx="224" cy="118" r="60"/>`
    + label(p.a, 76, 42, "eu-label--a")
    + label(p.b, 224, 42, "eu-label--b")
    + words(p.onlyA, 76, 114)
    + words(p.onlyB, 224, 114)
    + `<text class="eu-neq" x="150" y="128" text-anchor="middle" ${FONT} font-size="30" font-weight="700">≠</text>`;
}

/** One panel as an SVG string. */
export function eulerPanelSvg(p) {
  const aria = p.kind === "teilmenge"
    ? `${p.b} liegt ganz in ${p.a}`
    : p.kind === "schnittmenge" ? `${p.a} und ${p.b} überschneiden sich` : `${p.a} und ${p.b} sind getrennt`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 204" role="img" aria-label="${p.title}: ${aria}">${shapes(p)}</svg>`;
}

/** A small word-free icon of one kind, for the answer buttons of the "Wie im Bild?" table
 *  (exercise `choiceArt: "euler"`): the same shapes and colours as the big panels. */
export function eulerIconSvg(kind) {
  const k = String(kind).toLowerCase();
  const body = k === "teilmenge"
    ? `<ellipse class="eu-set eu-set--a" cx="60" cy="36" rx="54" ry="31"/><circle class="eu-set eu-set--b" cx="76" cy="40" r="18"/>`
    : k === "schnittmenge"
      ? `<circle class="eu-set eu-set--a" cx="45" cy="36" r="29"/><circle class="eu-set eu-set--b" cx="75" cy="36" r="29"/>`
      : `<circle class="eu-set eu-set--a" cx="27" cy="36" r="22"/><circle class="eu-set eu-set--b" cx="93" cy="36" r="22"/>`
        + `<text class="eu-neq" x="60" y="45" text-anchor="middle" ${FONT} font-size="26" font-weight="700">≠</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 72" aria-hidden="true" focusable="false">${body}</svg>`;
}
