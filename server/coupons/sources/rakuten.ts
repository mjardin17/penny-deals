/**
 * Rakuten Advertising publisher coupon/deals feed.
 *
 * STATUS: scaffold only. Rakuten's API docs are gated behind an approved publisher
 * account (developers.rakutenadvertising.com requires login to see endpoint specs),
 * so the exact endpoint and response field names below are NOT verified against real
 * docs -- rather than fabricate confidence in an unverified shape, fetchCoupons()
 * deliberately throws "not_implemented" until real docs/sample responses are available.
 *
 * To finish this: sign up as a Rakuten Advertising publisher, get approved, pull the
 * real Coupon Feed API docs from the portal, then replace the body of fetchCoupons().
 */

import { Coupon, CouponSource, SourceState } from "../types";

function isConfigured(): boolean {
  return Boolean(process.env.RAKUTEN_API_TOKEN && process.env.RAKUTEN_SITE_ID);
}

function status(): SourceState {
  return isConfigured() ? "not_implemented" : "not_configured";
}

async function fetchCoupons(): Promise<Coupon[]> {
  throw new Error(
    "Rakuten adapter is a scaffold: endpoint/field mapping needs to be finalized against your approved publisher account's real API docs."
  );
}

export const rakutenSource: CouponSource = { name: "rakuten", status, fetchCoupons };
