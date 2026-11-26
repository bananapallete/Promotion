"""병아리 궁극기용 도트: 피닉스(닭 시트를 불꽃 색으로 칠하고 꼬리·볏에 불꽃을 얹음)와 알(껍질 도트를 직접 그림).
사용: python3 -I tools/make_phoenix_egg.py && python3 -I tools/shrink_png.py public/characters
"""
import json, math
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).parent.parent
CELL, AX, AY, DOT = 256, 104, 232, 7
INK = (20, 18, 43)
FIRE = [(122, 42, 26), (224, 80, 42), (255, 154, 60), (255, 226, 122), (255, 255, 255)]
RAMP = [(110, 34, 28), (190, 52, 34), (235, 96, 38), (255, 160, 58), (255, 214, 96)]  # 어두움 → 밝음
FRAMES = {"idle": 4, "walk": 8, "run": 8, "combo": 6, "die": 6}


def cells(ch, m):
    a = Image.open(ROOT / f"public/characters/{ch}/{m}.png").convert("RGBA")
    return [a.crop((i * CELL, 0, (i + 1) * CELL, CELL)) for i in range(a.width // CELL)]


def put_dot(img, x0, y0, x, y, c):
    for yy in range(DOT):
        for xx in range(DOT):
            X, Y = x0 + x * DOT + xx, y0 + y * DOT + yy
            if 0 <= X < CELL and 0 <= Y < CELL: img.putpixel((X, Y), c + (255,))


def flame(w, h, f):
    px = {}
    for y in range(h):
        k = 1 - y / (h - 1)
        hw = math.sin(math.pi * k ** 0.75) * w / 2 * (1 + 0.18 * math.sin(f * 1.9 + y * 0.7))
        off = math.sin(f * 1.3 + y * 0.4) * 0.8 * (1 - k)
        for x in range(w):
            dx = x + 0.5 - w / 2 - off
            if abs(dx) > hw: continue
            core = 1 - abs(dx) / max(0.1, hw); v = core * 0.6 + (1 - k) * 0.55 - 0.1
            px[(x, y)] = FIRE[max(0, min(4, int(v * 5.2)))]
    return px


def draw_flame(img, cx, cy, w, h, f):
    """(cx, cy) = 불꽃 밑동 중앙. 남색 테두리 한 점을 두르고 안쪽을 칠한다"""
    px = flame(w, h, f); x0, y0 = cx - w * DOT // 2, cy - h * DOT
    for (x, y) in px:
        for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            if (x + ox, y + oy) not in px and img.getpixel((min(CELL - 1, max(0, x0 + (x + ox) * DOT)), min(CELL - 1, max(0, y0 + (y + oy) * DOT))))[3] == 0:
                put_dot(img, x0, y0, x + ox, y + oy, INK)
    for (x, y), c in px.items(): put_dot(img, x0, y0, x, y, c)


def phoenix_cell(im, f, flames):
    a = np.array(im); out = a.copy()
    al = a[..., 3] > 128
    for y, x in zip(*np.where(al)):
        r, g, b = (int(v) for v in a[y, x, :3])
        if (r, g, b) == INK or max(r, g, b) < 60: continue
        if r > 150 and g < 100 and b < 100: c = RAMP[4]  # 볏·부리 쪽 붉은 곳은 가장 밝게
        else:
            lum = 0.3 * r + 0.59 * g + 0.11 * b; t = max(0.0, min(1.0, (lum - 50) / 120)); c = RAMP[min(3, int(t * 4))]
        out[y, x, :3] = c
    img = Image.fromarray(out)
    if flames:
        ys, xs = np.where(al); lo, hi = xs.min(), xs.max()
        sel = xs < lo + (hi - lo) * 0.3; ty = ys[sel].min(); tx = int(xs[sel & (ys == ty)].mean())      # 꼬리 끝(왼쪽 위)
        draw_flame(img, tx, ty + DOT, 5, 9, f)
        sel = xs > hi - (hi - lo) * 0.3; hy = ys[sel].min(); hx = int(xs[sel & (ys == hy)].mean())      # 머리 위
        draw_flame(img, hx, hy + DOT, 3, 5, f + 2)
    return img


def phoenix():
    for m, n in FRAMES.items():
        src = cells("chicken", m)
        frames = [phoenix_cell(src[i % len(src)], i, m != "die") for i in range(n)]
        save("phoenix", m, frames)


# ---------- 알 ----------
SHELL = [(255, 250, 232), (240, 220, 180), (214, 184, 140)]  # 밝음/중간/그늘
EGG = [  # 7칸 폭, 9칸 높이. 0 비움 1 껍질
    "..111..", ".11111.", ".11111.", "1111111", "1111111", "1111111", "1111111", ".11111.", "..111..",
]
CRACK = [(3, 2), (2, 3), (3, 4), (4, 5)]  # 금 도트 (x, y)


def egg_cell(tilt=0.0, hop=0, crack=0, shards=False):
    img = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0)); H, W = len(EGG), len(EGG[0])
    dots = {}
    for y, row in enumerate(EGG):
        sh = round(tilt * (H - 1 - y) / (H - 1) * 1.5)  # 위쪽일수록 기울어 흔들림
        for x, ch in enumerate(row):
            if ch != "1": continue
            c = SHELL[0] if (x <= 2 and y <= 3) else SHELL[2] if (x >= 5 or y >= 7) else SHELL[1]
            if (x, y) in ((4, 6), (2, 5)): c = (226, 150, 110)  # 얼룩
            dots[(x + sh, y)] = c
    for i in range(crack):
        cx, cy = CRACK[i]; dots[(cx + round(tilt * (H - 1 - cy) / (H - 1) * 1.5), cy)] = INK
    x0, y0 = AX - W * DOT // 2, AY - H * DOT - hop * 3
    for (x, y) in list(dots):
        for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            if (x + ox, y + oy) not in dots: put_dot(img, x0, y0, x + ox, y + oy, INK)
    for (x, y), c in dots.items(): put_dot(img, x0, y0, x, y, c)
    if shards:
        for sx, sy in ((-4, 8), (9, 8), (10, 7)): put_dot(img, x0, y0, sx, sy, SHELL[1]); put_dot(img, x0, y0, sx, sy + 1, INK) if False else None
    return img


def egg():
    tl = [0, 0.7, 0, -0.7]
    save("egg", "idle", [egg_cell(tilt=t) for t in tl])
    save("egg", "walk", [egg_cell(tilt=tl[i % 4], hop=i % 2) for i in range(8)])
    save("egg", "run", [egg_cell(tilt=tl[i % 4] * 1.4, hop=i % 2) for i in range(8)])
    save("egg", "combo", [egg_cell(tilt=tl[i % 4]) for i in range(6)])
    save("egg", "die", [egg_cell(tilt=t, crack=c) for t, c in ((0.5, 0), (-0.5, 1), (0.9, 2), (-0.9, 3), (0.6, 4), (0, 4))])


def save(ch, m, frames):
    d = ROOT / f"public/characters/{ch}"; d.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (CELL * len(frames), CELL), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.paste(f, (i * CELL, 0))
    sheet.save(d / f"{m}.png")
    jp = ROOT / "shared/sprites.json"; j = json.loads(jp.read_text()); j.setdefault(ch, {})[m] = len(frames)
    jp.write_text(json.dumps(j, indent=1) + "\n")


if __name__ == "__main__":
    phoenix(); egg(); print("ok")
