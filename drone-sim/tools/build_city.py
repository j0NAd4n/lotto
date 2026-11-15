"""Convert an Overpass JSON dump (OpenStreetMap) into the compact city.json used by the game.

Usage: python3 build_city.py seoul_osm.json ../data/city.json

Coordinates are local metres (x = east, y = north) from ORIGIN, stored as integer decimetres.
Map data (c) OpenStreetMap contributors, ODbL.
"""
import json, math, re, sys

ORIGIN = (37.5720, 126.9769)  # Gwanghwamun Square
LAT0 = math.radians(ORIGIN[0])
MX = 111320.0 * math.cos(LAT0)
MY = 110540.0

ROAD_W = {"motorway": 22, "trunk": 20, "primary": 18, "secondary": 13, "tertiary": 10,
          "residential": 6, "unclassified": 6, "pedestrian": 8}


def local(lat, lon):
    return ((lon - ORIGIN[1]) * MX, (lat - ORIGIN[0]) * MY)


def num(v):
    if v is None:
        return None
    m = re.match(r"\s*([0-9]+(?:\.[0-9]+)?)", str(v))
    return float(m.group(1)) if m else None


def area(pts):
    a = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        a += x1 * y2 - x2 * y1
    return a / 2


def simplify(pts, tol=0.4):
    """Drop nearly collinear / duplicate points to keep the mesh small."""
    out = []
    for p in pts:
        if out and math.dist(out[-1], p) < tol:
            continue
        out.append(p)
    return out


def height_of(tags, footprint):
    h = num(tags.get("height")) or num(tags.get("building:height"))
    lv = num(tags.get("building:levels"))
    if h is None and lv is not None:
        h = lv * 3.3 + 1.0
    if h is None:
        kind = tags.get("building", "yes")
        if kind in ("house", "hut", "shed", "garage", "garages", "roof", "kiosk", "toilets"):
            h = 4.5
        elif kind in ("apartments",):
            h = 35
        elif kind in ("temple", "shrine", "church") or "historic" in tags:
            h = 9
        elif footprint < 120:
            h = 5
        elif footprint < 400:
            h = 9
        elif footprint < 1500:
            h = 15
        else:
            h = 22
    mh = num(tags.get("min_height"))
    ml = num(tags.get("building:min_level"))
    if mh is None and ml is not None:
        mh = ml * 3.3
    return max(2.5, min(h, 600)), max(0.0, mh or 0.0)


def flat(pts):
    r = []
    for x, y in pts:
        r += [round(x * 10), round(y * 10)]
    return r


def main(src, dst):
    data = json.load(open(src))
    nodes = {e["id"]: (e["lat"], e["lon"]) for e in data["elements"] if e["type"] == "node"}
    out = {"origin": list(ORIGIN), "scale": 10, "b": [], "roads": [], "water": [], "rivers": [], "green": [],
           "attribution": "Map data (c) OpenStreetMap contributors, ODbL"}
    for e in data["elements"]:
        if e["type"] != "way":
            continue
        tags = e.get("tags", {})
        pts = [local(*nodes[n]) for n in e["nodes"] if n in nodes]
        if len(pts) < 2:
            continue
        closed = e["nodes"][0] == e["nodes"][-1]
        if "building" in tags and closed:
            ring = simplify(pts[:-1])
            if len(ring) < 3:
                continue
            a = area(ring)
            if abs(a) < 8:
                continue
            if a < 0:  # store counter-clockwise
                ring.reverse()
            h, mh = height_of(tags, abs(a))
            kind = 1 if ("historic" in tags or tags.get("building") in ("temple", "shrine", "palace")
                         or (tags.get("roof:shape") in ("hipped", "gabled") and h < 12)) else 0
            out["b"].append([round(h * 10), round(mh * 10), kind] + flat(ring))
        elif tags.get("highway") in ROAD_W:
            out["roads"].append([ROAD_W.get(tags["highway"], 6)] + flat(simplify(pts, 1.0)))
        elif tags.get("waterway") in ("river", "stream", "canal", "drain", "ditch"):
            out["rivers"].append([12 if tags["waterway"] in ("river", "stream", "canal") else 4] + flat(pts))
        elif closed and (tags.get("natural") == "water"):
            out["water"].append(flat(simplify(pts[:-1], 1.0)))
        elif closed and (tags.get("leisure") == "park" or tags.get("landuse") in ("grass", "forest") or tags.get("natural") == "wood"):
            out["green"].append(flat(simplify(pts[:-1], 1.0)))
    json.dump(out, open(dst, "w"), separators=(",", ":"))
    print({k: len(v) for k, v in out.items() if isinstance(v, list)})


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
