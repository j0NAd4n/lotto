"""Download an area from the OSM API (/api/0.6/map) in tiles and merge into Overpass-style JSON.

Usage: python3 fetch_osm_api.py out.json [S W N E]
"""
import json, sys, time, urllib.request
import xml.etree.ElementTree as ET

S, W, N, E = (37.562, 126.962, 37.592, 127.002) if len(sys.argv) < 6 else map(float, sys.argv[2:6])
NY, NX = 6, 6
nodes, ways = {}, {}
for j in range(NY):
    for i in range(NX):
        s, n = S + (N - S) * j / NY, S + (N - S) * (j + 1) / NY
        w, e = W + (E - W) * i / NX, W + (E - W) * (i + 1) / NX
        url = f"https://api.openstreetmap.org/api/0.6/map?bbox={w:.5f},{s:.5f},{e:.5f},{n:.5f}"
        for attempt in range(4):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "seoul-sky-drone-sim/1.0"})
                root = ET.fromstring(urllib.request.urlopen(req, timeout=120).read())
                break
            except Exception as ex:
                print("retry", i, j, ex); time.sleep(5 * (attempt + 1))
        else:
            sys.exit(f"tile {i},{j} failed")
        for el in root:
            if el.tag == "node":
                nodes[int(el.get("id"))] = {"type": "node", "id": int(el.get("id")), "lat": float(el.get("lat")), "lon": float(el.get("lon"))}
            elif el.tag == "way":
                ways[int(el.get("id"))] = {"type": "way", "id": int(el.get("id")),
                                           "nodes": [int(nd.get("ref")) for nd in el.findall("nd")],
                                           "tags": {t.get("k"): t.get("v") for t in el.findall("tag")}}
        print(f"tile {j*NX+i+1}/{NX*NY}: nodes {len(nodes)} ways {len(ways)}", flush=True)
        time.sleep(1)
json.dump({"elements": list(nodes.values()) + list(ways.values())}, open(sys.argv[1], "w"))
