"""한 캐릭터의 모든 시트 색을 공통 팔레트(기본 16색)로 맞춰 번지고 깨진 색을 또렷한 도트로 정리한다.
사용: python3 tools/pal_snap.py public/characters/diva [색 수]"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

d = Path(sys.argv[1]); n = int(sys.argv[2]) if len(sys.argv) > 2 else 16
files = sorted(d.glob("*.png"))
imgs = {f: np.array(Image.open(f).convert("RGBA")) for f in files}
px = np.concatenate([a[a[..., 3] > 0][:, :3] for a in imgs.values()])
pal_img = Image.fromarray(px[np.random.default_rng(0).choice(len(px), min(len(px), 60000), replace=False)].reshape(-1, 1, 3).astype(np.uint8)).quantize(colors=n, method=Image.MEDIANCUT)
pal = np.array(pal_img.getpalette()[: n * 3]).reshape(-1, 3).astype(int)
for f, a in imgs.items():
    m = a[..., 3] > 0; rgb = a[m][:, :3].astype(int)
    idx = ((rgb[:, None, :] - pal[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
    out = a.copy(); out[m, :3] = pal[idx]; Image.fromarray(out).save(f)
print(d.name, len(files), "시트 →", n, "색")
