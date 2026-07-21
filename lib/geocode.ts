/* ============================================================
   Address search (forward geocoding) via Photon — Komoot's
   OpenStreetMap-based geocoder, free and keyless, and a better
   typeahead than Nominatim. Results are biased to Da Nang: a
   bounding box constrains them and a center lat/lon ranks the
   closest first. Pure module — no React, browser fetch only.
   Photon usage: https://photon.komoot.io
   ============================================================ */

export type GeocodeResult = {
  /** Stable-ish key for React lists. */
  id: string;
  /** Human-readable one-line label for the suggestion row. */
  label: string;
  lat: number;
  lng: number;
};

const PHOTON_URL = "https://photon.komoot.io/api/";

/* Da Nang bounding box (minLon, minLat, maxLon, maxLat) and the
   Hai Chau-ish center used to rank nearby hits first. */
const DANANG_BBOX = "108.05,15.95,108.35,16.15";
const DANANG_CENTER = { lat: 16.047, lng: 108.22 };

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
};

/* Build a readable label from Photon's address parts, most specific
   first, de-duplicated (Photon often repeats name === city). */
function labelOf(p: Record<string, string | undefined>): string {
  const line = [p.name, p.housenumber, p.street].filter(Boolean).join(" ");
  const area = [p.district, p.city, p.county, p.state]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
  return [line, ...area].filter(Boolean).join(", ");
}

/**
 * Search addresses matching `query`, biased to Da Nang.
 * Pass an AbortSignal so stale in-flight requests can be cancelled
 * when the input changes. Returns [] for blank queries.
 */
export async function searchAddress(
  query: string,
  lang: string,
  signal?: AbortSignal
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    q,
    limit: "5",
    lang: lang === "vi" ? "default" : lang, // Photon has no "vi"; "default" = local names
    lat: String(DANANG_CENTER.lat),
    lon: String(DANANG_CENTER.lng),
    bbox: DANANG_BBOX,
  });

  const res = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };

  return (data.features ?? []).map((f, i) => {
    const [lng, lat] = f.geometry.coordinates;
    return {
      id: `${lat},${lng},${i}`,
      label: labelOf(f.properties) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      lat,
      lng,
    };
  });
}
