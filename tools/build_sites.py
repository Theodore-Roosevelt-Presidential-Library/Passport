#!/usr/bin/env python3
"""Build data/sites.json from the Public Lands Directory.

Source: https://directory.labs.trlibrary.com/api/directory.json (TRPL's own
directory, synced nightly from the NPS Data API). Keeps hand-written fields
from data/curated.json, writes duotone photo badges for units without an
illustrated sticker.

    python3 tools/build_sites.py [--directory /path/directory.json] [--badges]
"""
import argparse, concurrent.futures as cf, io, json, os, re, sys, urllib.request
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRECTORY_URL = "https://directory.labs.trlibrary.com/api/directory.json"
SITE = "https://directory.labs.trlibrary.com"

# Regions follow the NPS Passport book.
REGIONS = [
    ("north-atlantic", "North Atlantic", ["ME", "NH", "VT", "MA", "RI", "CT", "NY"], "#092A4D"),
    ("mid-atlantic", "Mid-Atlantic", ["PA", "NJ", "DE", "MD", "VA", "WV"], "#1B4532"),
    ("national-capital", "National Capital", ["DC"], "#25282A"),
    ("southeast", "Southeast", ["NC", "SC", "GA", "FL", "AL", "MS", "TN", "KY", "PR", "VI"], "#092A4D"),
    ("midwest", "Midwest", ["OH", "IN", "IL", "MI", "WI", "MN", "IA", "MO", "ND", "SD", "NE", "KS"], "#1B4532"),
    ("southwest", "Southwest", ["AZ", "NM", "TX", "OK", "AR", "LA"], "#25282A"),
    ("rocky-mountain", "Rocky Mountain", ["CO", "UT", "WY", "MT"], "#092A4D"),
    ("western", "Western", ["CA", "NV", "HI", "GU", "AS", "MP"], "#1B4532"),
    ("pacific-northwest", "Pacific Northwest & Alaska", ["WA", "OR", "ID", "AK"], "#25282A"),
]
STATE_REGION = {st: r[0] for r in REGIONS for st in r[2]}
ART_DESIGNATIONS = {"National Park", "National Park & Preserve"}

SUFFIXES = sorted([
    "National Historical Park and Preserve", "National Park & Preserve", "National Monument & Preserve",
    "National Monument and Preserve", "National Monument and Historic Shrine", "National Historical Park",
    "National Historic Site", "National Historic Trail", "National Scenic Trail", "National Geologic Trail",
    "National Battlefield Park", "National Battlefield Site", "National Battlefield", "National Military Park",
    "National Recreation Area", "National River and Recreation Area", "National Scenic Riverways",
    "National Scenic River", "National Recreational River", "National Wild and Scenic River", "Wild and Scenic River",
    "National Seashore", "National Lakeshore", "National Preserve", "National Reserve", "National Memorial",
    "National Monument", "National Park", "National Historic Area", "National Historical Reserve",
    "National Heritage Area", "Memorial Parkway", "National Parkway", "Parkway", "National River",
], key=len, reverse=True)

MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]


def nice_date(iso):
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{MONTHS[m - 1]} {d}, {y}"


def short_name(name):
    for suf in SUFFIXES:
        if name.endswith(" " + suf) and len(name) > len(suf) + 3:
            return name[: -len(suf)].strip(" ,")
    return name


def tr_line(site):
    """Turn the directory's reviewed Roosevelt connection into one readable sentence."""
    conns = [c for c in site.get("trConnections") or [] if c.get("reviewed")]
    if not conns:
        return None
    order = {"protected": 0, "executive-action": 1, "visited": 2}
    c = sorted(conns, key=lambda c: order.get(c["type"], 9))[0]
    t = c["text"]
    m = re.match(r"As President, Theodore Roosevelt set aside (.+?) \((\d{4}-\d\d-\d\d)\)\.?$", t)
    if m:
        what, when = m.groups()
        return (f"T.R. set this place aside as President on {nice_date(when)}." if what == "it"
                else f"As President, T.R. set aside {what} on {nice_date(when)}.")
    m = re.match(r"As President, Theodore Roosevelt signed the act creating (.+?) \((\d{4}-\d\d-\d\d)\)\.?$", t)
    if m:
        what, when = m.groups()
        return (f"T.R. signed the act creating it on {nice_date(when)}." if what == "it"
                else f"T.R. signed the act creating {what} on {nice_date(when)}.")
    m = re.match(r"Day by Day places T\.R\. at (.+?) on (\d+) days? between (\d{4})-\d\d-\d\d and (\d{4})-\d\d-\d\d\.?$", t)
    if m:
        place, days, y1, y2 = m.groups()
        span = y1 if y1 == y2 else f"{y1} to {y2}"
        return f"T.R. was here: his day-by-day record places him at {place} on {int(days):,} {'day' if days == '1' else 'days'}, {span}."
    return t


