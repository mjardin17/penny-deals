/**
 * CJ Affiliate (Commission Junction) product/coupon feed.
 *
 * STATUS: scaffold only -- same reasoning as sources/rakuten.ts. CJ's REST API docs
 * (developers.cj.com) redirect to a login-gated portal, so the endpoint/response
 * shape here isn't verified. fetchCoupons() throws until real docs are in hand.
 *
 * To finish this: sign up as a CJ publisher, get approved for the advertisers you
 * care about, pull your real Website ID (CID) and the real Product/Coupon Feed API
 * docs from your account, then replace the body of fetchCoupons().
 */

import { Coupon, CouponSource, SourceState } from "../types";

function isConfigured(): boolean {
  return Boolean(process.env.CJ_PERSONAL_ACCESS_TOKEN && process.env.CJ_WEBSITE_ID);
}

function status(): SourceState {
  return isConfigured() ? "not_implemented" : "not_configured";
}

async function fetchCoupons(): Promise<Coupon[]> {
  throw new Error(
    "CJ Affiliate adapter is a scaffold: endpoint/field mapping needs to be finalized against your approved publisher account's real API docs."
  );
}

export const cjSource: CouponSource = { name: "cj", status, fetchCoupons };
