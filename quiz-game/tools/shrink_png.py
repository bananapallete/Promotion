"""public/characters 의 PNG를 256색 팔레트로 줄인다 (데모 단일 HTML 16MB 제한용): python3 -I tools/shrink_png.py public/characters"""
import sys
from pathlib import Path
from PIL import Image

for p in sorted(Path(sys.argv[1]).glob("*/*.png")):
    im = Image.open(p).convert("RGBA")
    q = im.quantize(256, method=Image.FASTOCTREE, dither=Image.NONE)
    q.save(p, optimize=True)
