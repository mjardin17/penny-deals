import { marginalFee, RateBand, roundCents } from "./tiered";

/** eBay US final value fee categories (see FEE_SOURCES.ebay). */
export type EbayCategory =
  | "most"
  | "tradingCards"
  | "books"
  | "athleticShoes"
  | "watches"
  | "jewelry"
  | "coins"
  | "bullion"
  | "guitars"
  | "heavyEquipment"
  | "nfts";

export const EBAY_CATEGORY_LABELS: Record<EbayCategory, string> = {
  most: "Most categories (13.6%)",
  tradingCards: "Trading cards & collectibles (13.25%)",
  books: "Books, movies, music (15.3%)",
  athleticShoes: "Athletic shoes (8% at $150+)",
  watches: "Watches (15% / 6.5% / 3%)",
  jewelry: "Jewelry (15% / 9%)",
  coins: "Coins & paper money (13.25%)",
  bullion: "Bullion (13.6% / 7%)",
  guitars: "Guitars & basses (6.7%)",
  heavyEquipment: "Heavy equipment / B&I (3% / 0.5%)",
  nfts: "NFTs (5%)",
};

const HIGH_BAND = 0.0235;

const EBAY_BANDS: Record<Exclude<EbayCategory, "athleticShoes" | "bullion">, readonly RateBand[]> = {
  most: [{ upTo: 7500, rate: 0.136 }, { rate: HIGH_BAND }],
  tradingCards: [{ upTo: 7500, rate: 0.1325 }, { rate: HIGH_BAND }],
  books: [{ upTo: 7500, rate: 0.153 }, { rate: HIGH_BAND }],
  watches: [{ upTo: 1000, rate: 0.15 }, { upTo: 7500, rate: 0.065 }, { rate: 0.03 }],
  jewelry: [{ upTo: 5000, rate: 0.15 }, { rate: 0.09 }],
  coins: [{ upTo: 7500, rate: 0.1325 }, { rate: HIGH_BAND }],
  guitars: [{ upTo: 7500, rate: 0.067 }, { rate: HIGH_BAND }],
  heavyEquipment: [{ upTo: 15000, rate: 0.03 }, { rate: 0.005 }],
  nfts: [{ rate: 0.05 }],
};

/** $0.30 on orders of $10.00 or less, $0.40 above. */
export function ebayPerOrderFee(orderTotal: number): number {
  return orderTotal <= 10 ? 0.3 : 0.4;
}

export interface EbayFeeInput {
  itemPrice: number;
  buyerShipping?: number;
  category?: EbayCategory;
  /** Sales tax eBay collects from the buyer; FVF is charged on it too. */
  buyerSalesTaxRate?: number;
  /** Promoted Listings General ad rate (0.02 = 2%), charged on the total sale. */
  promotedRate?: number;
  belowStandardSeller?: boolean;
  internationalBuyer?: boolean;
}

export interface EbayFeeResult {
  saleTotal: number;
  finalValueFee: number;
  perOrderFee: number;
  promotedFee: number;
  surcharges: number;
  total: number;
}

export function calculateEbayFees(input: EbayFeeInput): EbayFeeResult {
  const category = input.category ?? "most";
  const beforeTax = input.itemPrice + (input.buyerShipping ?? 0);
  const saleTotal = beforeTax * (1 + (input.buyerSalesTaxRate ?? 0));

  let finalValueFee: number;
  let perOrderFee = ebayPerOrderFee(saleTotal);

  if (category === "athleticShoes") {
    if (saleTotal >= 150) {
      finalValueFee = saleTotal * 0.08;
      perOrderFee = 0;
    } else {
      finalValueFee = marginalFee(saleTotal, EBAY_BANDS.most);
    }
  } else if (category === "bullion") {
    finalValueFee = saleTotal * (saleTotal <= 7500 ? 0.136 : 0.07);
  } else {
    finalValueFee = marginalFee(saleTotal, EBAY_BANDS[category]);
  }

  const promotedFee = saleTotal * (input.promotedRate ?? 0);
  const surcharges =
    (input.belowStandardSeller ? saleTotal * 0.06 : 0) +
    (input.internationalBuyer ? saleTotal * 0.0165 : 0);

  return {
    saleTotal: roundCents(saleTotal),
    finalValueFee: roundCents(finalValueFee),
    perOrderFee,
    promotedFee: roundCents(promotedFee),
    surcharges: roundCents(surcharges),
    total: roundCents(finalValueFee + perOrderFee + promotedFee + surcharges),
  };
}
