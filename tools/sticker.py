# usage: sticker.py <id> <url>  -> downloads, circle-crops, writes webp sticker
import sys, urllib.request, io
from PIL import Image, ImageDraw, ImageChops
sid, url = sys.argv[1], sys.argv[2]
raw = urllib.request.urlopen(url).read()
open(f"/tmp/{sid}.png","wb").write(raw)
im = Image.open(io.BytesIO(raw)).convert("RGB")
w,h = im.size
# find the circle bbox: pixels differing from the corner background color
bg = Image.new("RGB", im.size, im.getpixel((5,5)))
diff = ImageChops.difference(im, bg).convert("L").point(lambda p: 255 if p>28 else 0)
bbox = diff.getbbox()
x0,y0,x1,y1 = bbox
cx,cy = (x0+x1)/2,(y0+y1)/2; r = min(x1-x0,y1-y0)/2 - 3
crop = im.crop((int(cx-r),int(cy-r),int(cx+r),int(cy+r))).resize((640,640), Image.LANCZOS)
S=4; mask = Image.new("L",(640*S,640*S),0); ImageDraw.Draw(mask).ellipse((0,0,640*S-1,640*S-1),fill=255)
mask = mask.resize((640,640), Image.LANCZOS)
out = crop.convert("RGBA"); out.putalpha(mask)
out.save(f"assets/stickers/{sid}.webp", "WEBP", quality=86)
print(sid, bbox, "->", "ok")
