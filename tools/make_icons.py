#!/usr/bin/env python3
"""App icon and favicons: TR monogram (Dharma Gothic E Bold) inside a passport-stamp ring,
Sunset Yellow on Night Sky. Small sizes are drawn simplified so they stay sharp."""
import math, os, sys
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser("~"), "DharmaGothicE-Bold.otf")
NAVY, GOLD = "#092A4D", "#F9D635"

def icon(size, detail=True, pad=0.0):
    S = 8  # supersample
    W = size * S
    im = Image.new("RGB", (W, W), NAVY)
    d = ImageDraw.Draw(im)
    c = W / 2
    r_out = W * (0.44 - pad)
    if detail:
        d.ellipse((c - r_out, c - r_out, c + r_out, c + r_out), outline=GOLD, width=int(W * 0.035))
        r_in = r_out * 0.86
        d.ellipse((c - r_in, c - r_in, c + r_in, c + r_in), outline=GOLD, width=int(W * 0.014))
        # small stars at 3 and 9 o'clock between the rings, like the cancellations
        rs = (r_out + r_in) / 2
        for ang in (0, math.pi):
            x, y, s = c + math.cos(ang) * rs, c, W * 0.022
            pts = [(x + math.cos(-math.pi / 2 + i * math.pi / 5) * (s if i % 2 == 0 else s * .45),
                    y + math.sin(-math.pi / 2 + i * math.pi / 5) * (s if i % 2 == 0 else s * .45)) for i in range(10)]
            d.polygon(pts, fill=NAVY)
        tsize = r_in * 1.25
    else:
        d.ellipse((c - r_out, c - r_out, c + r_out, c + r_out), outline=GOLD, width=int(W * 0.075))
        tsize = r_out * 1.3
    f = ImageFont.truetype(FONT, int(tsize))
    d.text((c, c + W * 0.01), "TR", font=f, fill=GOLD, anchor="mm")
    return im.resize((size, size), Image.LANCZOS)

out = os.path.join(ROOT, "assets", "icons")
icon(512).save(os.path.join(out, "icon-512.png"))
icon(512, pad=0.07).save(os.path.join(out, "icon-maskable-512.png"))  # safe zone for Android masks
icon(192).save(os.path.join(out, "icon-192.png"))
icon(180).save(os.path.join(out, "apple-touch-icon.png"))
icon(32, detail=False).save(os.path.join(out, "favicon-32.png"))
icon(48, detail=False).save(os.path.join(out, "favicon-48.png"))
icon(64, detail=False).save(os.path.join(ROOT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print("icons written")
