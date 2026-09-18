/**
 * ZIP -> coordinates (zippopotam.us) and real store locations (OpenStreetMap via Overpass).
 * Store lists are cached per ZIP/radius for a week; branches rarely move.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { STORES, USER_AGENT } from "./config";
import { NearbyStore, StoreKey } from "./types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EARTH_RADIUS_MI = 3958.8;
const METERS_PER_MILE = 1609.344;

export interface LatLon {
  lat: number;
  lon: number;
}

export function haversineMiles(a: LatLon, b: LatLon): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h));
}

export async function geocodeZip(zip: string): Promise<LatLon & { place: string }> {
  const res = await fetch(`https://api.zippopotam.us/us/${zip}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`ZIP ${zip} lookup failed: HTTP ${res.status}`);
  const json = await res.json();
  const place = json?.places?.[0];
  if (!place) throw new Error(`ZIP ${zip} not found`);
  return {
    lat: Number(place.latitude),
    lon: Number(place.longitude),
    place: `${place["place name"]}, ${place["state abbreviation"]}`,
  };
}

function formatAddress(tags: Record<string, string>): string {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const city = tags["addr:city"];
  return [street, city].filter(Boolean).join(", ") || "address not listed in OpenStreetMap";
}

/** Maps Overpass elements to stores, dropping pharmacy/fuel sub-locations. Exported for tests. */
export function parseOverpassStores(elements: any[], origin: LatLon): NearbyStore[] {
  const byBrand = new Map(Object.entries(STORES).map(([key, def]) => [def.osmBrand, key as StoreKey]));
  const stores: NearbyStore[] = [];
  for (const el of elements) {
    const tags: Record<string, string> = el.tags ?? {};
    const key = byBrand.get(tags.brand);
    if (!key) continue;
    if (/pharmacy|fuel|gas|vision|auto care/i.test(tags.name ?? "") || tags.amenity === "pharmacy" || tags.amenity === "fuel") continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    stores.push({
      store: key,
      name: tags.name ?? STORES[key].label,
      address: formatAddress(tags),
      lat,
      lon,
      miles: Math.round(haversineMiles(origin, { lat, lon }) * 10) / 10,
    });
  }
  return stores.sort((a, b) => a.miles - b.miles);
}

async function queryOverpass(origin: LatLon, radiusMiles: number): Promise<NearbyStore[]> {
  const brands = Object.values(STORES)
    .map((s) => s.osmBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const meters = Math.round(radiusMiles * METERS_PER_MILE);
  const query = `[out:json][timeout:40];nwr["brand"~"^(${brands})$"](around:${meters},${origin.lat},${origin.lon});out center tags;`;
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }).toString(),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const json = await res.json();
  return parseOverpassStores(json.elements ?? [], origin);
}

export async function loadNearbyStores(
  zip: string,
  origin: LatLon,
  radiusMiles: number,
  cacheDir: string
): Promise<{ stores: NearbyStore[]; fromCache: boolean }> {
  const file = path.join(cacheDir, `stores-${zip}-${radiusMiles}mi.json`);
  try {
    const cached = JSON.parse(await readFile(file, "utf8"));
    if (Date.now() - cached.savedAt < CACHE_TTL_MS && Array.isArray(cached.stores)) {
      return { stores: cached.stores, fromCache: true };
    }
  } catch {
    // No usable cache; fetch below.
  }
  const stores = await queryOverpass(origin, radiusMiles);
  await mkdir(cacheDir, { recursive: true });
  await writeFile(file, JSON.stringify({ savedAt: Date.now(), stores }, null, 2));
  return { stores, fromCache: false };
}

export function nearestOf(stores: NearbyStore[], key: StoreKey): NearbyStore | null {
  return stores.find((s) => s.store === key) ?? null;
}
