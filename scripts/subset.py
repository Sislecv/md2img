#!/usr/bin/env python3
"""Subset CJK/Latin fonts to GB2312 + ASCII + common punctuation, output WOFF (satori-compatible)."""
import sys, os
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer

SRC = os.path.join(os.path.dirname(__file__), "fonts-src")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "fonts")
os.makedirs(OUT, exist_ok=True)

# --- character set: GB2312 full + ASCII + common punct/symbols ---
def gb2312_chars():
    chars = set()
    for hi in range(0xA1, 0xF8):
        for lo in range(0xA1, 0xFF):
            try:
                b = bytes([hi, lo])
                c = b.decode("gb2312")
                chars.add(c)
            except Exception:
                pass
    return chars

CHARS = gb2312_chars()
# ASCII printable
CHARS |= set(chr(i) for i in range(0x20, 0x7F))
# extra: curly quotes, ellipsis, dash, bullets, arrows, box-drawing minimal, latin-1
CHARS |= set("“”‘’…—–·•→←↑↓■□◆◇●○★☆℃§№① ②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳")
CHARS |= set(chr(i) for i in range(0xA0, 0x100))  # latin-1 supplement
CHARS |= set(chr(i) for i in range(0x2000, 0x2070))  # general punct
CHARS |= set(chr(i) for i in range(0x20A0, 0x20C0))  # currency
CHARS |= set(chr(i) for i in range(0x2500, 0x2580))  # box drawing
CHARS |= set(chr(i) for i in range(0x3000, 0x3040))  # CJK punct
CHARS |= set(chr(i) for i in range(0xFE30, 0xFE50))  # CJK compat forms
CHARS.add("\u00b7\u2019\u2032\u2033")  # extras

CHARSET = "".join(sorted(CHARS))
with open(os.path.join(SRC, "charset.txt"), "w", encoding="utf-8") as f:
    f.write(CHARSET)

def subset_font(src_path, out_name, flavor="woff", extra_chars=""):
    opts = subset.Options()
    opts.flavor = flavor
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.name_legacy = True
    opts.name_languages = ["*"]
    opts.recalc_bounds = True
    opts.drop_tables += ["FFTM", "GDEF", "GPOS", "GSUB"]  # satori ignores OT features; drop to slim
    charset = CHARSET + extra_chars
    font = TTFont(src_path)
    ss = subset.Subsetter(options=opts)
    ss.populate(text=charset)
    ss.subset(font)
    out_path = os.path.join(OUT, out_name)
    font.save(out_path)
    size = os.path.getsize(out_path)
    print(f"  {out_name}: {size/1024:.0f}KB ({font['maxp'].numGlyphs} glyphs)")
    return out_path

def instantiate(src_path, out_path, weight):
    """Instantiate variable font to static weight (satori rejects variable fonts)."""
    font = TTFont(src_path)
    instancer.instantiateVariableFont(font, {"wght": weight}, inplace=True)
    font.save(out_path)
    return out_path

JOBS = [
    # (source, output, extra charset)
    ("NotoSansCJKsc-Regular.otf", "NotoSansSC-Regular.woff", ""),
    ("NotoSansCJKsc-Bold.otf", "NotoSansSC-Bold.woff", ""),
    ("NotoSerifCJKsc-Regular.otf", "NotoSerifSC-Regular.woff", ""),
    ("NotoSerifCJKsc-Bold.otf", "NotoSerifSC-Bold.woff", ""),
    ("LXGWWenKai-Regular.ttf", "LXGWWenKai-Regular.woff", ""),
    ("smiley/SmileySans-Oblique.ttf", "SmileySans-Oblique.woff", ""),
    ("jbm/fonts/ttf/JetBrainsMono-Regular.ttf", "JetBrainsMono-Regular.woff", ""),
    ("jbm/fonts/ttf/JetBrainsMono-Bold.ttf", "JetBrainsMono-Bold.woff", ""),
    ("inter/extras/ttf/Inter-Regular.ttf", "Inter-Regular.woff", ""),
    ("inter/extras/ttf/Inter-SemiBold.ttf", "Inter-SemiBold.woff", ""),
    ("inter/extras/ttf/Inter-Bold.ttf", "Inter-Bold.woff", ""),
    ("inter/extras/ttf/InterDisplay-SemiBold.ttf", "InterDisplay-SemiBold.woff", ""),
]

print("== instantiating Playfair variable font ==")
os.makedirs(os.path.join(SRC, "playfair"), exist_ok=True)
for w in (400, 600, 700):
    static = os.path.join(SRC, "playfair", f"PlayfairDisplay-{w}.ttf")
    instantiate(os.path.join(SRC, "PlayfairDisplay.ttf"), static, w)
    subset_font(static, f"PlayfairDisplay-{w}.woff")

print("== subsetting static fonts ==")
for src, out, extra in JOBS:
    subset_font(os.path.join(SRC, src), out, extra)

print("\nDone ->", OUT)
