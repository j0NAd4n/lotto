"""Build a heightmap for the play area from AWS Terrarium elevation tiles (open data)."""
import io, json, math, sys, urllib.request
from PIL import Image

S, N, W, E = 37.560, 37.602, 126.948, 127.004
Z = 15
GRID = 192  # samples per side
out = sys.argv[1]
cache = sys.argv[2]

def tile_xy(lat, lon):
    n = 2 ** Z
    x = (lon + 180) / 360 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y

tiles = {}
def tile(tx, ty):
    if (tx, ty) not in tiles:
        p = f"{cache}/{Z}_{tx}_{ty}.png"
        try:
            img = Image.open(p)
        except FileNotFoundError:
            url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png"
            data = urllib.request.urlopen(url, timeout=30).read()
            open(p, "wb").write(data)
            img = Image.open(io.BytesIO(data))
        tiles[(tx, ty)] = img.convert("RGB").load()
    return tiles[(tx, ty)]

def elev(lat, lon):
    x, y = tile_xy(lat, lon)
    tx, ty = int(x), int(y)
    px, py = min(255, int((x - tx) * 256)), min(255, int((y - ty) * 256))
    r, g, b = tile(tx, ty)[px, py]
    return r * 256 + g + b / 256 - 32768

h = []
for j in range(GRID):  # j=0 -> north
    lat = N - (N - S) * j / (GRID - 1)
    for i in range(GRID):
        lon = W + (E - W) * i / (GRID - 1)
        h.append(round(elev(lat, lon), 1))
mn = min(h)
json.dump({"bbox": [S, W, N, E], "grid": GRID, "min": mn, "h": [round(v - mn, 1) for v in h]},
          open(out, "w"), separators=(",", ":"))
print("min", mn, "max", max(h))