def build(directory, curated):
    sites = []
    used = set()
    for x in directory["sites"]:
        nps = [m for m in x["managedBy"] if m["code"] == "NPS"]
        if not nps:
            continue
        code = (nps[0].get("unitCode") or "").lower()
        sid = code if code and code not in used else x["slug"]
        used.add(sid)
        states = x.get("states") or []
        region = next((STATE_REGION[s] for s in states if s in STATE_REGION), None)
        if not region:
            print("no region:", x["slug"], states, file=sys.stderr)
            continue
        loc = x.get("location") or {}
        cover = x.get("cover") or {}
        e = {
            "id": sid,
            "slug": x["slug"],
            "name": x["name"],
            "short": short_name(x["name"]),
            "designation": x["designation"],
            "agency": "NPS",
            "region": region,
            "states": states,
            "place": " · ".join(states) if len(states) > 1 else (x.get("stateNames") or states)[0],
            "lat": round(loc["lat"], 5) if loc.get("lat") is not None else None,
            "lng": round(loc["lon"], 5) if loc.get("lon") is not None else None,
            "bbox": [round(v, 4) for v in x["bbox"]] if x.get("bbox") else None,
            "tr": tr_line(x),
            "trTypes": x.get("trTypes") or [],
            "url": (x.get("links") or {}).get("official"),
            "directory": f"{SITE}/sites/{x['slug']}/",
            "photo": {k: cover.get(k) for k in ("url", "credit", "license", "licenseUrl", "filePage")} if cover.get("url") else None,
            "art": x["designation"] in ART_DESIGNATIONS or bool(x.get("trConnections")),
        }
        c = curated.get(sid) or {}
        e.update({k: v for k, v in c.items() if not k.startswith("_")})
        sites.append(e)
    sites.sort(key=lambda s: s["short"].lower())
    return sites


def badge(site, out_dir):
    """Circular full-color badge from the unit's public-domain photo, with a paper rim like a sticker."""
    from PIL import Image, ImageDraw, ImageEnhance, ImageOps
    path = os.path.join(out_dir, f"{site['id']}.webp")
    if os.path.exists(path):
        return site["id"], "cached"
    url = site["photo"]["url"]
    req = urllib.request.Request(url, headers={"User-Agent": "TRPLPassport/1.0"})
    raw = urllib.request.urlopen(req, timeout=60).read()
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    im.draft("RGB", (900, 900))
    w, h = im.size
    s = min(w, h)
    size = 360
    im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((size, size), Image.LANCZOS)
    im = ImageOps.autocontrast(im, cutoff=0.5)
    im = ImageEnhance.Color(im).enhance(1.15)
    d = ImageDraw.Draw(im)
    d.ellipse((4, 4, size - 5, size - 5), outline="#F4F1EA", width=12)
    d.ellipse((2, 2, size - 3, size - 3), outline="#092A4D", width=4)
    d.ellipse((15, 15, size - 16, size - 16), outline="#092A4D", width=2)
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    out = im.convert("RGBA")
    out.putalpha(mask.resize((size, size), Image.LANCZOS))
    out.save(path, "WEBP", quality=80)
    return site["id"], "ok"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--directory")
    ap.add_argument("--badges", action="store_true")
    a = ap.parse_args()
    if a.directory:
        directory = json.load(open(a.directory))
    else:
        directory = json.load(urllib.request.urlopen(DIRECTORY_URL))
    curated = json.load(open(os.path.join(ROOT, "data", "curated.json")))
    sites = build(directory, curated)

    stickers = os.path.join(ROOT, "assets", "stickers")
    badges = os.path.join(ROOT, "assets", "badges")
    os.makedirs(badges, exist_ok=True)
    if a.badges:
        todo = [s for s in sites if s["photo"] and not os.path.exists(os.path.join(stickers, f"{s['id']}.webp"))]
        with cf.ThreadPoolExecutor(8) as ex:
            for fut in cf.as_completed([ex.submit(badge, s, badges) for s in todo]):
                try:
                    fut.result()
                except Exception as err:  # keep going; the app falls back to a plain badge
                    print("badge failed:", err, file=sys.stderr)
    for s in sites:
        if os.path.exists(os.path.join(stickers, f"{s['id']}.webp")):
            s["sticker"] = f"assets/stickers/{s['id']}.webp"
            s["stickerKind"] = "art"
        elif os.path.exists(os.path.join(badges, f"{s['id']}.webp")):
            s["sticker"] = f"assets/badges/{s['id']}.webp"
            s["stickerKind"] = "photo"
        else:
            s["sticker"] = None
            s["stickerKind"] = "none"

    data = {
        "version": 2,
        "generated": date.today().isoformat(),
        "source": DIRECTORY_URL,
        "regions": [{"id": r[0], "name": r[1], "states": " · ".join(r[2]), "color": r[3]} for r in REGIONS],
        "sites": sites,
    }
    with open(os.path.join(ROOT, "data", "sites.json"), "w") as f:
        json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
    kinds = {}
    for s in sites:
        kinds[s["stickerKind"]] = kinds.get(s["stickerKind"], 0) + 1
    print(f"{len(sites)} sites", kinds)


if __name__ == "__main__":
    main()
