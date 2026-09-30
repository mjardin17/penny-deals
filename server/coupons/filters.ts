import { Coupon } from "./types";

export function isActiveAndUnexpired(coupon: Coupon, now: Date): boolean {
  if (!coupon.active) return false;
  const expires = new Date(coupon.expiresAt);
  return expires.getTime() > now.getTime();
}

export function activeUnexpired(coupons: Coupon[], now = new Date()): Coupon[] {
  return coupons.filter((c) => isActiveAndUnexpired(c, now));
}

export function sortSoonestExpiring(coupons: Coupon[]): Coupon[] {
  return [...coupons].sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
}

export function matchesMerchant(coupon: Coupon, merchant: string): boolean {
  return coupon.merchant.trim().toLowerCase() === merchant.trim().toLowerCase();
}

export function couponsForMerchant(coupons: Coupon[], merchant: string, now = new Date()): Coupon[] {
  return sortSoonestExpiring(activeUnexpired(coupons, now).filter((c) => matchesMerchant(c, merchant)));
}
