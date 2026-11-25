"""공주 시트 보정 (원본은 art/source/princess/sheets_orig 에 보관, 항상 거기서 다시 만든다).
1) 대기→걷기 크기 차이(키 비율 약 6%)를 걷기에 맞춰 없앰
2) 걷기에 위아래 흔들림(그림자는 그대로) 추가
3) 달리기는 걷기와 원본이 같아서, 앞으로 기울이고(도트 단위 계단 기울기) 더 크게 튀고 프레임 순서를 어긋나게 해 다르게 만듦
사용: python3 -I tools/fix_princess.py
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).parent.parent
SRC, OUT = ROOT / "art/source/princess/sheets_orig", ROOT / "public/characters/princess"
CELL, ANCHOR, DOT = 256, (104, 232), 7


def cells(path):
    a = np.array(Image.open(path).convert("RGBA"))
    return [a[:, i * CELL:(i + 1) * CELL].copy() for i in range(a.shape[1] // CELL)]


def height(f):  # 머리 위 왕관부터 발까지 키
    ys = np.where((f[..., 3] > 128).any(axis=1))[0]
    return float(ys.max() - ys.min() + 1)


def rescale(f, k):  # 발(앵커) 기준으로 k배
    if abs(k - 1) < 1e-3:
        return f
    im = Image.fromarray(f)
    s = max(1, round(CELL * k))
    im = im.resize((s, s), Image.NEAREST)
    out = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    out.paste(im, (ANCHOR[0] - round(ANCHOR[0] * s / CELL), ANCHOR[1] - round(ANCHOR[1] * s / CELL)), im)
    return np.array(out)


def split_shadow(f):
    rgb = f[..., :3].astype(int)
    al = f[..., 3] > 128
    ys = np.where(al.any(axis=1))[0]
    yb = ys.max()
    gray = (rgb.max(axis=2) - rgb.min(axis=2)) < 28
    shade = gray & (rgb.mean(axis=2) > 95) & (rgb.mean(axis=2) < 195) & al
    shade[: yb - 22, :] = False
    sh = f.copy(); sh[~shade] = 0
    sp = f.copy(); sp[shade] = 0
    return sp, sh, yb


def move(f, dy, lean):
    """그림자는 두고 몸만 위로(dy px) 올리고, 발에서 멀수록 앞(오른쪽)으로 도트 단위로 기울임"""
    sp, sh, yb = split_shadow(f)
    out = np.zeros_like(f)
    for y in range(CELL):
        row = sp[y]
        if not row[:, 3].any():
            continue
        dx = DOT * round((yb - y) * lean / DOT)
        ty = y - dy
        if 0 <= ty < CELL:
            out[ty] = np.roll(row, dx, axis=0)
    # 그림자 먼저, 몸이 위에
    res = sh.copy()
    m = out[..., 3] > 0
    res[m] = out[m]
    return res


def save(frames, name):
    Image.fromarray(np.concatenate(frames, axis=1)).save(OUT / f"{name}.png")


def main():
    idle, walk = cells(SRC / "idle.png"), cells(SRC / "walk.png")
    k = np.mean([height(f) for f in idle]) / np.mean([height(f) for f in walk])  # 걷기를 대기 키에 맞춤
    print(f"걷기 크기 보정 x{k:.3f}")
    walk = [rescale(f, k) for f in walk]
    n = len(walk)
    bob_w = [0, 4, 7, 4]
    save([move(f, bob_w[i % 4], 0) for i, f in enumerate(walk)], "walk")
    bob_r = [0, 8, 14, 8]
    run = walk[3:] + walk[:3]  # 걷기와 다른 박자로 시작
    save([move(f, bob_r[i % 4], 0.14) for i, f in enumerate(run)], "run")
    save(cells(SRC / "idle.png"), "idle")
    print("frames", n)


if __name__ == "__main__":
    main()
