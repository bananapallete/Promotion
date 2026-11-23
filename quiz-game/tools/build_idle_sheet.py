"""idle 원본 이미지(프레임 4개 가로 나열, 투명 배경)를 균일한 셀의 스프라이트시트로 변환한다.

사용: python3 -I tools/build_idle_sheet.py <원본.webp> <출력.png>
"""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
a = np.array(Image.open(src).convert("RGBA"))
a[..., 3] = np.where(a[..., 3] < 16, 0, a[..., 3])  # 알파 노이즈 제거
mask = a[..., 3] > 128

# 프레임 분리: 비어있지 않은 열의 연속 구간
cols = mask.any(0)
runs, s = [], None
for x, v in enumerate(cols):
    if v and s is None:
        s = x
    if not v and s is not None:
        runs.append((s, x - 1)); s = None
if s is not None:
    runs.append((s, len(cols) - 1))

bottom = int(np.where(mask.any(1))[0].max())  # 그림자 바닥 (모든 프레임 공통)
CW, CH = 400, 500  # 셀 크기
sheet = Image.new("RGBA", (CW * len(runs), CH), (0, 0, 0, 0))
for i, (x0, x1) in enumerate(runs):
    crop = Image.fromarray(a[:, x0:x1 + 1])
    top = int(np.where(mask[:, x0:x1 + 1].any(1))[0].min())
    crop = crop.crop((0, top, crop.width, bottom + 1))
    # 가로 중앙, 세로는 바닥 정렬(발 위치 고정)
    sheet.paste(crop, ((CW - crop.width) // 2 + i * CW, CH - crop.height - 8), crop)
sheet.save(dst)
print(f"{len(runs)} frames, cell {CW}x{CH} -> {dst}")
