// Geo & Spatial Coordination helpers for TraceNet Mobile (Objective 3: Map Pinning,
// Nearby Cases Radius Search, and Cebu City 80 Barangays Directory).
// Kept 100% compatible with Web `lib/geo.js`.

export const CEBU_CITY_BARANGAYS = [
  'Adlaon', 'Agsungot', 'Apas', 'Babag', 'Bacayan', 'Banilad', 'Basak Pardo',
  'Basak San Nicolas', 'Binaliw', 'Bonbon', 'Budla-an', 'Buhisan', 'Bulacao',
  'Buot-Taup Pardo', 'Busay', 'Calamba', 'Cambinocot', 'Camputhaw',
  'Capitol Site', 'Carreta', 'Central', 'Cogon Pardo', 'Cogon Ramos',
  'Day-as', 'Duljo', 'Ermita', 'Guadalupe', 'Guba', 'Hippodromo', 'Inayawan',
  'Kalubihan', 'Kalunasan', 'Kamagayan', 'Kasambagan', 'Kinasang-an Pardo',
  'Labangon', 'Lahug', 'Lorega', 'Lusaran', 'Luz', 'Mabini', 'Mabolo',
  'Malubog', 'Mambaling', 'Pahina Central', 'Pahina San Nicolas', 'Pamutan',
  'Pardo', 'Pari-an', 'Paril', 'Pasil', 'Pit-os', 'Pulangbato',
  'Pung-ol-Sibugay', 'Punta Princesa', 'Quiot Pardo', 'Sambag I',
  'Sambag II', 'San Antonio', 'San Jose', 'San Nicolas Central', 'San Roque',
  'Santa Cruz', 'Sapangdaku', 'Sawang Calero', 'Sinsin', 'Sirao', 'Suba',
  'Sudlon I', 'Sudlon II', 'T. Padilla', 'Tabunan', 'Tagbao', 'Talamban',
  'Taptap', 'Tejero', 'Tinago', 'Tisa', 'To-ong Pardo', 'Zapatera',
];

export const BARANGAY_CENTROIDS = [
  { name: 'Labangon', latitude: 10.308, longitude: 123.875 },
  { name: 'Mabolo', latitude: 10.321, longitude: 123.921 },
  { name: 'Guadalupe', latitude: 10.3235, longitude: 123.8789 },
  { name: 'Lahug', latitude: 10.334, longitude: 123.898 },
  { name: 'Talamban', latitude: 10.368, longitude: 123.918 },
  { name: 'Basak San Nicolas', latitude: 10.2995, longitude: 123.8724 },
  { name: 'Pardo', latitude: 10.289, longitude: 123.856 },
  { name: 'Apas', latitude: 10.337, longitude: 123.906 },
  { name: 'Banilad', latitude: 10.345, longitude: 123.914 },
  { name: 'Capitol Site', latitude: 10.3155, longitude: 123.891 },
  { name: 'Tisa', latitude: 10.3025, longitude: 123.8685 },
  { name: 'Mambaling', latitude: 10.293, longitude: 123.878 },
  { name: 'Inayawan', latitude: 10.2735, longitude: 123.854 },
  { name: 'Bulacao', latitude: 10.268, longitude: 123.847 },
  { name: 'Punta Princesa', latitude: 10.304, longitude: 123.871 },
  { name: 'Kasambagan', latitude: 10.329, longitude: 123.911 },
  { name: 'Camputhaw', latitude: 10.317, longitude: 123.898 },
  { name: 'Sambag I', latitude: 10.305, longitude: 123.891 },
  { name: 'Sambag II', latitude: 10.309, longitude: 123.892 },
  { name: 'Ermita', latitude: 10.2925, longitude: 123.896 },
  { name: 'Pasil', latitude: 10.291, longitude: 123.889 },
  { name: 'Suba', latitude: 10.2905, longitude: 123.887 },
  { name: 'Tinago', latitude: 10.3005, longitude: 123.905 },
  { name: 'Tejero', latitude: 10.3045, longitude: 123.908 },
  { name: 'Carreta', latitude: 10.309, longitude: 123.91 },
  { name: 'Busay', latitude: 10.365, longitude: 123.875 },
];

export const CEBU_CITY_CENTER = { latitude: 10.3157, longitude: 123.8854 };

const MAX_ASSIGN_DISTANCE_KM = 3;

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function getBarangayCoords(barangayName = '') {
  const clean = String(barangayName || '')
    .replace(/^brgy\.?\s*/i, '')
    .replace(/^barangay\s*/i, '')
    .trim()
    .toLowerCase();
  if (!clean) return null;
  const match = BARANGAY_CENTROIDS.find(
    (b) => b.name.toLowerCase() === clean || clean.includes(b.name.toLowerCase())
  );
  return match
    ? { latitude: match.latitude, longitude: match.longitude, name: match.name }
    : null;
}

export function inferBarangay({ location, latitude, longitude } = {}) {
  const text = String(location || '').toLowerCase();
  const byName = BARANGAY_CENTROIDS.find((b) => text.includes(b.name.toLowerCase()));
  if (byName) return byName.name;

  if (typeof latitude === 'number' && typeof longitude === 'number') {
    let best = null;
    for (const b of BARANGAY_CENTROIDS) {
      const d = haversineKm(latitude, longitude, b.latitude, b.longitude);
      if (!best || d < best.d) best = { name: b.name, d };
    }
    if (best && best.d <= MAX_ASSIGN_DISTANCE_KM) return best.name;
  }
  return 'Unassigned';
}

export function resolveReportCoords(report = {}) {
  if (typeof report.latitude === 'number' && typeof report.longitude === 'number') {
    return { latitude: report.latitude, longitude: report.longitude };
  }
  const byBrgy = getBarangayCoords(report.barangay || report.location);
  if (byBrgy) return { latitude: byBrgy.latitude, longitude: byBrgy.longitude };
  return null;
}

export function filterNearbyCases(centerLat, centerLng, reports = [], radiusKm = 5) {
  if (typeof centerLat !== 'number' || typeof centerLng !== 'number') return [];
  const results = [];
  for (const r of reports) {
    const coords = resolveReportCoords(r);
    if (!coords) continue;
    const distanceKm =
      Math.round(haversineKm(centerLat, centerLng, coords.latitude, coords.longitude) * 10) /
      10;
    if (radiusKm <= 0 || distanceKm <= radiusKm) {
      results.push({
        ...r,
        latitude: coords.latitude,
        longitude: coords.longitude,
        distanceKm,
      });
    }
  }
  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

export function computeHotspots(reports = []) {
  const counts = new Map();
  for (const r of reports) {
    const brgy =
      r.barangay && r.barangay !== 'Unassigned'
        ? String(r.barangay).replace(/^Brgy\.?\s*/i, '')
        : inferBarangay({
            location: r.location,
            latitude: r.latitude,
            longitude: r.longitude,
          });
    if (!brgy || brgy === 'Unassigned') continue;
    counts.set(brgy, (counts.get(brgy) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, cases]) => ({ name, cases }));
}

