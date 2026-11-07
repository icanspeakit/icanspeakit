# Adds the arrows and signs Noto Sans lacks to it, from Noto Sans Math. See README.md.
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.merge import Merger
import sys
CPS = [0x2192,0x2190,0x2194,0x21D2,0x2260,0x2248,0x2713,0x25B6,0x2212,0x2264,0x2265,0x2191,0x2193]
opts = subset.Options(); opts.layout_features = []; opts.drop_tables += ['MATH','GSUB','GPOS','GDEF']; opts.notdef_outline=True
import os
here = os.path.dirname(os.path.abspath(__file__))
m = TTFont(os.path.join(here, 'NotoSansMath-Regular.ttf')); s = subset.Subsetter(opts); s.populate(unicodes=CPS); s.subset(m)
sub = os.path.join(here, 'math-sub.ttf'); m.save(sub)
root = here + '/'
for w in ['Regular','Bold']:
    base = TTFont(root+f'NotoSans-{w}.ttf')
    merged = Merger(options=subset.Options()).merge([root+f'NotoSans-{w}.ttf', sub])
    merged.save(root+f'NotoSansDA-{w}.ttf')
    c = merged.getBestCmap(); print(w, all(x in c for x in CPS), 'A' in [chr(k) for k in c])
os.remove(sub)
