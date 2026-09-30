/**
 * Sovrn Commerce (formerly VigLink) coupon/deals feed.
 *
 * STATUS: scaffold only -- same reasoning as sources/rakuten.ts. Sovrn's API docs
 * require an approved account to access, so the endpoint/response shape here isn't
 * verified. fetchCoupons() throws until real docs are in hand.
 *
 * To finish this: sign up for Sovrn Commerce, get approved, pull the real API docs
 * from your account dashboard, then replace the body of fetchCoupons().
 */

import { Coupon, CouponSource, SourceState } from "../types";

function isConfigured(): boolean {
  return Boolean(process.env.SOVRN_API_KEY);
}

function status(): SourceState {
  return isConfigured() ? "not_implemented" : "not_configured";
}

async function fetchCoupons(): Promise<Coupon[]> {
  throw new Error(
    "Sovrn adapter is a scaffold: endpoint/field mapping needs to be finalized against your approved account's real API docs."
  );
}

export const sovrnSource: CouponSource = { name: "sovrn", status, fetchCoupons };
