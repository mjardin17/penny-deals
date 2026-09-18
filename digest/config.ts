import { StoreKey } from "./types";

export interface StoreDef {
  label: string;
  /** Matches the retailer in post title/body. */
  textPattern: RegExp;
  /** OpenStreetMap `brand` tag value. */
  osmBrand: string;
}

export const STORES: Record<StoreKey, StoreDef> = {
  homeDepot: { label: "Home Depot", textPattern: /home ?depot|homedepot\.com|\bHD\b/i, osmBrand: "The Home Depot" },
  lowes: { label: "Lowe's", textPattern: /lowe'?s\b|lowes\.com/i, osmBrand: "Lowe's" },
  bestBuy: { label: "Best Buy", textPattern: /best ?buy|bestbuy\.com|\bBBY\b/i, osmBrand: "Best Buy" },
  walmart: { label: "Walmart", textPattern: /wal-?mart|walmart\.com/i, osmBrand: "Walmart" },
  target: { label: "Target", textPattern: /\btarget\b(?!ed)|target\.com/i, osmBrand: "Target" },
  gameStop: { label: "GameStop", textPattern: /game ?stop|gamestop\.com/i, osmBrand: "GameStop" },
};

/** Stores whose penny drops and clearance the digest tracks. */
export const PENNY_STORES: StoreKey[] = ["homeDepot", "lowes", "bestBuy", "walmart"];

/** Stores worth checking for Pokémon TCG restocks. */
export const POKEMON_STORES: StoreKey[] = ["walmart", "target", "bestBuy", "gameStop"];

export const SLICKDEALS_QUERIES = [
  "home depot",
  "home depot clearance",
  "lowes",
  "best buy",
  "walmart",
  "walmart clearance",
  "penny",
  "pokemon",
  "pokemon tcg",
];

export interface DigestConfig {
  zip: string;
  radiusMiles: number;
  lookbackHours: number;
  outDir: string;
  cacheDir: string;
  redditSubs: string[];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, argv: string[] = process.argv.slice(2)): DigestConfig {
  const arg = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i !== -1 ? argv[i + 1] : undefined;
  };
  const zip = arg("zip") ?? env.DIGEST_ZIP ?? "";
  if (!/^\d{5}$/.test(zip)) {
    throw new Error(`Set a 5-digit ZIP with --zip 12345 or DIGEST_ZIP (got "${zip}").`);
  }
  const radiusMiles = Number(arg("radius") ?? env.DIGEST_RADIUS_MILES ?? 40);
  const lookbackHours = Number(arg("hours") ?? env.DIGEST_LOOKBACK_HOURS ?? 36);
  if (!(radiusMiles > 0 && radiusMiles <= 150)) throw new Error("Radius must be 1-150 miles.");
  if (!(lookbackHours > 0 && lookbackHours <= 168)) throw new Error("Lookback must be 1-168 hours.");

  return {
    zip,
    radiusMiles,
    lookbackHours,
    outDir: arg("out") ?? env.DIGEST_OUT_DIR ?? "digests",
    cacheDir: env.DIGEST_CACHE_DIR ?? "digest/.cache",
    redditSubs: (env.DIGEST_REDDIT_SUBS ?? "pennyhunting,PokemonRestocks")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^\w{2,21}$/.test(s)),
  };
}

export const USER_AGENT = "PennyDealsDigest/0.1 (personal daily deal digest)";
