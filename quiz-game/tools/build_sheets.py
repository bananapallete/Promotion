"""캐릭터 원본 스트립(가로로 프레임이 나열된 이미지)을 게임용 스프라이트시트로 변환한다.

- 흰 배경 제거 (이미 투명한 원본은 그대로 사용)
- 마지막 프레임에 박힌 AI 워터마크(✦)가 있는 원본은 그 프레임을 제외 (drop_last)
- 스트립마다 그려진 크기가 달라서, '그림자 폭'을 기준으로 크기를 통일
- 그림자 중심/바닥을 셀의 같은 위치에 맞춰 놓아 모션이 바뀌어도 발이 움직이지 않음

사용: python3 -I tools/build_sheets.py art/source/blue public/characters/blue
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

CELL = 256              # 출력 셀 크기 (정사각형)
ANCHOR = (104, 232)     # 셀 안에서 그림자 중심(x)과 그림자 바닥(y)이 놓일 위치
TARGET_SHADOW_W = 104   # 통일할 그림자 폭(px)

# 모션 이름 → (원본 파일, 마지막 프레임 제외 여부, 여러 줄 격자 여부)
# combo: 잽, 잽, 큰 휘두르기 3타 콤보 (2줄 x 4칸, 왼쪽 위부터 오른쪽으로 읽음)
STRIPS = {
    "idle": ("idle.webp", False, False),
    "walk": ("walk.webp", True, False),
    "run": ("run.webp", True, False),
    "combo": ("combo.png", False, True),
}


def load_rgba(path: Path) -> np.ndarray:
    a = np.array(Image.open(path).convert("RGBA"))
    a[..., 3] = np.where(a[..., 3] < 16, 0, a[..., 3])
    if (a[..., 3] < 250).mean() > 0.05:
        return a  # 이미 투명 배경인 원본은 그대로 사용 (밝은 이펙트를 지우지 않도록)
    rgb = a[..., :3].astype(int)
    # 흰 배경 제거: 세 채널이 모두 매우 밝은 픽셀
    white = (rgb.min(axis=2) >= 225) & (a[..., 3] > 0)
    a[..., 3] = np.where(white, 0, a[..., 3])
    # 가장자리의 밝은 회색 잔상(흰 배경과 섞인 픽셀) 2픽셀 제거
    for _ in range(2):
        transparent = a[..., 3] == 0
        near = np.zeros_like(transparent)
        near[1:, :] |= transparent[:-1, :]
        near[:-1, :] |= transparent[1:, :]
        near[:, 1:] |= transparent[:, :-1]
        near[:, :-1] |= transparent[:, 1:]
        rgb = a[..., :3].astype(int)
        grayish = (rgb.max(axis=2) - rgb.min(axis=2)) < 40
        fringe = near & grayish & (rgb.min(axis=2) >= 185) & (a[..., 3] > 0)
        a[..., 3] = np.where(fringe, 0, a[..., 3])
    return a


def _runs(flags, merge_gap=0):
    runs, start = [], None
    for i, v in enumerate(flags):
        if v and start is None:
            start = i
        if not v and start is not None:
            runs.append([start, i - 1]); start = None
    if start is not None:
        runs.append([start, len(flags) - 1])
    merged = []
    for r in runs:  # 가까이 떨어진 조각(타격 이펙트 등)은 한 프레임으로 합침
        if merged and r[0] - merged[-1][1] <= merge_gap:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return [tuple(r) for r in merged]


def split_frames(a: np.ndarray, grid: bool = False):
    """프레임 영역 (y0, y1, x0, x1) 목록. grid면 줄 단위로 나눈 뒤 왼쪽→오른쪽 순서."""
    mask = a[..., 3] > 128
    bands = _runs(mask.any(axis=1), merge_gap=12) if grid else [(0, mask.shape[0] - 1)]
    out = []
    for y0, y1 in bands:
        for x0, x1 in _runs(mask[y0:y1 + 1].any(axis=0), merge_gap=10 if grid else 0):
            out.append((y0, y1, x0, x1))
    return out


def shadow_info(frame: np.ndarray):
    """프레임 아래쪽의 회색 그림자 픽셀로 중심 x, 바닥 y, 폭을 구한다."""
    rgb = frame[..., :3].astype(int)
    alpha = frame[..., 3] > 128
    gray = (rgb.max(axis=2) - rgb.min(axis=2)) < 28
    shade = gray & (rgb.mean(axis=2) > 95) & (rgb.mean(axis=2) < 195) & alpha
    ys = np.where(alpha.any(axis=1))[0]
    bottom_zone = np.zeros_like(shade)
    lo = ys.max() - max(8, int(0.12 * (ys.max() - ys.min())))
    bottom_zone[lo:, :] = True
    sh = shade & bottom_zone
    xs_idx = np.where(sh.any(axis=0))[0]
    ys_idx = np.where(sh.any(axis=1))[0]
    if len(xs_idx) == 0:
        raise SystemExit("그림자를 찾지 못했습니다")
    return (xs_idx.min() + xs_idx.max()) / 2, ys_idx.max(), xs_idx.max() - xs_idx.min() + 1


def main(src_dir: Path, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    meta = {"cell": CELL, "anchor": list(ANCHOR), "sheets": {}}
    for name, (fname, drop_last, grid) in STRIPS.items():
        a = load_rgba(src_dir / fname)
        boxes = split_frames(a, grid)
        if drop_last:
            boxes = boxes[:-1]
        frames = []
        for y0, y1, x0, x1 in boxes:
            sub = a[y0:y1 + 1, x0:x1 + 1]
            ys = np.where((sub[..., 3] > 128).any(axis=1))[0]
            sub = sub[ys.min():ys.max() + 1]
            frames.append(sub)
        infos = [shadow_info(f) for f in frames]
        scale = TARGET_SHADOW_W / float(np.median([i[2] for i in infos]))
        sheet = Image.new("RGBA", (CELL * len(frames), CELL), (0, 0, 0, 0))
        for i, (f, (cx, by, _)) in enumerate(zip(frames, infos)):
            im = Image.fromarray(f)
            nw, nh = max(1, round(im.width * scale)), max(1, round(im.height * scale))
            im = im.resize((nw, nh), Image.LANCZOS)
            px = ANCHOR[0] - round(cx * scale)
            py = ANCHOR[1] - round(by * scale)
            if px < 0 or px + nw > CELL or py < 0:
                print(f"참고: {name} 프레임 {i}이 셀 밖으로 {max(0, -px, px + nw - CELL)}px 나가 잘립니다")
            cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))  # 옆 칸으로 번지지 않게 셀 안에서만 합성
            cell.paste(im, (px, py), im)
            sheet.paste(cell, (i * CELL, 0))
        sheet.save(out_dir / f"{name}.png")
        meta["sheets"][name] = {"frames": len(frames), "scale": round(scale, 3)}
        print(f"{name}: {len(frames)} frames, scale {scale:.3f}")
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
