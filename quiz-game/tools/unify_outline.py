"""스프라이트 윤곽선 통일: 바깥 1도트 띠 중 이미 어두운 픽셀(밝기 95 미만)만 #14122b 로 바꾼다.
다리·꼬리처럼 가는 부분이 통째로 까맣게 되지 않도록 어둡지 않은 선은 건드리지 않는다. 바닥 그림자와 이펙트(밝은 색)는 제외.
시트를 새로 만든 뒤(build_chars / fix_princess / stabilize) 마다 실행하고, 그다음 shrink_png:
  python3 -I tools/unify_outline.py && python3 -I tools/shrink_png.py public/characters
"""
from collections import Counter
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).parent.parent / "public/characters"
CELL, INK = 256, (20, 18, 43)


def dot_size(a):
    """대기 시트에서 같은 색이 이어지는 길이의 최빈값 = 도트 한 개의 크기(px)"""
    c = Counter()
    for f in range(a.shape[1] // CELL):
        cell = a[:, f * CELL:(f + 1) * CELL]
        for row in cell[::3]:
            run = 1
            for x in range(1, CELL):
                if row[x, 3] > 0 and row[x - 1, 3] > 0 and abs(row[x, :3].astype(int) - row[x - 1, :3]).sum() < 12:
                    run += 1
                else:
                    if 3 <= run <= 14:
                        c[run] += 1
                    run = 1
    return c.most_common(1)[0][0] if c else 6


def outline(cell, d):
    rgb = cell[..., :3].astype(int)
    al = cell[..., 3] > 128
    if not al.any():
        return cell
    gray = (rgb.max(2) - rgb.min(2)) < 28
    shade = gray & (rgb.mean(2) > 95) & (rgb.mean(2) < 195) & al
    ys = np.where(al.any(1))[0]
    shade[: max(0, ys.max() - 26), :] = False  # 바닥 그림자
    body = al & ~shade
    dist = ndimage.distance_transform_edt(np.pad(body, 1))[1:-1, 1:-1]
    band = body & (dist <= d * 0.9) & (rgb.mean(2) < 95)
    out = cell.copy()
    out[band, :3] = INK
    return out


def main():
    for d in sorted(p for p in ROOT.iterdir() if p.is_dir()):
        size = dot_size(np.array(Image.open(d / "idle.png").convert("RGBA")))
        for f in sorted(d.glob("*.png")):
            a = np.array(Image.open(f).convert("RGBA"))
            out = np.concatenate([outline(a[:, i * CELL:(i + 1) * CELL], size) for i in range(a.shape[1] // CELL)], axis=1)
            Image.fromarray(out).save(f)
        print(d.name, f"도트 {size}px")


if __name__ == "__main__":
    main()
