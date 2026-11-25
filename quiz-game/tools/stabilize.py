"""걷기·달리기 시트의 프레임별 위치 흔들림을 잡는다 (그림자가 잘 안 잡혀 프레임마다 좌우·상하로 밀린 시트용).
- 몸통 무게중심 x 를 대기 모션의 평균에 맞추고, 몸 아래(발)를 대기 모션의 발 높이에 맞춘다
- 몸에서 떨어진 작은 조각(먼지 점 등)은 지운다
사용: python3 -I tools/stabilize.py labrador:run labrador:walk shiba:run ...
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).parent.parent / "public/characters"
CELL = 256


def load(ch, m):
    a = np.array(Image.open(ROOT / ch / f"{m}.png").convert("RGBA"))
    return [a[:, i * CELL:(i + 1) * CELL].copy() for i in range(a.shape[1] // CELL)]


def shadow_mask(f):
    rgb = f[..., :3].astype(int)
    al = f[..., 3] > 128
    gray = (rgb.max(axis=2) - rgb.min(axis=2)) < 28
    sh = gray & (rgb.mean(axis=2) > 95) & (rgb.mean(axis=2) < 195) & al
    ys = np.where(al.any(axis=1))[0]
    sh[: ys.max() - 26, :] = False
    return sh


def clean(f):
    """몸에서 떨어진 작은 조각 제거"""
    al = f[..., 3] > 128
    big = ndimage.binary_dilation(al, iterations=3)
    lab, n = ndimage.label(big)
    if n <= 1:
        return f
    sizes = ndimage.sum(al, lab, range(1, n + 1))
    keep = np.zeros_like(al)
    main = 1 + int(np.argmax(sizes))
    for i in range(1, n + 1):
        if i == main or sizes[i - 1] >= 0.03 * sizes[main - 1]:
            keep |= (lab == i)
    f = f.copy(); f[~keep] = 0
    return f


def measure(f):
    al = (f[..., 3] > 128) & ~shadow_mask(f)
    ys, xs = np.where(al)
    return xs.mean(), ys.max()


def shift(f, dx, dy):
    out = np.zeros_like(f)
    h = CELL
    ys0, ys1 = max(0, dy), min(h, h + dy)
    xs0, xs1 = max(0, dx), min(h, h + dx)
    out[ys0:ys1, xs0:xs1] = f[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return out


def main(specs):
    for spec in specs:
        ch, m = spec.split(":")
        idle = [clean(f) for f in load(ch, "idle")]
        tx = float(np.mean([measure(f)[0] for f in idle]))
        ty = float(np.median([measure(f)[1] for f in idle]))
        frames = [clean(f) for f in load(ch, m)]
        out = []
        for f in frames:
            x, y = measure(f)
            out.append(shift(f, int(round(tx - x)), int(round(ty - y))))
        Image.fromarray(np.concatenate(out, axis=1)).save(ROOT / ch / f"{m}.png")
        print(spec, f"기준 x={tx:.0f} 발={ty:.0f}")


if __name__ == "__main__":
    main(sys.argv[1:])
