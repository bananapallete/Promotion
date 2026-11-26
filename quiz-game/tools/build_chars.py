"""AI가 만든 1024x1024 시트(배경 불투명, 프레임 수 제각각)를 게임용 시트로 변환한다.

사용: python3 tools/build_chars.py <원본폴더(영문 이름 <id>_<모션>.png)> public/characters
- 모서리에서 채우기로 배경 제거 (배경색은 모서리에서 추정)
- 프레임 수는 자동 감지, shared/sprites.json에 기록
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

import build_sheets as bs

REF_SIZE = 158  # 기본(blue) 캐릭터 idle의 덩치(면적 제곱근)
# 실제 크기 비율: 기준(1.0) 대비 화면에 보이는 크기. 줄여도 도트 크기(DOT)는 그대로라서 그림 자체를 더 성긴 도트로 다시 찍는다
SIZE = {"chick": 0.38, "chicken": 0.5, "frog": 0.7, "shiba": 0.8, "labrador": 0.9, "pig": 0.9, "hippo": 0.8}
DOT = 7  # 셀 안에서 도트 한 개의 크기(px). 파란티 등 기본 캐릭터의 도트 크기와 같다
MOTIONS = {"idle": 4, "walk": 6, "run": 6, "attack": 6, "die": 6}  # 모션 → 프레임 수 (attack·die는 2줄 x 3칸)


def clean(a: np.ndarray) -> np.ndarray:
    """배경 잡티(작은 조각) 제거. 이펙트 조각은 작아도 크기 40px 이상이라 남음"""
    lab, n = ndimage.label(a[..., 3] > 0)
    size = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = np.concatenate([[False], size >= 150])
    a[..., 3] = np.where(keep[lab], a[..., 3], 0)
    return a


def strip_bg(path: Path, tol=30) -> np.ndarray:
    a = np.array(Image.open(path).convert("RGBA"))
    if (a[..., 3] < 250).mean() > 0.05:  # 이미 투명 배경인 원본
        a[..., 3] = np.where(a[..., 3] < 128, 0, 255)
        return clean(a)
    rgb = a[..., :3].astype(int)
    h, w = rgb.shape[:2]
    corners = np.array([rgb[:8, :8], rgb[:8, -8:], rgb[-8:, :8], rgb[-8:, -8:]]).reshape(-1, 3)
    bg = np.median(corners, axis=0)
    near = np.abs(rgb - bg).max(axis=2) <= tol
    lab, _ = ndimage.label(near)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    a[..., 3] = np.where(np.isin(lab, list(border)), 0, 255)
    # 가장자리 한 겹은 배경과 섞인 색이라 지운다
    a[..., 3] = ndimage.binary_erosion(a[..., 3] > 0, iterations=1) * 255
    return clean(a)


def body(f):
    lab, n = ndimage.label(f[..., 3] > 128)
    return float(np.max(ndimage.sum(np.ones_like(lab), lab, range(1, n + 1)))) ** 0.5


def split(a, n, grid):
    """프레임 영역 (y0,y1,x0,x1) 목록. 한 줄은 이웃과 붙어도 되게 가장 빈 세로줄에서 자르고,
    격자(attack)는 가장 큰 덩어리 n개를 몸으로 보고 작은 이펙트 조각은 가까운 몸에 붙인다."""
    m = a[..., 3] > 0
    if not grid:
        col = m.sum(axis=0)
        cuts = [0]
        for i in range(1, n):
            c0 = round(i * m.shape[1] / n)
            lo = max(cuts[-1] + 20, c0 - 35)
            cuts.append(lo + int(np.argmin(col[lo:c0 + 36])))
        cuts.append(m.shape[1])
        return [(0, m.shape[0] - 1, x0, x1 - 1) for x0, x1 in zip(cuts, cuts[1:])]
    out = []
    rows = bs._runs(m.any(axis=1), merge_gap=12)
    per = n // len(rows)
    assert len(rows) == 2, f"줄 {len(rows)}개"
    for y0, y1 in rows:
        if os.environ.get("EQUAL"):  # 프레임이 서로 붙어 있으면(활 등) 칸을 똑같이 나눈다
            W = m.shape[1] / per
            out += [(y0, y1, round(i * W), round((i + 1) * W) - 1) for i in range(per)]
            continue
        runs = bs._runs(m[y0:y1 + 1].any(axis=0))
        cores = sorted(sorted(runs, key=lambda r: r[0] - r[1])[:per])
        spans = [list(r) for r in cores]
        for r in runs:
            if r in cores:
                continue
            k = min(range(per), key=lambda i: min(abs(r[0] - spans[i][1]), abs(r[1] - spans[i][0])))
            spans[k] = [min(spans[k][0], r[0]), max(spans[k][1], r[1])]
        out += [(y0, y1, x0, x1) for x0, x1 in sorted(spans)]
    return out


def main(src: Path, out: Path):
    jp = Path(__file__).parent.parent / "shared" / "sprites.json"
    sprites = json.loads(jp.read_text())  # 일부 캐릭터만 다시 만들어도 나머지는 유지
    only = os.environ.get("ONLY", ",".join(MOTIONS)).split(",")  # ONLY=die 처럼 일부 모션만 다시 만들기
    for cid in sorted({p.name.rsplit("_", 1)[0] for p in src.glob("*.png")}):
        d = out / cid
        d.mkdir(parents=True, exist_ok=True)
        counts = dict(sprites.get(cid, {}))
        motions = []  # (이름, 프레임, 발 위치 정보, 배율)
        for mo, n in MOTIONS.items():
            if mo not in only:
                continue
            n = int(os.environ.get(f"FRAMES_{cid}_{mo}", n))  # 모션별 프레임 수 지정
            a = strip_bg(src / f"{cid}_{mo}.png")
            frames = []
            for y0, y1, x0, x1 in split(a, n, mo in ("attack", "die")):
                sub = a[y0:y1 + 1, x0:x1 + 1]
                ys = np.where((sub[..., 3] > 128).any(axis=1))[0]
                frames.append(sub[ys.min():ys.max() + 1])
            infos = []
            for f in frames:
                try:
                    infos.append(bs.shadow_info(f))
                except SystemExit:  # 그림자가 없으면 발 위치로 대신함
                    al = f[..., 3] > 128
                    ys = np.where(al.any(axis=1))[0]
                    xs = np.where(al[ys.max() - 8:].any(axis=0))[0]
                    infos.append(((xs.min() + xs.max()) / 2, ys.max(), xs.max() - xs.min() + 1))
            # 원본은 모션마다 그려진 크기가 달라서, 모션별로 몸통(가장 큰 덩어리) 크기를 REF_SIZE에 맞춘다
            sc = REF_SIZE / float(np.median([body(f) for f in frames]))
            motions.append(("combo" if mo == "attack" else mo, frames, infos, sc))
        # 셀보다 넓은 캐릭터(귀상어 등)는 모든 모션을 같은 비율로 줄여 안 잘리게 한다
        fit = min([1.0] + [(bs.CELL - 4) / (f.shape[1] * sc * SIZE.get(cid, 1)) for _, fs, _, sc in motions for f in fs])
        if fit < 1:
            print(f"{cid}: 너무 넓어서 {fit:.3f}배로 줄임 → characters.json scale을 {1 / fit:.3f}배 키울 것")
        for name, frames, infos, sc in motions:
            sc *= fit
            sheet = Image.new("RGBA", (bs.CELL * len(frames), bs.CELL), (0, 0, 0, 0))
            for i, (f, (cx, by, _)) in enumerate(zip(frames, infos)):
                im = Image.fromarray(f)
                k = SIZE.get(cid)
                if k:  # 도트 격자 수를 줄여서 다시 찍기: 박스 평균 → 알파 이진화 → 최근접 확대
                    gw, gh = max(1, round(im.width * sc * k / DOT)), max(1, round(im.height * sc * k / DOT))
                    sm = np.array(im.resize((gw, gh), Image.BOX)); sm[..., 3] = np.where(sm[..., 3] > 110, 255, 0)
                    im = Image.fromarray(sm).resize((gw * DOT, gh * DOT), Image.NEAREST)
                    sc_eff = k * sc  # 앵커 계산용 배율
                else:
                    im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.NEAREST)
                    sc_eff = sc
                px, py = bs.ANCHOR[0] - round(cx * sc_eff), bs.ANCHOR[1] - round(by * sc_eff)
                px = min(max(px, 0), bs.CELL - im.width)  # 살짝 벗어난 건 옆으로 밀어 넣음 (쓰러진 자세 등)
                py = max(py, 0)
                cell = Image.new("RGBA", (bs.CELL, bs.CELL), (0, 0, 0, 0))
                cell.paste(im, (px, py), im)
                sheet.paste(cell, (i * bs.CELL, 0))
                if im.height > bs.CELL:
                    print(f"참고: {cid} {name} {i} 세로가 셀보다 큼")
            sheet.save(d / f"{name}.png")
            counts[name] = len(frames)
        sprites[cid] = counts
        print(cid, counts)
    jp.write_text(json.dumps(sprites, indent=1) + "\n")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
