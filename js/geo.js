// Location check-in. Uses the site's boundary polygon from the Public Lands Directory
// (point-in-polygon with a small buffer for entrance roads and lots), and falls back to
// the bounding box or a radius around the site's point when the boundary can't load.
(function (global) {
  const BUFFER_KM = 1.0;
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const BOUNDS = new Map();

  function haversine(a, b) {
    const dLa = rad(b.lat - a.lat), dLo = rad(b.lng - a.lng);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  // Distance from a point to the site's bounding box (0 inside), else to its center point.
  function distanceKm(pos, s) {
    if (s.bbox) {
      const [w, so, e, n] = s.bbox;
      const lat = Math.min(Math.max(pos.lat, so), n), lng = Math.min(Math.max(pos.lng, w), e);
      return haversine(pos, { lat, lng });
    }
    return s.lat != null ? haversine(pos, { lat: s.lat, lng: s.lng }) : Infinity;
  }
  const miles = (km) => { const m = km * 0.621371; return m < 10 ? `${m.toFixed(1)} mi` : `${Math.round(m).toLocaleString()} mi`; };

  function locate() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("unsupported"));
      navigator.geolocation.getCurrentPosition((p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }), reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    });
  }

  function boundaryURL(s) { return `https://directory.labs.trlibrary.com/boundaries/${s.slug}.geojson`; }
  function prefetchBoundary(s, url) {
    if (!BOUNDS.has(s.id)) BOUNDS.set(s.id, fetch(url || boundaryURL(s)).then((r) => (r.ok ? r.json() : null)).catch(() => null));
    return BOUNDS.get(s.id);
  }

  function rings(gj) {
    const out = [];
    const add = (geom) => {
      if (!geom) return;
      if (geom.type === "Polygon") out.push(geom.coordinates);
      else if (geom.type === "MultiPolygon") geom.coordinates.forEach((p) => out.push(p));
      else if (geom.type === "GeometryCollection") geom.geometries.forEach(add);
    };
    if (gj.type === "FeatureCollection") gj.features.forEach((f) => add(f.geometry));
    else if (gj.type === "Feature") add(gj.geometry);
    else add(gj);
    return out;
  }
  function inRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // Point-to-segment distance on a local equirectangular projection (km).
  function edgeKm(pos, ring) {
    const kx = 111.32 * Math.cos(rad(pos.lat)), ky = 110.57;
    let best = Infinity;
    for (let i = 1; i < ring.length; i++) {
      const ax = (ring[i - 1][0] - pos.lng) * kx, ay = (ring[i - 1][1] - pos.lat) * ky;
      const bx = (ring[i][0] - pos.lng) * kx, by = (ring[i][1] - pos.lat) * ky;
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
      const px = ax + t * dx, py = ay + t * dy;
      best = Math.min(best, Math.hypot(px, py));
    }
    return best;
  }

  async function check(pos, s) {
    const gj = await prefetchBoundary(s);
    const polys = gj ? rings(gj) : [];
    if (polys.length) {
      let km = Infinity;
      for (const poly of polys) {
        const [outer, ...holes] = poly;
        if (inRing(pos.lng, pos.lat, outer) && !holes.some((h) => inRing(pos.lng, pos.lat, h))) return { inside: true, km: 0, method: "boundary" };
        km = Math.min(km, edgeKm(pos, outer));
      }
      return { inside: km <= BUFFER_KM, km, method: "boundary" };
    }
    const km = distanceKm(pos, s);
    return { inside: s.bbox ? km <= 2 : km <= 5, km, method: s.bbox ? "bbox" : "point" };
  }

  global.Geo = { locate, check, distanceKm, miles, prefetchBoundary };
})(window);
