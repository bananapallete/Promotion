"""레이디 가가 임시 스프라이트(진짜 그림이 오기 전까지): 공주 시트에서 분홍 옷을 보라·검정 무대의상 색으로 바꾸고, 춤추는 ult 시트(대기 자세를 좌우로 돌리며 들썩임)를 만든다.
그림이 오면 public/characters/gaga/ 를 tools/build_chars.py 결과로 덮어쓰고 shared/sprites.json 의 gaga 줄만 맞추면 된다.
사용: python3 tools/make_gaga.py
"""
import colorsys, json, math
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).parent.parent
SRC, DST, CELL, AX = ROOT / "public/characters/princess", ROOT / "public/characters/gaga", 256, 104


def recolor(im):
    a = np.array(im.convert("RGBA")); out = a.copy()
    for y, x in zip(*np.where(a[..., 3] > 0)):
        r, g, b = (int(v) / 255 for v in a[y, x, :3]); h, s, v = colorsys.rgb_to_hsv(r, g, b)
        if s > 0.28 and (h > 0.88 or h < 0.04) and v > 0.35:  # 분홍·빨강 옷 → 보라 무대의상 (밝기는 낮춰 대비)
            r2, g2, b2 = colorsys.hsv_to_rgb(0.76, min(1, s * 1.1), v * 0.8); out[y, x, :3] = [int(r2 * 255), int(g2 * 255), int(b2 * 255)]
    return Image.fromarray(out)


def sheet(m):
    return Image.open(SRC / f"{m}.png").convert("RGBA")


def dance(base, n=8):
    out = []
    for k in range(n):
        th = 2 * math.pi * k / n; c = math.cos(th); f = max(0.35, abs(c))
        im = base.transpose(Image.FLIP_LEFT_RIGHT) if c < 0 else base; ax = (CELL - 1 - AX) if c < 0 else AX
        w = max(1, round(CELL * f)); sm = im.resize((w, CELL), Image.NEAREST); cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        cell.paste(sm, (AX - round(ax * f), -6 if k % 2 else 0), sm); out.append(cell)  # 위아래로 들썩
    return out


def main():
    DST.mkdir(parents=True, exist_ok=True); sp = json.loads((ROOT / "shared/sprites.json").read_text()); counts = {}
    for m in ("idle", "walk", "run", "combo", "die"):
        s = recolor(sheet(m)); s.save(DST / f"{m}.png"); counts[m] = s.width // CELL
    base = Image.open(DST / "idle.png").crop((0, 0, CELL, CELL)); fr = dance(base)
    ult = Image.new("RGBA", (CELL * len(fr), CELL), (0, 0, 0, 0))
    for i, f in enumerate(fr): ult.paste(f, (i * CELL, 0))
    ult.save(DST / "ult.png"); counts["ult"] = len(fr); sp["gaga"] = counts
    (ROOT / "shared/sprites.json").write_text(json.dumps(sp, indent=1) + "\n"); print("gaga", counts)


main()
