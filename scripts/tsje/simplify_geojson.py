import json
import math

def point_line_distance(point, start, end):
    if start == end:
        return math.hypot(point[0] - start[0], point[1] - start[1])
    n = abs((end[1] - start[1]) * point[0] - (end[0] - start[0]) * point[1] + end[0] * start[1] - end[1] * start[0])
    d = math.hypot(end[1] - start[1], end[0] - start[0])
    return n / d

def douglas_peucker(points, epsilon):
    if len(points) <= 2:
        return points
    dmax = 0.0
    index = 0
    for i in range(1, len(points) - 1):
        d = point_line_distance(points[i], points[0], points[-1])
        if d > dmax:
            index = i
            dmax = d
    if dmax > epsilon:
        res1 = douglas_peucker(points[:index + 1], epsilon)
        res2 = douglas_peucker(points[index:], epsilon)
        return res1[:-1] + res2
    else:
        return [points[0], points[-1]]

def simplify_coords(coords, epsilon=0.003):
    # Epsilon of 0.003 degrees is ~300 meters, ideal for municipal boundaries
    if not coords:
        return coords
    if isinstance(coords[0], (int, float)):
        # Round coordinate to 4 decimals
        return [round(coords[0], 4), round(coords[1], 4)]
    elif isinstance(coords[0][0], (int, float)):
        # Ring of points
        simplified = douglas_peucker(coords, epsilon)
        if len(simplified) < 4:
            simplified = coords[::max(1, len(coords)//6)] # preserve shape
            if simplified[0] != simplified[-1]:
                simplified.append(simplified[0])
        return [[round(p[0], 4), round(p[1], 4)] for p in simplified]
    else:
        # MultiPolygon or polygon with holes
        return [simplify_coords(c, epsilon) for c in coords]

def get_centroid(coords):
    # compute approximate center of coordinates
    flat_pts = []
    def flatten(c):
        if not c:
            return
        if isinstance(c[0], (int, float)):
            flat_pts.append(c)
        else:
            for sub in c:
                flatten(sub)
    flatten(coords)
    if not flat_pts:
        return [-23.4, -58.4]
    avg_x = sum(p[0] for p in flat_pts) / len(flat_pts)
    avg_y = sum(p[1] for p in flat_pts) / len(flat_pts)
    return [round(avg_y, 4), round(avg_x, 4)] # [lat, lng]

def main():
    print("Loading paraguay_distritos_enriquecido.geojson...")
    with open("tsje_data/paraguay_distritos_enriquecido.geojson", "r", encoding="utf-8") as f:
        geo = json.load(f)

    print("Simplifying geometries...")
    for feat in geo["features"]:
        geom = feat.get("geometry")
        if geom:
            feat["properties"]["centroid"] = get_centroid(geom["coordinates"])
            geom["coordinates"] = simplify_coords(geom["coordinates"], epsilon=0.003)

    out_file = "tsje_data/paraguay_distritos_optimizado.geojson"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(geo, f, separators=(',', ':'), ensure_ascii=False)

    import os
    size_mb = os.path.getsize(out_file) / (1024 * 1024)
    print(f"Done! Saved {out_file}: {size_mb:.2f} MB")

if __name__ == "__main__":
    main()
