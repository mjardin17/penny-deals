/**
 * Pokémon sightings typed in by people using this app, kept in a JSON file
 * (data/pokemon-sightings.json, not committed). Reports are unverified and expire after two days.
 * Writes go through one queue so two reports at once can't overwrite each other.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { Sighting, SIGHTING_STATUSES, SIGHTING_STORES, SightingStatus, SightingStore } from "./types";

const KEEP_MS = 48 * 3600_000;
const MAX_KEPT = 500;
const ZIP = /^\d{5}$/;

export function defaultSightingsPath(): string {
  return process.env.POKEMON_SIGHTINGS_FILE || path.join(process.cwd(), "data", "pokemon-sightings.json");
}

/** Trims, removes control characters and caps the length. */
function clean(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export type NewSighting = Omit<Sighting, "id" | "createdAt">;

/** Returns the cleaned report, or a message saying what is wrong with it. */
export function validateSighting(raw: any): NewSighting | string {
  if (!raw || typeof raw !== "object") return "Send the report as JSON.";
  const zip = clean(raw.zip, 5);
  if (!ZIP.test(zip)) return "ZIP must be 5 digits.";
  if (!SIGHTING_STORES.includes(raw.store)) return `store must be one of: ${SIGHTING_STORES.join(", ")}.`;
  if (!SIGHTING_STATUSES.includes(raw.status)) return `status must be one of: ${SIGHTING_STATUSES.join(", ")}.`;
  const product = clean(raw.product, 80);
  if (product.length < 3) return "Say what you saw (at least 3 characters).";
  const location = clean(raw.location, 80);
  if (location.length < 2) return "Say which store (town or street).";
  return { zip, store: raw.store as SightingStore, status: raw.status as SightingStatus, product, location, note: clean(raw.note, 200) };
}

/** Reports from the same 3-digit ZIP area (roughly the same region), newest first. */
export function nearbySightings(all: Sighting[], zip: string, now: number): Sighting[] {
  return all
    .filter((s) => s.zip.slice(0, 3) === zip.slice(0, 3) && now - new Date(s.createdAt).getTime() < KEEP_MS)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createSightingsStore(filePath = defaultSightingsPath(), now: () => number = Date.now) {
  let queue: Promise<unknown> = Promise.resolve();

  async function readAll(): Promise<Sighting[]> {
    try {
      const parsed = JSON.parse(await readFile(filePath, "utf8"));
      return Array.isArray(parsed) ? parsed.filter((s) => s && typeof s.id === "string" && typeof s.createdAt === "string" && typeof s.zip === "string") : [];
    } catch {
      return [];
    }
  }

  function fresh(all: Sighting[]): Sighting[] {
    const t = now();
    return all.filter((s) => t - new Date(s.createdAt).getTime() < KEEP_MS).slice(-MAX_KEPT);
  }

  async function writeAll(all: Sighting[]): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(all, null, 2) + "\n", "utf8");
    await rename(tmp, filePath);
  }

  async function add(report: NewSighting): Promise<Sighting> {
    const run = queue.then(async () => {
      const sighting: Sighting = { id: randomUUID(), createdAt: new Date(now()).toISOString(), ...report };
      await writeAll([...fresh(await readAll()), sighting]);
      return sighting;
    });
    queue = run.catch(() => undefined);
    return run;
  }

  async function near(zip: string): Promise<Sighting[]> {
    return nearbySightings(await readAll(), zip, now());
  }

  return { add, near };
}

export type SightingsStore = ReturnType<typeof createSightingsStore>;
