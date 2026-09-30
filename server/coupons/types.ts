export interface Coupon {
  id: string;
  code: string;
  merchant: string;
  title: string;
  discountText: string;
  /** ISO 8601 */
  expiresAt: string;
  affiliateUrl: string;
  active: boolean;
  /** Which source produced this row. "internal" = hand-entered via the admin page. */
  source: CouponSourceName;
}

export interface NewCoupon {
  code: string;
  merchant: string;
  title: string;
  discountText: string;
  expiresAt: string;
  affiliateUrl: string;
  active?: boolean;
}

export type CouponSourceName = "internal" | "rakuten" | "impact" | "cj" | "sovrn";

export type SourceState = "ok" | "not_configured" | "not_implemented" | "error";

export interface SourceStatus {
  source: CouponSourceName;
  state: SourceState;
  detail: string;
  count: number;
}

export interface CouponSource {
  name: CouponSourceName;
  /** "ok" means fetchCoupons() should be called. Anything else, it's skipped. */
  status: () => SourceState;
  /** Only called when status() === "ok". Real fetch errors throw; never invents data. */
  fetchCoupons: () => Promise<Coupon[]>;
}
