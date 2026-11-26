"""받은 투사체 원본(궁수 화살, 투척병 병)을 작은 도트 아트(rows+palette)로 바꿔 shared/pixelProjectiles.js 에 넣는다.
사용: python3 tools/proj_art.py archer_arrow <png> x0 x1 y0 y1 <도트 폭> | thrower_bottle ...  (여러 번 실행해도 같은 키는 덮어씀)
"""
import re, sys
from pathlib import Path
import numpy as np
from PIL import Image

JS = Path(__file__).parent.parent / "shared/pixelProjectiles.js"
CH = "0123456789abcdef"


def convert(png, box, wdots):
    im = Image.open(png).convert("RGBA").crop(box)
    ys, xs = np.where(np.array(im)[..., 3] > 40); im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    h = max(1, round(im.height * wdots / im.width)); sm = np.array(im.resize((wdots, h), Image.BOX))
    al = sm[..., 3] > 110
    q = Image.fromarray(sm[..., :3]).quantize(colors=7, method=Image.MEDIANCUT); pal = np.array(q.getpalette()[:21]).reshape(-1, 3); idx = np.array(q)
    order = np.argsort(pal.sum(axis=1))  # 어두운 색부터 0,1,2...
    rank = {int(c): i for i, c in enumerate(order)}
    rows = ["".join(CH[rank[int(idx[y, x])]] if al[y, x] else "." for x in range(wdots)) for y in range(h)]
    used = sorted({c for r in rows for c in r if c != "."})
    palette = {c: "#%02x%02x%02x" % tuple(int(v) for v in pal[order[CH.index(c)]]) for c in used}
    return rows, palette


def main(key, png, x0, x1, y0, y1, wdots):
    rows, palette = convert(png, (int(x0), int(y0), int(x1), int(y1)), int(wdots))
    pal = ", ".join(f"{c}: '{v}'" for c, v in palette.items())
    entry = f"  {key}: {{ // 받은 도트 그림을 줄인 것\n    palette: {{ {pal} }},\n    rows: [{', '.join(repr(r) for r in rows)}],\n  }},\n"
    s = JS.read_text()
    s = re.sub(rf"  {key}: \{{ // 받은 도트 그림을 줄인 것\n.*?\n  \}},\n", "", s, flags=re.S)
    s = s.rstrip()
    assert s.endswith("};"); s = s[:-2] + entry + "};\n"
    JS.write_text(s); print(key, len(rows), "x", wdots)


if __name__ == "__main__":
    main(*sys.argv[1:])
