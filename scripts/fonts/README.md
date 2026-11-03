# PDF fonts

Noto Sans (Latin + Cyrillic, which covers Turkish ğ ş ı İ and Russian) and Noto Sans Arabic,
from https://github.com/notofonts. Both are under the SIL Open Font License 1.1, which allows
embedding them in the PDFs we hand out.

`NotoSansDA-Regular.ttf` / `NotoSansDA-Bold.ttf` are Noto Sans with the arrows and signs the
grammar explanations use (→ ← ↔ ⇒ ≠ ≈ ✓ ▶ ≤ ≥ ↑ ↓) merged in from Noto Sans Math (also OFL).
Plain Noto Sans has none of them, and "du kommst → Komm!" printed as "du kommst > Komm!".
Rebuild them with `python scripts/fonts/merge-arrows.py` (needs fontTools and
NotoSansMath-Regular.ttf from google/fonts, ofl/notosansmath, next to the script).

`createDoc({ unicode: true })` in `scripts/lib/pdf-brand.mjs` embeds them. All Grammatik
books use it; the other German-only PDFs keep pdfkit's built-in Helvetica.

`Fredoka-SemiBold.ttf` is the site's Fredoka (`public/fonts/fredoka-latin.woff2`, OFL) fixed at
weight 600 and saved as TTF, for the mascots' speech bubbles in the Grammatik-Start book:
pdfkit cannot subset the variable WOFF2. Rebuild with fontTools (`pip install fonttools brotli`):
`instancer.instantiateVariableFont(TTFont("public/fonts/fredoka-latin.woff2"), {"wght": 600})`.
It is Latin only; bubbles in other scripts fall back to Noto.

`NotoSansDevanagariDA-Regular.ttf` / `-Bold.ttf` are for the Hindi editions: the site's
self-hosted Noto Sans Devanagari (`public/fonts/scripts/noto-sans-devanagari.woff2`, Fontsource,
OFL) fixed at weight 400 / 700, with Basic Latin, Latin-1, Latin Extended-A, „ “ – — … € and
→ ← ↔ from NotoSansDA merged in, so German and Hindi share one face and fontkit shapes the
conjuncts. `createDoc({ unicode: true, script: "Deva" })` uses them. Rebuild with fontTools:
`instancer.instantiateVariableFont(TTFont(woff2), {"wght": 400})`, subset NotoSansDA-Regular.ttf to
those ranges, then `fontTools.merge.Merger().merge([deva.ttf, latin.ttf])`.
Vietnamese needs nothing extra: NotoSansDA covers its stacked diacritics (ệ ữ ở ặ ẫ).
