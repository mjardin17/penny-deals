/** Mirrors server/coupons/types.ts Coupon (JSON shape). */
export interface Coupon {
  id: string;
  code: string;
  merchant: string;
  title: string;
  discountText: string;
  expiresAt: string;
  affiliateUrl: string;
  active: boolean;
  source: string;
}

export interface CouponSourceStatus {
  source: string;
  state: 'ok' | 'not_configured' | 'not_implemented' | 'error';
  detail: string;
  count: number;
}

export async function fetchCouponsForMerchant(merchant: string): Promise<Coupon[]> {
  if (!merchant.trim()) return [];
  const res = await fetch(`/api/coupons?merchant=${encodeURIComponent(merchant)}`);
  const json = await res.json();
  return json.success ? (json.data as Coupon[]) : [];
}

/** Admin-only: every internal coupon, including deactivated/expired ones. */
export async function fetchAllCouponsForAdmin(): Promise<Coupon[]> {
  const res = await fetch('/api/coupons/all');
  const json = await res.json();
  return json.success ? (json.data as Coupon[]) : [];
}

export async function fetchCouponSources(): Promise<CouponSourceStatus[]> {
  const res = await fetch('/api/coupons/sources');
  const json = await res.json();
  return json.success ? (json.data as CouponSourceStatus[]) : [];
}
