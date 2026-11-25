"""먼지 이펙트 시트(진한 남색 배경, 크림색 먼지 행들)에서 첫 줄을 잘라 저도트 시트로 만든다.
사용: python3 -I tools/slice_dust.py <시트 이미지> public/fx
- puff.png: 걷거나 달릴 때 뒤로 남는 먼지 뭉치(5프레임)
- 부드러운 원본을 줄였다가 최근접으로 확대해 캐릭터와 같은 도트 느낌으로 만든다
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

CELL_W, CELL_H = 40, 28  # 출력 셀 (도트)
# (이름, 행 중심 y 범위, 프레임 수, 도트 폭)
ROWS = [("puff", (20, 140), 5, 30)]


def main(src, out):
    im = Image.open(src).convert("RGB")
    a = np.array(im).astype(int)
    bg = np.median(a[:6, :].reshape(-1, 3), axis=0)
    light = (a.min(axis=2) > 150) | ((np.abs(a - bg).max(axis=2) > 70) & (a.max(axis=2) > 110))  # 크림색 + 갈색 조각
    for name, (y0, y1), n, width in ROWS:
        band = light[y0:y1]
        cols = band.any(axis=0)
        # 열 덩어리 사이의 가장 큰 빈틈 n-1곳에서 잘라 프레임으로 나눈다 (흩어진 방울은 가까운 덩어리에 붙음)
        lab, k = ndimage.label(cols)
        runs = [(np.where(lab == i)[0].min(), np.where(lab == i)[0].max()) for i in range(1, k + 1)]
        gaps = sorted(range(len(runs) - 1), key=lambda i: runs[i][1] - runs[i + 1][0])[:n - 1]  # 음수 = 빈틈 크기 큰 순
        cuts = sorted(gaps)
        spans, start = [], 0
        for c in cuts + [len(runs) - 1]:
            spans.append((runs[start][0], runs[c][1])); start = c + 1
        assert len(spans) == n, f"{name}: 프레임 {len(spans)}개 (기대 {n})"
        scale = width / max(x1 - x0 + 1 for x0, x1 in spans)
        sheet = Image.new("RGBA", (CELL_W * n, CELL_H), (0, 0, 0, 0))
        for i, (x0, x1) in enumerate(spans):
            m = band[:, x0:x1 + 1]
            ys = np.where(m.any(axis=1))[0]
            sub = np.array(im.crop((x0, y0 + ys.min(), x1 + 1, y0 + ys.max() + 1)))
            alpha = (m[ys.min():ys.max() + 1].astype(np.uint8) * 255)
            rgba = Image.fromarray(np.dstack([sub, alpha]).astype(np.uint8), "RGBA")
            w, h = max(1, round(rgba.width * scale)), max(1, round(rgba.height * scale))
            rgba = rgba.resize((w, h), Image.BOX)
            r = np.array(rgba); r[..., 3] = np.where(r[..., 3] > 110, 255, 0); rgba = Image.fromarray(r)
            cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
            cell.paste(rgba, ((CELL_W - w) // 2, CELL_H - 1 - h), rgba)  # 바닥 중앙 기준
            sheet.paste(cell, (i * CELL_W, 0))
        sheet.save(Path(out) / f"{name}.png")
        print(name, n, "프레임", [(int(x0), int(x1)) for x0, x1 in spans][:3])


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
