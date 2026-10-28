// Every noun of the lexicon in all four cases, singular and plural — the tables behind
// /grammatik/deklination ("der Kuchen, den Kuchen, dem Kuchen, des Kuchens").
//
// The lexicon stores only article and plural, so the case forms are worked out here. The
// rules, and why each exception list exists:
//   - n-Deklination (der Kollege → den Kollegen): masculine on -e with plural -n, and
//     masculine on -ist/-ent/-ant/-and/-at/-oge/-nom/-graf with plural -en, plus the short
//     ones in N_DEKL. Not der See (Seen, but des Sees) or der Staat (Staaten, des Staates).
//   - The abstract -e nouns (der Name, der Gedanke) are n-Deklination with -ns in the Genitiv.
//   - das Herz is the one neuter: das Herz, das Herz, dem Herzen, des Herzens.
//   - Genitiv -es after s, ß, x, z, sch and on one-syllable words (des Tages, des Hauses),
//     -nisses (des Ergebnisses), nothing on Latin -us/-os (des Virus), -s otherwise.
//   - Dativ plural +n, unless the plural already ends in -n or -s (den Kindern, den Autos).
// Every form that differs from the Nominativ is returned with its ending marked, so the page
// can show what changes.
// No lexicon import: the page runs this file in the browser too, on the list it ships.

export const CASES = [
  { id: "nom", name: "Nominativ", q: "Wer? Was?", frame: "Das ist" },
  { id: "akk", name: "Akkusativ", q: "Wen? Was?", frame: "Ich sehe" },
  { id: "dat", name: "Dativ", q: "Wem?", frame: "mit" },
  { id: "gen", name: "Genitiv", q: "Wessen?", frame: "wegen" },
];

const DEF = {
  der: ["der", "den", "dem", "des"],
  die: ["die", "die", "der", "der"],
  das: ["das", "das", "dem", "des"],
  pl: ["die", "die", "den", "der"],
};
const INDEF = {
  der: ["ein", "einen", "einem", "eines"],
  die: ["eine", "eine", "einer", "einer"],
  das: ["ein", "ein", "einem", "eines"],
  pl: ["keine", "keine", "keinen", "keiner"],
};

const N_DEKL = new Set(["Herr", "Bauherr", "Mensch", "Nachbar", "Bauer", "Held", "Bär", "Prinz", "Fürst", "Graf", "Narr", "Kamerad"]);
const N_DEKL_NOT = /(staat|see)$/i;
const N_DEKL_SUFFIX = /(ist|ent|ant|and|at|oge|nom|graf|soph)$/;
const NS = /(name|gedanke|buchstabe|glaube|friede|wille|same|funke)$/i;

const syllables = (w) => (w.toLowerCase().match(/(au|ei|eu|äu|ie|aa|ee|oo|[aeiouyäöü])+/g) ?? []).length;

function weak(n) {
  if (n.gender !== "der" || !n.plural || N_DEKL_NOT.test(n.lemma)) return false;
  // der Herr, and compounds on one of these: der Bauherr, der Eisbär, der Mitmensch.
  if ([...N_DEKL].some((w) => n.lemma === w || n.lemma.endsWith(w.toLowerCase()))) return true;
  if (/e$/.test(n.lemma)) return n.plural === `${n.lemma}n`;
  return N_DEKL_SUFFIX.test(n.lemma) && n.plural === `${n.lemma}en`;
}

// [stem, ending] pairs: the ending is what the page highlights.
function genitiveStrong(w) {
  const l = w.toLowerCase();
  if (/(nis|bus)$/.test(l)) return [w, "ses"];
  if (/(us|os)$/.test(l) && !/haus$/.test(l) && syllables(w) > 1) return [w, ""];
  if (/(s|ß|x|z|sch)$/.test(l)) return [w, "es"];
  // des Tages, des Buches — but des Schuhs, des Tees.
  if (syllables(w) === 1 && !/[aeiouäöüy]h?$/.test(l)) return [w, "es"];
  return [w, "s"];
}

function singular(n) {
  const w = n.lemma;
  if (n.gender === "die") return [[w, ""], [w, ""], [w, ""], [w, ""]];
  if (n.gender === "das" && w === "Herz") return [[w, ""], [w, ""], [w, "en"], [w, "ens"]];
  if (weak(n)) {
    // den Kollegen, den Nachbarn (plural -n) — and den Herrn, although the plural is Herren.
    const e = /herr$/i.test(w) || n.plural === `${w}n` ? "n" : "en";
    return [[w, ""], [w, e], [w, e], [w, NS.test(w) ? `${e}s` : e]];
  }
  return [[w, ""], [w, ""], [w, ""], genitiveStrong(w)];
}

function plural(p) {
  return [[p, ""], [p, ""], /[ns]$/.test(p) ? [p, ""] : [p, "n"], [p, ""]];
}

const join = ([stem, end]) => stem + end;

// `n` is a lexicon noun, or anything with lemma, gender ("der" | "die" | "das" | null for a
// plural-only word like Eltern) and plural (null when there is none).
export function decline(n) {
  const sg = n.gender ? singular(n) : null;
  const pl = n.plural ? plural(n.plural) : null;
  return {
    lemma: n.lemma,
    gender: n.gender ?? null,
    plural: n.plural ?? null,
    weak: weak(n) || n.lemma === "Herz",
    rows: CASES.map((c, i) => ({
      ...c,
      sg: sg && { def: DEF[n.gender][i], indef: INDEF[n.gender][i], stem: sg[i][0], end: sg[i][1], form: join(sg[i]) },
      pl: pl && { def: DEF.pl[i], indef: INDEF.pl[i], stem: pl[i][0], end: pl[i][1], form: join(pl[i]) },
    })),
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const cell = (f) => f
  ? `<b class="dk-art">${f.def}</b> ${esc(f.stem)}${f.end ? `<mark class="dk-end">${f.end}</mark>` : ""}<small>${f.indef} ${esc(f.form)}</small>`
  : `<span class="dk-none">–</span>`;

// The table as HTML, for the page's first render and for the browser alike.
export function tableHtml(d) {
  const head = d.gender ? `${d.gender} ${d.lemma}` : `die ${d.plural ?? d.lemma}`;
  const sub = d.gender ? (d.plural ? `Plural: die ${d.plural}` : "kein Plural") : "nur im Plural";
  return `<div class="dk-card" lang="de">
  <div class="dk-card-head"><h2>${esc(head)}</h2><span>${esc(sub)}</span>${d.weak ? `<a class="dk-weak" href="/n-deklination">n-Deklination</a>` : ""}</div>
  <table class="dk-table">
    <thead><tr><th scope="col">Fall</th>${d.gender ? `<th scope="col">Singular</th>` : ""}${d.plural ? `<th scope="col">Plural</th>` : ""}</tr></thead>
    <tbody>${d.rows.map((r) => `<tr><th scope="row">${r.name}<small>${r.q}</small></th>${d.gender ? `<td>${cell(r.sg)}</td>` : ""}${d.plural ? `<td>${cell(r.pl)}</td>` : ""}</tr>`).join("")}</tbody>
  </table>
  <ul class="dk-frames">${d.rows.map((r) => {
    const f = r.sg ?? r.pl;
    // "Das sind die Eltern", not "Das ist": the frame follows a plural-only noun.
    const frame = r.id === "nom" && !r.sg ? "Das sind" : r.frame;
    return `<li><span>${r.name}</span> ${frame} <b>${f.def} ${esc(f.form)}</b></li>`;
  }).join("")}</ul>
</div>`;
}
