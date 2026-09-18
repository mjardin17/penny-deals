import { roundCents } from "./tiered";

/** TikTok Shop US referral rates (FEE_SOURCES.tiktok). */
export const TIKTOK_REFERRAL_RATES = {
  standard: { label: "Standard non-food (8%)", rate: 0.08 },
  selectBeautyElectronics: { label: "Select beauty / electronics subcategories (up to 11%)", rate: 0.11 },
  food: { label: "Food & grocery (~5%)", rate: 0.05 },
  jewelryPreOwned: { label: "Select jewelry & pre-owned (5%)", rate: 0.05 },
} as const;

export type TiktokCategory = keyof typeof TIKTOK_REFERRAL_RATES;

export interface TiktokFeeInput {
  itemPrice: number;
  buyerShipping?: number;
  category?: TiktokCategory;
  /** Creator affiliate commission you set (0.1 = 10%), on the item price. */
  affiliateRate?: number;
}

export interface TiktokFeeResult {
  orderTotal: number;
  referralFee: number;
  affiliateFee: number;
  total: number;
}

export function calculateTiktokFees(input: TiktokFeeInput): TiktokFeeResult {
  const orderTotal = input.itemPrice + (input.buyerShipping ?? 0);
  const rate = TIKTOK_REFERRAL_RATES[input.category ?? "standard"].rate;
  const referralFee = orderTotal * rate;
  const affiliateFee = input.itemPrice * (input.affiliateRate ?? 0);
  return {
    orderTotal: roundCents(orderTotal),
    referralFee: roundCents(referralFee),
    affiliateFee: roundCents(affiliateFee),
    total: roundCents(referralFee + affiliateFee),
  };
}
