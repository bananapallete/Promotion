"""채널링 궁극기용 'ult' 시트: 기존 대기 프레임에서 만든다.
- spin(흑발 소녀·강아지): 대기 첫 프레임을 세로축으로 도는 것처럼 가로로 좁혔다 뒤집으며 8프레임
- flame(시바견): 대기 4프레임 위에 꼬리 끝에서 타오르는 도트 불꽃을 얹음
사용: python3 -I tools/make_ult_sheets.py && python3 -I tools/unify_outline.py && python3 -I tools/shrink_png.py public/characters
"""
import json, math
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).parent.parent
CELL, AX, DOT = 256, 104, 7
INK = (20, 18, 43)
FIRE = [(122, 42, 26), (224, 80, 42), (255, 154, 60), (255, 226, 122), (255, 255, 255)]


def cells(ch, m):
    a = Image.open(ROOT / f"public/characters/{ch}/{m}.png").convert("RGBA")
    return [a.crop((i * CELL, 0, (i + 1) * CELL, CELL)) for i in range(a.width // CELL)]


def spin(ch, n=8):
    base = cells(ch, "idle")[0]
    out = []
    for k in range(n):
        th = 2 * math.pi * k / n
        c = math.cos(th); f = max(0.28, abs(c))
        im = base.transpose(Image.FLIP_LEFT_RIGHT) if c < 0 else base
        ax = (CELL - 1 - AX) if c < 0 else AX  # 뒤집으면 기준점도 반대편
        w = max(1, round(CELL * f)); sm = im.resize((w, CELL), Image.NEAREST)
        cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        cell.paste(sm, (AX - round(ax * f), -2 if k % 2 else 0), sm)  # 위아래로 살짝 튐
        out.append(cell)
    return out


def flame(g, dots_w, dots_h, f):
    """도트 불꽃 (dots_w x dots_h). 반환: 도트 좌표 → 색 사전"""
    px = {}
    for y in range(dots_h):
        k = 1 - y / (dots_h - 1)
        hw = math.sin(math.pi * k ** 0.75) * dots_w / 2 * (1 + 0.18 * math.sin(f * 1.9 + y * 0.7))
        off = math.sin(f * 1.3 + y * 0.4) * 0.8 * (1 - k)
        for x in range(dots_w):
            dx = x + 0.5 - dots_w / 2 - off
            if abs(dx) > hw: continue
            core = 1 - abs(dx) / max(0.1, hw); v = core * 0.6 + (1 - k) * 0.55 - 0.1
            px[(x, y)] = FIRE[max(0, min(4, int(v * 5.2)))]
    return px


def shiba_flame(n=4):
    base = cells("shiba", "idle")
    out = []
    for f, im in enumerate(base[:n]):
        a = np.array(im)
        al = a[..., 3] > 128; ys, xs = np.where(al)
        left = xs.min(); sel = xs < left + (xs.max() - left) * 0.3
        ty = ys[sel].min(); tx = int(xs[sel & (ys == ty)].mean())     # 꼬리 끝 (왼쪽 위)
        img = im.copy(); px = flame(None, 7, 12, f)
        x0, y0 = tx - 7 * DOT // 2, ty - 10 * DOT          # 꼬리 끝 위로 불꽃이 솟음
        dots = {}
        for (x, y), c in px.items(): dots[(x, y)] = c
        for (x, y), c in dots.items():
            for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                if (x + ox, y + oy) not in dots:
                    for yy in range(DOT):
                        for xx in range(DOT):
                            X, Y = x0 + (x + ox) * DOT + xx, y0 + (y + oy) * DOT + yy
                            if 0 <= X < CELL and 0 <= Y < CELL and img.getpixel((X, Y))[3] == 0: img.putpixel((X, Y), INK + (255,))
        for (x, y), c in dots.items():
            for yy in range(DOT):
                for xx in range(DOT):
                    X, Y = x0 + x * DOT + xx, y0 + y * DOT + yy
                    if 0 <= X < CELL and 0 <= Y < CELL: img.putpixel((X, Y), c + (255,))
        out.append(img)
    return out


def save(ch, frames):
    sheet = Image.new("RGBA", (CELL * len(frames), CELL), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.paste(f, (i * CELL, 0))
    sheet.save(ROOT / f"public/characters/{ch}/ult.png")
    jp = ROOT / "shared/sprites.json"; d = json.loads(jp.read_text()); d[ch]["ult"] = len(frames)
    jp.write_text(json.dumps(d, indent=1) + "\n")
    print(ch, "ult", len(frames))


if __name__ == "__main__":
    save("girl_long", spin("girl_long")); save("puppy", spin("puppy")); save("shiba", shiba_flame())
