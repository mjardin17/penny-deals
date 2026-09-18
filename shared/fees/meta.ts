/**
 * Provenance for every fee table in shared/fees.
 * Retrieved 2026-09-18. Re-verify when a platform announces a fee change.
 */

export type FeeVerification = "official" | "multi_source" | "unverified";

export interface FeeSource {
  table: string;
  effective: string;
  verification: FeeVerification;
  urls: string[];
  notes?: string;
}

export const FEE_TABLES_RETRIEVED = "2026-09-18";

export const FEE_SOURCES: Record<string, FeeSource> = {
  ebay: {
    table: "eBay US final value fees (managed payments)",
    effective: "current as of retrieval (page shows no date)",
    verification: "official",
    urls: ["https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822"],
    notes: "FVF is charged on the total amount of the sale: item + shipping + handling + sales tax.",
  },
  amazonReferral: {
    table: "Amazon US referral fees",
    effective: "current as of retrieval",
    verification: "official",
    urls: ["https://sell.amazon.com/pricing"],
  },
  amazonFbaStandard: {
    table: "Amazon US FBA fulfillment fees, standard size, non-apparel",
    effective: "2026-01-15 rates; +3.5% fuel/logistics surcharge from 2026-04-17",
    verification: "multi_source",
    urls: [
      "https://sellerguards.com/amazon-fba-fulfillment-fees.html",
      "https://www.goatconsulting.com/amazon-fulfillment/amazon-fba-fee-changes-for-2026",
      "https://warehousingcosts.com/guides/amazon-fba-fulfillment-fees",
    ],
    notes: "Seller Central's own rate-card page could not be fetched without login; two independent sources match line for line.",
  },
  amazonFbaBulky: {
    table: "Amazon US FBA fulfillment fees, large bulky / extra-large",
    effective: "2026",
    verification: "unverified",
    urls: [
      "https://sellerguards.com/amazon-fba-fulfillment-fees.html",
      "https://warehousingcosts.com/guides/amazon-fba-fulfillment-fees",
    ],
    notes: "Sources disagree ($7.55-$9.73 base). The highest figure is used and results are marked unverified. Confirm in Seller Central Fee Preview.",
  },
  tiktok: {
    table: "TikTok Shop US referral fee",
    effective: "2026-08-04 (standard non-food rate raised 6% -> 8%)",
    verification: "multi_source",
    urls: [
      "https://www.getonecart.com/tiktok-shop-seller-fees/",
      "https://delzonic.com/blogs/tiktok-shop-fee-increase-2026/",
      "https://winninghunter.com/blog/tiktok-shop-seller-fees",
    ],
    notes: "Referral fee includes payment processing and is charged on the order total incl. buyer-paid shipping. Select beauty/electronics subcategories run 9.5-11%. Affiliate commission is extra and seller-set.",
  },
  usps: {
    table: "USPS Notice 123 commercial prices",
    effective: "2026-07-12",
    verification: "official",
    urls: ["https://pe.usps.com/text/dmm300/Notice123.htm"],
    notes: "Published commercial rates (what eBay labels / Pirate Ship roughly charge). Negotiated rates may be lower.",
  },
};
