"""스프라이트마다 머리 꼭대기 높이(셀 위에서 몇 번째 줄인지)를 shared/spriteBounds.json 에 적는다.
머리 위 UI(이름·체력바)가 캐릭터를 가리지 않도록 world.js가 쓴다. 시트를 바꿀 때마다 다시 실행:
  python3 -I tools/sprite_bounds.py
대기·걷기·달리기 프레임 중 가장 높은 곳 (공격·죽음 자세는 UI가 튀지 않게 제외)
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).parent.parent
CELL = 256
out = {}
for d in sorted((ROOT / "public/characters").iterdir()):
    top = CELL
    for m in ("idle", "walk", "run"):
        f = d / f"{m}.png"
        if not f.exists():
            continue
        a = np.array(Image.open(f).convert("RGBA"))[..., 3] > 128
        for i in range(a.shape[1] // CELL):
            ys = np.where(a[:, i * CELL:(i + 1) * CELL].any(axis=1))[0]
            if len(ys):
                top = min(top, int(ys.min()))
    out[d.name] = top
(ROOT / "shared/spriteBounds.json").write_text(json.dumps(out, indent=1) + "\n")
print(out)
