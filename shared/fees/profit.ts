/**
 * Per-channel net profit using the fee tables in this folder.
 * Every line item carries the fee table it came from so the UI and digest can cite it.
 */

import { AmazonCategory, calculateAmazonReferralFee, calculateFbaFee, PackageSpec } from "./amazon";
import { calculateEbayFees, EbayCategory } from "./ebay";
import { FEE_SOURCES } from "./meta";
import { quoteShipping, ShippingMethod, UspsZone } from "./shipping";
import { calculateTiktokFees, TiktokCategory } from "./tiktok";
import { roundCents } from "./tiered";

export type SalesChannel = "ebay" | "amazonFba" | "amazonFbm" | "tiktok";

export const CHANNEL_LABELS: Record<SalesChannel, string> = {
  ebay: "eBay",
  amazonFba: "Amazon FBA",
  amazonFbm: "Amazon FBM",
  tiktok: "TikTok Shop",
};

export interface FeeLine {
  label: string;
  amount: number;
  sourceKey: keyof typeof FEE_SOURCES | "input";
}

export interface ProfitInput {
  channel: SalesChannel;
  salePrice: number;
  /** What you paid, incl. sales tax at the register. */
  cogs: number;
  /** Shipping the buyer pays on top of salePrice. Ignored for FBA. */
  buyerShipping?: number;
  pkg: PackageSpec;
  shippingMethod?: ShippingMethod;
  zone?: UspsZone;
  handling?: number;
  ebayCategory?: EbayCategory;
  ebayPromotedRate?: number;
  ebayBuyerSalesTaxRate?: number;
  amazonCategory?: AmazonCategory;
  /** Per-unit cost to send inventory into FBA (inbound placement + your freight). */
  fbaInboundPerUnit?: number;
  tiktokCategory?: TiktokCategory;
  tiktokAffiliateRate?: number;
}

export interface ProfitResult {
  channel: SalesChannel;
  grossRevenue: number;
  lines: FeeLine[];
  totalCosts: number;
  netProfit: number;
  roiPct: number;
  marginPct: number;
  /** False when any fee in the breakdown came from an unverified table. */
  feesVerified: boolean;
  notes: string[];
}

/** Default buyer sales tax used for eBay FVF (eBay charges FVF on tax). Rough US average; override per item. */
export const DEFAULT_EBAY_BUYER_TAX_RATE = 0.07;

function outboundShipping(input: ProfitInput): FeeLine {
  const quote = quoteShipping(input.shippingMethod ?? "groundAdvantage", input.pkg.weightLb, input.zone, input.handling);
  return { label: `Postage + handling (${quote.method})`, amount: quote.total, sourceKey: "usps" };
}

export function calculateProfit(input: ProfitInput): ProfitResult {
  const buyerShipping = input.channel === "amazonFba" ? 0 : input.buyerShipping ?? 0;
  const grossRevenue = input.salePrice + buyerShipping;
  const lines: FeeLine[] = [{ label: "Cost of goods", amount: input.cogs, sourceKey: "input" }];
  const notes: string[] = [];
  let feesVerified = true;

  switch (input.channel) {
    case "ebay": {
      const fees = calculateEbayFees({
        itemPrice: input.salePrice,
        buyerShipping,
        category: input.ebayCategory,
        promotedRate: input.ebayPromotedRate,
        buyerSalesTaxRate: input.ebayBuyerSalesTaxRate ?? DEFAULT_EBAY_BUYER_TAX_RATE,
      });
      lines.push({ label: "eBay final value fee", amount: fees.finalValueFee, sourceKey: "ebay" });
      lines.push({ label: "eBay per-order fee", amount: fees.perOrderFee, sourceKey: "ebay" });
      if (fees.promotedFee > 0) lines.push({ label: "Promoted listing ad fee", amount: fees.promotedFee, sourceKey: "ebay" });
      lines.push(outboundShipping(input));
      break;
    }
    case "amazonFba": {
      const referral = calculateAmazonReferralFee(input.salePrice, input.amazonCategory);
      const fba = calculateFbaFee(input.pkg, input.salePrice);
      lines.push({ label: "Amazon referral fee", amount: referral, sourceKey: "amazonReferral" });
      lines.push({
        label: `FBA fulfillment fee (${fba.tier}, incl. 3.5% fuel surcharge)`,
        amount: fba.total,
        sourceKey: fba.verified ? "amazonFbaStandard" : "amazonFbaBulky",
      });
      if (input.fbaInboundPerUnit) lines.push({ label: "Inbound to FBA", amount: input.fbaInboundPerUnit, sourceKey: "input" });
      if (!fba.verified) {
        feesVerified = false;
        if (fba.note) notes.push(fba.note);
      }
      notes.push("Monthly storage, prep and the $39.99/mo Professional plan are not included.");
      break;
    }
    case "amazonFbm": {
      const referral = calculateAmazonReferralFee(grossRevenue, input.amazonCategory);
      lines.push({ label: "Amazon referral fee", amount: referral, sourceKey: "amazonReferral" });
      lines.push(outboundShipping(input));
      break;
    }
    case "tiktok": {
      const fees = calculateTiktokFees({
        itemPrice: input.salePrice,
        buyerShipping,
        category: input.tiktokCategory,
        affiliateRate: input.tiktokAffiliateRate,
      });
      lines.push({ label: "TikTok Shop referral fee", amount: fees.referralFee, sourceKey: "tiktok" });
      if (fees.affiliateFee > 0) lines.push({ label: "Creator affiliate commission", amount: fees.affiliateFee, sourceKey: "input" });
      lines.push(outboundShipping(input));
      break;
    }
  }

  const totalCosts = roundCents(lines.reduce((sum, l) => sum + l.amount, 0));
  const netProfit = roundCents(grossRevenue - totalCosts);
  return {
    channel: input.channel,
    grossRevenue: roundCents(grossRevenue),
    lines,
    totalCosts,
    netProfit,
    roiPct: input.cogs > 0 ? roundCents((netProfit / input.cogs) * 100) : Infinity,
    marginPct: grossRevenue > 0 ? roundCents((netProfit / grossRevenue) * 100) : 0,
    feesVerified,
    notes,
  };
}

/** Lowest sale price at which net profit >= targetProfit (binary search, cent precision). */
export function breakEvenPrice(input: Omit<ProfitInput, "salePrice">, targetProfit = 0): number {
  let lo = 0;
  let hi = Math.max(10, input.cogs * 20 + 100);
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (calculateProfit({ ...input, salePrice: mid }).netProfit >= targetProfit) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi * 100) / 100;
}
