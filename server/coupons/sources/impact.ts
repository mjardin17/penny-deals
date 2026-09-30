/**
 * Impact.com (Impact Radius) Media Partner coupon/promo feed.
 *
 * STATUS: scaffold only -- same reasoning as sources/rakuten.ts. Impact's Media
 * Partner API docs live behind an approved-account login, so the endpoint/response
 * shape here isn't verified. fetchCoupons() throws until real docs are in hand.
 *
 * To finish this: sign up at app.impact.com as a partner, get approved for the
 * merchants you care about, pull the real "Coupons" or "ActionInventory" API docs
 * from your account, then replace the body of fetchCoupons().
 */

import { Coupon, CouponSource, SourceState } from "../types";

function isConfigured(): boolean {
  return Boolean(process.env.IMPACT_ACCOUNT_SID && process.env.IMPACT_AUTH_TOKEN);
}

function status(): SourceState {
  return isConfigured() ? "not_implemented" : "not_configured";
}

async function fetchCoupons(): Promise<Coupon[]> {
  throw new Error(
    "Impact.com adapter is a scaffold: endpoint/field mapping needs to be finalized against your approved partner account's real API docs."
  );
}

export const impactSource: CouponSource = { name: "impact", status, fetchCoupons };
