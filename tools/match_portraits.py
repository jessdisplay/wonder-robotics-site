"""Make the four portraits one set: same backdrop, same head size and position,
and the two shirt colours identical across people."""
import sys, cv2, numpy as np
from PIL import Image, ImageFilter
OUT_W, OUT_H = 1100, 1366
FACE_W, FACE_CX, FACE_TOP = 0.47, 0.50, 0.23      # of the output
PURPLE = np.array([47, 27, 80.0])                 # the site's deep purple, as cloth
CREAM = np.array([232, 222, 200.0])
people = {"jesse": "purple", "ryan": "cream", "logan": "purple", "gino": "cream"}
# face boxes from the Mac's Vision detector (faces.swift): x, top, w, h as fractions
FACES = {"jesse": (0.3250, 0.2088, 0.3825, 0.3081), "ryan": (0.3223, 0.1770, 0.3416, 0.2752),
         "logan": (0.2738, 0.1938, 0.4122, 0.3321), "gino": (0.3392, 0.1558, 0.4272, 0.3441)}

def backdrop():
    y, x = np.mgrid[0:OUT_H, 0:OUT_W].astype(np.float32)
    d = np.sqrt(((x - OUT_W * .5) / (OUT_W * .75)) ** 2 + ((y - OUT_H * .38) / (OUT_H * .8)) ** 2)
    t = np.clip(d, 0, 1)[..., None]
    return (np.array([243, 232, 216.0]) * (1 - t) + np.array([226, 211, 190.0]) * t)

for name, shirt in people.items():
    im = Image.open(f"{name}.png").convert("RGBA")
    a = np.asarray(im).astype(np.float32); rgb, alpha = a[..., :3], a[..., 3] / 255
    X, Y, Wd, Hd = FACES[name]
    fx, fy, fw, fh = X * im.width, Y * im.height, Wd * im.width, Hd * im.height
    hsv = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    H, S_, V = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
    below = np.zeros_like(alpha, bool); below[int(fy + fh * 0.95):, :] = True
    if shirt == "purple":
        m = below & (alpha > .5) & (H > 235) & (H < 335) & (S_ > .18)
        target = PURPLE
    else:
        m = below & (alpha > .5) & (S_ < .24) & (V > .5)
        target = CREAM
    mean = rgb[m].mean(0)
    gain = target / mean
    soft = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 4)[..., None]
    rgb2 = np.clip(rgb * (1 + (gain - 1) * soft), 0, 255)
    print(f"{name}: face {fw}px at x {fx + fw / 2:.0f}/{im.width}; shirt mean {mean.round()} -> {target}; mask {m.mean():.2%}")
    # place on the common backdrop
    scale = FACE_W * OUT_W / fw
    cut = Image.fromarray(np.dstack([rgb2, alpha * 255]).astype(np.uint8)).resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    ox = round(FACE_CX * OUT_W - (fx + fw / 2) * scale); oy = round(FACE_TOP * OUT_H - fy * scale)
    # the source frame must cover the output, or a shoulder ends in a straight cut
    ox = min(0, max(ox, OUT_W - cut.width)); 
    if oy + cut.height < OUT_H: sys.exit(f"{name}: body ends above the frame")
    bg = Image.fromarray(backdrop().astype(np.uint8), "RGB").convert("RGBA")
    # a soft shadow of the figure on the backdrop
    sh = Image.new("RGBA", bg.size, (0, 0, 0, 0)); sil = Image.new("RGBA", cut.size, (60, 40, 30, 0)); sil.putalpha(cut.getchannel("A").point(lambda v: int(v * .28)))
    sh.alpha_composite(sil, (max(ox + 26, ox), oy + 14) if ox + 26 <= 0 else (ox, oy + 14)); bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28)))
    bg.alpha_composite(cut, (ox, oy))
    bg.convert("RGB").save(f"team-{name}.jpg", quality=90)
    print(f"   placed at x {ox}, covers to {ox + cut.width} of {OUT_W}; face centre lands at {(ox + (fx + fw / 2) * scale) / OUT_W:.2f}")
row = Image.new("RGB", (4 * 560 + 30, 695), "white")
for k, n in enumerate(people): row.paste(Image.open(f"team-{n}.jpg").resize((560, 695)), (k * 570, 0))
row.resize((1135, 347)).save("row.jpg", quality=88)
