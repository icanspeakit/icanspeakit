# Builds the icanspeak! logo files (outlined SVG, no font needed to render) into ./out
# Run from this folder: python build-logo.py
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
f=TTFont("node_modules/@fontsource/fraunces/files/fraunces-latin-900-normal.woff2"  # npm i @fontsource/fraunces; pip install fonttools brotli)
gs=f.getGlyphSet(); cmap=f.getBestCmap(); hm=f["hmtx"]
XH=964
INK="#172A6E"
STRONG=["#4CD98B","#FF6F5E","#6FD6FF","#FFC21A"]   # back -> front: green, coral, sky, yellow
SOFT=["#BDEFD2","#FFC4B8","#BFE3FF","#FFE29A"]

def ishape(cx, flip=False):
    # lowercase-i: gently tapered stem (narrow top, wider foot = a nod to ¡) + round dot
    rt, rb = 128, 158          # half widths top / bottom
    top = XH                   # stem top (x-height)
    dot_r, gap = 178, 120
    dot_cy = top + gap + dot_r
    stem = f"M{cx-rt},{top-rt} A{rt},{rt} 0 0 0 {cx+rt},{top-rt} L{cx+rb},{rb} A{rb},{rb} 0 0 0 {cx-rb},{rb} Z"
    dot = f"M{cx-dot_r},{dot_cy} a{dot_r},{dot_r} 0 1 0 {2*dot_r},0 a{dot_r},{dot_r} 0 1 0 {-2*dot_r},0 Z"
    total = dot_cy + dot_r
    if flip:
        # the ! is the same i turned upside down: dot on the baseline, stem above
        return f'<g transform="rotate(180 {cx} {total/2})"><path d="{stem} {dot}"/></g>', total
    return f'<path d="{stem} {dot}"/>', total

def glyph(ch, x):
    g=cmap[ord(ch)]; sp=SVGPathPen(gs)
    tp=TransformPen(sp,(1,0,0,1,x,0)); gs[g].draw(tp)
    return sp.getCommands(), hm[g][0]

def word(text_mid="canspeak", bang=True):
    parts=[]; x=0
    s,h=ishape(x+170); parts.append(s); x+=170+158+70
    for ch in text_mid:
        d,adv=glyph(ch,x); parts.append(f'<path d="{d}"/>'); x+=adv
    if bang:
        x+=40; s,_=ishape(x+158, flip=True); parts.append(s); x+=158*2+40
    return "".join(parts), x, h

def svg(layers, top, bg=None, off=46, text_mid="canspeak", bang=True, stroke=None, pad=60, opacity=1, blend=None):
    body,w,h=word(text_mid,bang)
    n=len(layers); dx=off*n
    minx=-dx-pad; miny=-480-dx-pad   # descender of p
    W=w+dx+2*pad; H=h+480+dx+2*pad
    out=[]
    for i,c in enumerate(layers):
        k=n-i
        st=f' stroke="{stroke}" stroke-width="10" stroke-opacity="0.7"' if stroke else ""
        bl=f' style="mix-blend-mode:{blend}"' if blend else ""
        out.append(f'<g fill="{c}" fill-opacity="{opacity}"{st}{bl} transform="translate({-k*off} {-k*off})">{body}</g>')
    st=f' stroke="{stroke}" stroke-width="10"' if stroke else ""
    out.append(f'<g fill="{top}"{st}>{body}</g>')
    bgr=f'<rect x="{minx}" y="{-(miny+H)}" width="{W}" height="{H}" fill="{bg}"/>' if bg else ""
    # y-up font units -> flip
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{minx} {-(miny+H)} {W} {H}" width="{W/10:.0f}" height="{H/10:.0f}">'
            f'{bgr}<g transform="scale(1,-1)">{"".join(out)}</g></svg>'), W, H

def mark(layers, top, bg, off=60, size=1024, rx=220):
    # the i alone on a square tile
    s,h=ishape(0)
    n=len(layers); 
    out=[]
    for i,c in enumerate(layers):
        k=n-i; out.append(f'<g fill="{c}" transform="translate({-k*off} {-k*off})">{s}</g>')
    out.append(f'<g fill="{top}">{s}</g>')
    # i spans x -158..158 (+ dot 178), y 0..h ; offsets push down-left
    cx_shift = (n*off)/2; cy_mid=(h - n*off)/2
    scale = (size*0.7)/ (h + n*off)
    g=f'<g transform="translate({size/2+cx_shift*scale} {size/2 + cy_mid*scale}) scale({scale} {-scale})">{"".join(out)}</g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}"><rect width="{size}" height="{size}" rx="{rx}" fill="{bg}"/>{g}</svg>'

files={}
files["icanspeak-logo-stack.svg"]=svg(STRONG,INK)[0]                      # A primary
files["icanspeak-logo-stack-soft.svg"]=svg(SOFT,INK)[0]                   # B pastel
files["icanspeak-logo-stack-dark.svg"]=svg(STRONG,"#FFFFFF",bg=INK)[0]    # C on dark blue
files["icanspeak-logo-glass-dark.svg"]=svg(STRONG,"#F4FAFF",bg="#0B1230",opacity=0.55,off=40)[0]  # D glass
files["icanspeak-logo-flat.svg"]=svg([],INK)[0]                           # one colour
files["icanspeak-mark.svg"]=mark(STRONG,INK,"#FFFFFF")
files["icanspeak-mark-dark.svg"]=mark(STRONG,"#FFFFFF",INK)
files["icanspeak-mark-soft.svg"]=mark(SOFT,INK,"#FFF8E6")
files["icanspeak-mark-flat.svg"]=mark([],"#FFFFFF",INK)
import os
os.makedirs("out",exist_ok=True)
for k,v in files.items(): open(f"out/{k}","w").write(v)
# i-only stack: layered i and !, flat word
body_i,_,h=word("",False)
print("ok", list(files))

def svg_ionly(layers, top, bg=None, off=46, pad=60):
    parts=[]; x=0
    s,h=ishape(x+170); first=s; x+=170+158+70
    mids=[]
    for ch in "canspeak":
        d,adv=glyph(ch,x); mids.append(f'<path d="{d}"/>'); x+=adv
    x+=150; last,_=ishape(x+158, flip=True); x+=158*2+40
    n=len(layers); dx=off*n
    minx=-dx-pad; miny=-480-dx-pad; W=x+dx+2*pad; H=h+480+dx+2*pad
    out=[]
    for i,c in enumerate(layers):
        k=n-i; out.append(f'<g fill="{c}" transform="translate({-k*off} {-k*off})">{first}{last}</g>')
    out.append(f'<g fill="{top}">{first}{"".join(mids)}{last}</g>')
    bgr=f'<rect x="{minx}" y="{-(miny+H)}" width="{W}" height="{H}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{minx} {-(miny+H)} {W} {H}" width="{W/10:.0f}" height="{H/10:.0f}">'
            f'{bgr}<g transform="scale(1,-1)">{"".join(out)}</g></svg>')
open("out/icanspeak-logo-ionly.svg","w").write(svg_ionly(STRONG,INK))
open("out/icanspeak-logo-ionly-dark.svg","w").write(svg_ionly(STRONG,"#FFFFFF",bg=INK))
