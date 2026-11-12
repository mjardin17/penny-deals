/**
 * Shapes for the Pokémon drop feed. Every field comes from a named source; nothing here is inferred.
 */

import type { DigestHit, SourceStatus } from "../../digest/types";

export type { SourceStatus } from "../../digest/types";

/** A Best Buy store that Best Buy's own API says has the item in stock. */
export interface BestBuyStore {
  storeId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  /** Miles from the ZIP that was asked about, as Best Buy reports it. Null if Best Buy left it out. */
  distanceMiles: number | null;
  /** Best Buy's own "may soon be out of stock" flag. */
  lowStock: boolean;
}

export interface BestBuyItem {
  sku: number;
  name: string;
  url: string | null;
  salePrice: number | null;
  regularPrice: number | null;
  onlineAvailability: boolean;
  inStoreAvailability: boolean;
  /** Best Buy's ordering status, as sent (for example "Available" or "PreOrder"). */
  orderable: string | null;
  releaseDate: string | null;
  /**
   * Stores near the ZIP that have it, from Best Buy's store-availability endpoint.
   * null means it was not checked (not sold in stores, over the per-refresh limit, or the check failed).
   */
  nearbyStores: BestBuyStore[] | null;
  /** Why the store check failed, when it did. */
  storeCheckError?: string;
}

export interface BestBuyResult {
  status: SourceStatus;
  items: BestBuyItem[];
}

export interface PokemonSet {
  id: string;
  name: string;
  series: string;
  /** YYYY-MM-DD as pokemontcg.io publishes it. */
  releaseDate: string;
  upcoming: boolean;
  logo: string | null;
}

export interface ReleasesResult {
  status: SourceStatus;
  sets: PokemonSet[];
}

export const SIGHTING_STORES = ["walmart", "target", "bestBuy", "gameStop", "costco", "samsClub", "pokemonCenter", "other"] as const;
export type SightingStore = (typeof SIGHTING_STORES)[number];

export const SIGHTING_STATUSES = ["on_shelf", "low", "behind_counter", "sold_out"] as const;
export type SightingStatus = (typeof SIGHTING_STATUSES)[number];

/** A report typed in by someone using this app. Unverified by design, and labelled that way everywhere. */
export interface Sighting {
  id: string;
  createdAt: string;
  zip: string;
  store: SightingStore;
  location: string;
  product: string;
  status: SightingStatus;
  note: string;
}

export interface DropFeedResult {
  zip: string;
  fetchedAt: string;
  bestBuy: BestBuyItem[];
  /** Pokémon TCG posts from Reddit and Slickdeals, the same ones the Deals screen uses. */
  community: DigestHit[];
  sightings: Sighting[];
  releases: PokemonSet[];
  /** Every source consulted, including the ones that failed or were skipped. */
  sources: SourceStatus[];
  stale?: boolean;
  staleReason?: string;
}
