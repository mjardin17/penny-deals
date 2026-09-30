/**
 * Combines every configured coupon source into one list. Unlike the AI orchestrator
 * (first-success-wins), coupons UNION across sources -- more real coupons is strictly
 * better, as long as none of them are invented. A source that isn't configured or
 * isn't implemented yet is skipped, not treated as a failure.
 */

import { internalSource } from "./internal";
import { rakutenSource } from "./sources/rakuten";
import { impactSource } from "./sources/impact";
import { cjSource } from "./sources/cj";
import { sovrnSource } from "./sources/sovrn";
import { Coupon, CouponSource, SourceStatus } from "./types";

export const liveSources: CouponSource[] = [internalSource, rakutenSource, impactSource, cjSource, sovrnSource];

export interface AggregateResult {
  coupons: Coupon[];
  sources: SourceStatus[];
}

export async function aggregateCoupons(sources: CouponSource[] = liveSources): Promise<AggregateResult> {
  const coupons: Coupon[] = [];
  const statuses: SourceStatus[] = [];

  for (const source of sources) {
    const state = source.status();
    if (state !== "ok") {
      statuses.push({ source: source.name, state, detail: sourceDetail(state), count: 0 });
      continue;
    }
    try {
      const fetched = await source.fetchCoupons();
      coupons.push(...fetched);
      statuses.push({ source: source.name, state: "ok", detail: `${fetched.length} coupon(s)`, count: fetched.length });
    } catch (err) {
      statuses.push({
        source: source.name,
        state: "error",
        detail: err instanceof Error ? err.message : String(err),
        count: 0,
      });
    }
  }

  return { coupons, sources: statuses };
}

function sourceDetail(state: SourceStatus["state"]): string {
  if (state === "not_configured") return "No API credentials set.";
  if (state === "not_implemented") return "Credentials set, but the endpoint isn't wired up yet.";
  return "";
}
