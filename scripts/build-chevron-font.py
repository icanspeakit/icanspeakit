"""public/fonts/da-chevron.woff2: a font with two glyphs only, → and ← drawn as thin chevrons.

It sits first in the site's font stacks (global.css, "DA Chevron" with unicode-range), so every
arrow in running text — rule examples („du kommst → Komm!“), data, translations, buttons — shows
as a subtle chevron without touching the content. Everything else falls through to Sora etc.

    python scripts/build-chevron-font.py
"""
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

UPM = 1000
ADV = 560  # narrower than a text arrow: it separates, it should not shout
T = 64     # stroke, thinner than Sora's regular stem


def chevron(mirror=False):
    # open chevron, apex right, centred on the x-height middle
    x0, x1, top, mid, bot = 175, 385, 470, 290, 110
    pts = [(x0, top), (x0 + T, top), (x1 + T / 2, mid), (x0 + T, bot), (x0, bot), (x1 - T / 2, mid)]
    if mirror:
        pts = [(ADV - x, y) for x, y in reversed(pts)]
    pen = TTGlyphPen(None)
    pen.moveTo(pts[0])
    for p in pts[1:]:
        pen.lineTo(p)
    pen.closePath()
    return pen.glyph()


def empty():
    return TTGlyphPen(None).glyph()


fb = FontBuilder(UPM, isTTF=True)
order = [".notdef", "chevright", "chevleft"]
fb.setupGlyphOrder(order)
fb.setupCharacterMap({0x2192: "chevright", 0x2190: "chevleft"})
fb.setupGlyf({".notdef": empty(), "chevright": chevron(), "chevleft": chevron(mirror=True)})
fb.setupHorizontalMetrics({g: (ADV, 0) for g in order})
fb.setupHorizontalHeader(ascent=900, descent=-250)
fb.setupNameTable({"familyName": "DA Chevron", "styleName": "Regular"})
fb.setupOS2(sTypoAscender=900, sTypoDescender=-250, usWinAscent=900, usWinDescent=250)
fb.setupPost()
fb.font.flavor = "woff2"
fb.save("public/fonts/da-chevron.woff2")
print("public/fonts/da-chevron.woff2")
