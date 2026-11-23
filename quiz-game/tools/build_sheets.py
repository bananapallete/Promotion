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
ANCHOR = (128, 232)     # 셀 안에서 그림자 중심(x)과 그림자 바닥(y)이 놓일 위치
TARGET_SHADOW_W = 104   # 통일할 그림자 폭(px)

# 모션 이름 → (원본 파일, 마지막 프레임 제외 여부)
STRIPS = {
    "idle": ("idle.webp", False),
    "walk": ("walk.webp", True),
    "run": ("run.webp", True),
    "punch": ("punch.webp", True),
}


def load_rgba(path: Path) -> np.ndarray:
    a = np.array(Image.open(path).convert("RGBA"))
    a[..., 3] = np.where(a[..., 3] < 16, 0, a[..., 3])
    rgb = a[..., :3].astype(int)
    # 흰 배경 제거: 세 채널이 모두 매우 밝은 픽셀
    white = rgb.min(axis=2) >= 225
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


def split_frames(a: np.ndarray):
    mask = a[..., 3] > 128
    cols = mask.any(axis=0)
    runs, start = [], None
    for x, v in enumerate(cols):
        if v and start is None:
            start = x
        if not v and start is not None:
            runs.append((start, x - 1)); start = None
    if start is not None:
        runs.append((start, len(cols) - 1))
    return runs


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
    for name, (fname, drop_last) in STRIPS.items():
        a = load_rgba(src_dir / fname)
        runs = split_frames(a)
        if drop_last:
            runs = runs[:-1]
        frames = []
        for x0, x1 in runs:
            sub = a[:, x0:x1 + 1]
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
            px = ANCHOR[0] - round(cx * scale) + i * CELL
            py = ANCHOR[1] - round(by * scale)
            if px < i * CELL or px + nw > (i + 1) * CELL or py < 0:
                print(f"경고: {name} 프레임 {i}이 셀을 벗어납니다 ({px - i * CELL},{py},{nw}x{nh})")
            sheet.paste(im, (px, py), im)
        sheet.save(out_dir / f"{name}.png")
        meta["sheets"][name] = {"frames": len(frames), "scale": round(scale, 3)}
        print(f"{name}: {len(frames)} frames, scale {scale:.3f}")
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
