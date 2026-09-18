export type StoreKey = "homeDepot" | "lowes" | "bestBuy" | "walmart" | "target" | "gameStop";

export type HitKind = "penny" | "clearance" | "pokemon";

/** A post exactly as a source published it. Nothing here is inferred. */
export interface RawPost {
  source: string;
  id: string;
  title: string;
  url: string;
  body: string;
  publishedAt: Date;
  score?: number;
}

export interface NearbyStore {
  store: StoreKey;
  name: string;
  address: string;
  lat: number;
  lon: number;
  miles: number;
}

export interface DigestHit {
  post: RawPost;
  kind: HitKind;
  store: StoreKey | null;
  price: number | null;
  inStore: boolean;
  nearest: NearbyStore | null;
  action: string;
  resaleNote?: string;
}

export type SourceState = "ok" | "failed" | "skipped";

export interface SourceStatus {
  name: string;
  state: SourceState;
  detail: string;
}
