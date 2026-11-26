"""피닉스 시트: 받은 걷기·달리기·변신(병아리→불꽃→피닉스) 원본에서 만든다. 대기·공격은 걷기 프레임을 쓰고(날아다니는 새), 쓰러짐은 변신을 거꾸로(피닉스 → 불꽃).
사용: python3 tools/build_phoenix.py <폴더(phoenix_walk.png, phoenix_run.png, phoenix_morph.png)>
크기: 변신 첫 프레임(병아리)이 병아리 스프라이트와 같은 크기가 되도록 전체 배율을 정한다.
"""
import json, os, sys
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import build_chars as bc
import build_sheets as bs

ROOT = Path(__file__).parent.parent
CHICK_BODY = bc.REF_SIZE * bc.SIZE["chick"]  # 병아리 스프라이트에서 몸의 크기(px)


def load(path, n, grid):
    a = bc.strip_bg(path); frames, infos = [], []
    for y0, y1, x0, x1 in bc.split(a, n, grid):
        sub = a[y0:y1 + 1, x0:x1 + 1]; ys = np.where((sub[..., 3] > 128).any(axis=1))[0]; f = sub[ys.min():ys.max() + 1]; frames.append(f)
        try: infos.append(bs.shadow_info(f))
        except SystemExit:
            al = f[..., 3] > 128; yy = np.where(al.any(axis=1))[0]; xs = np.where(al[yy.max() - 8:].any(axis=0))[0]; infos.append(((xs.min() + xs.max()) / 2, yy.max(), 0))
    return frames, infos


def cell(f, info, sc):
    gw, gh = max(1, round(f.shape[1] * sc / bc.DOT)), max(1, round(f.shape[0] * sc / bc.DOT))
    im = Image.fromarray(f); sm = np.array(im.resize((gw, gh), Image.BOX)); sm[..., 3] = np.where(sm[..., 3] > 110, 255, 0)
    im = Image.fromarray(sm).resize((gw * bc.DOT, gh * bc.DOT), Image.NEAREST)
    px, py = bs.ANCHOR[0] - round(info[0] * sc), bs.ANCHOR[1] - round(info[1] * sc)
    px = min(max(px, 0), bs.CELL - im.width); py = max(py, 0)
    c = Image.new("RGBA", (bs.CELL, bs.CELL), (0, 0, 0, 0)); c.paste(im, (px, py), im); return c


def main(src):
    out = ROOT / "public/characters/phoenix"; out.mkdir(parents=True, exist_ok=True)
    walk, wi = load(src / "phoenix_walk.png", 8, False); run, ri = load(src / "phoenix_run.png", 8, False); os.environ["EQUAL"] = "1"; mor, mi = load(src / "phoenix_morph.png", 8, True)  # 칸 균등 분할
    sc = CHICK_BODY / bc.body(mor[0])
    fit = lambda fr: sc * bc.body(mor[7]) / float(np.median([bc.body(f) for f in fr]))  # 걷기·달리기 원본은 변신 시트보다 작게 그려져 있어서 완성된 피닉스 크기에 맞춘다
    w = [cell(f, i, fit(walk)) for f, i in zip(walk, wi)]; r = [cell(f, i, fit(run)) for f, i in zip(run, ri)]; m = [cell(f, i, sc) for f, i in zip(mor, mi)]
    sheets = {"idle": [w[0], w[2], w[4], w[6]], "walk": w, "run": r, "combo": w[:6], "die": [m[7], m[6], m[5], m[4], m[3], m[3]], "morph": m}
    jp = ROOT / "shared/sprites.json"; d = json.loads(jp.read_text()); d["phoenix"] = {}
    for name, fr in sheets.items():
        sh = Image.new("RGBA", (bs.CELL * len(fr), bs.CELL), (0, 0, 0, 0))
        for i, c in enumerate(fr): sh.paste(c, (i * bs.CELL, 0))
        sh.save(out / f"{name}.png"); d["phoenix"][name] = len(fr)
    jp.write_text(json.dumps(d, indent=1) + "\n"); print("phoenix", d["phoenix"], f"scale {sc:.3f}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
