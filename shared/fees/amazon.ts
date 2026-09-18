import { marginalFee, RateBand, roundCents, wholePriceRate } from "./tiered";

// ---------------------------------------------------------------------------
// Referral fees (FEE_SOURCES.amazonReferral)
// ---------------------------------------------------------------------------

interface ReferralRule {
  label: string;
  mode: "flat" | "marginal" | "whole";
  bands: readonly RateBand[];
  minimum: number;
}

const MIN = 0.3;

export const AMAZON_REFERRAL_RULES = {
  everythingElse: { label: "Everything else (15%)", mode: "flat", bands: [{ rate: 0.15 }], minimum: MIN },
  homeKitchen: { label: "Home & kitchen (15%)", mode: "flat", bands: [{ rate: 0.15 }], minimum: MIN },
  toolsHomeImprovement: { label: "Tools & home improvement (15%)", mode: "flat", bands: [{ rate: 0.15 }], minimum: MIN },
  lawnGarden: { label: "Lawn & garden (15%)", mode: "flat", bands: [{ rate: 0.15 }], minimum: MIN },
  toysGames: { label: "Toys & games (15%)", mode: "flat", bands: [{ rate: 0.15 }], minimum: MIN },
  sportsOutdoors: { label: "Sports & outdoors (15%)", mode: "flat", bands: [{ rate: 0.15 }], minimum: MIN },
  officeProducts: { label: "Office products (15%)", mode: "flat", bands: [{ rate: 0.15 }], minimum: MIN },
  petSupplies: { label: "Pet supplies (15%)", mode: "flat", bands: [{ rate: 0.15 }], minimum: MIN },
  videoGames: { label: "Video games & accessories (15%)", mode: "flat", bands: [{ rate: 0.15 }], minimum: 0 },
  videoGameConsoles: { label: "Video game consoles (8%)", mode: "flat", bands: [{ rate: 0.08 }], minimum: 0 },
  media: { label: "Books, DVD, music, software (15%)", mode: "flat", bands: [{ rate: 0.15 }], minimum: 0 },
  consumerElectronics: { label: "Consumer electronics (8%)", mode: "flat", bands: [{ rate: 0.08 }], minimum: MIN },
  computers: { label: "Computers (8%)", mode: "flat", bands: [{ rate: 0.08 }], minimum: MIN },
  electronicsAccessories: {
    label: "Electronics accessories (15% to $100, 8% above)",
    mode: "marginal",
    bands: [{ upTo: 100, rate: 0.15 }, { rate: 0.08 }],
    minimum: MIN,
  },
  automotive: { label: "Automotive & powersports (12%)", mode: "flat", bands: [{ rate: 0.12 }], minimum: MIN },
  powerTools: { label: "Base equipment power tools (12%)", mode: "flat", bands: [{ rate: 0.12 }], minimum: MIN },
  industrial: { label: "Business, industrial, scientific (12%)", mode: "flat", bands: [{ rate: 0.12 }], minimum: MIN },
  beautyHealth: {
    label: "Beauty, health, personal care (8% <= $10, else 15%)",
    mode: "whole",
    bands: [{ upTo: 10, rate: 0.08 }, { rate: 0.15 }],
    minimum: MIN,
  },
  baby: {
    label: "Baby products (8% <= $10, else 15%)",
    mode: "whole",
    bands: [{ upTo: 10, rate: 0.08 }, { rate: 0.15 }],
    minimum: MIN,
  },
  grocery: {
    label: "Grocery & gourmet (8% <= $15, else 15%)",
    mode: "whole",
    bands: [{ upTo: 15, rate: 0.08 }, { rate: 0.15 }],
    minimum: 0,
  },
  clothing: {
    label: "Clothing & accessories (5% / 10% / 17%)",
    mode: "whole",
    bands: [{ upTo: 15, rate: 0.05 }, { upTo: 20, rate: 0.1 }, { rate: 0.17 }],
    minimum: MIN,
  },
  furniture: {
    label: "Furniture (15% to $200, 10% above)",
    mode: "marginal",
    bands: [{ upTo: 200, rate: 0.15 }, { rate: 0.1 }],
    minimum: MIN,
  },
  appliancesCompact: {
    label: "Compact appliances (15% to $300, 8% above)",
    mode: "marginal",
    bands: [{ upTo: 300, rate: 0.15 }, { rate: 0.08 }],
    minimum: MIN,
  },
  appliancesFullSize: { label: "Full-size appliances (8%)", mode: "flat", bands: [{ rate: 0.08 }], minimum: MIN },
  jewelry: {
    label: "Jewelry (20% to $250, 5% above)",
    mode: "marginal",
    bands: [{ upTo: 250, rate: 0.2 }, { rate: 0.05 }],
    minimum: MIN,
  },
  watches: {
    label: "Watches (16% to $1,500, 3% above)",
    mode: "marginal",
    bands: [{ upTo: 1500, rate: 0.16 }, { rate: 0.03 }],
    minimum: MIN,
  },
} as const satisfies Record<string, ReferralRule>;

export type AmazonCategory = keyof typeof AMAZON_REFERRAL_RULES;

/** Referral fee is charged on the total sales price (item + shipping + gift wrap). */
export function calculateAmazonReferralFee(salesPrice: number, category: AmazonCategory = "everythingElse"): number {
  const rule: ReferralRule = AMAZON_REFERRAL_RULES[category];
  let fee: number;
  if (rule.mode === "whole") {
    fee = salesPrice * wholePriceRate(salesPrice, rule.bands);
  } else {
    fee = marginalFee(salesPrice, rule.bands);
  }
  return roundCents(Math.max(fee, rule.minimum));
}

// ---------------------------------------------------------------------------
// FBA fulfillment fees, non-apparel (FEE_SOURCES.amazonFbaStandard / amazonFbaBulky)
// ---------------------------------------------------------------------------

export const FBA_FUEL_SURCHARGE = 0.035;
const DIM_DIVISOR = 139;

export type FbaSizeTier = "smallStandard" | "largeStandard" | "largeBulky" | "extraLarge";

export interface PackageSpec {
  /** Inches, any order. */
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightLb: number;
}

/** Fee per price band: [<$10, $10-$50, >$50] */
type BandFees = readonly [number, number, number];

const SMALL_STANDARD: readonly { maxOz: number; fees: BandFees }[] = [
  { maxOz: 2, fees: [2.43, 3.32, 3.58] },
  { maxOz: 4, fees: [2.49, 3.42, 3.68] },
  { maxOz: 6, fees: [2.56, 3.45, 3.71] },
  { maxOz: 8, fees: [2.66, 3.54, 3.8] },
  { maxOz: 10, fees: [2.77, 3.68, 3.94] },
  { maxOz: 12, fees: [2.82, 3.78, 4.04] },
  { maxOz: 14, fees: [2.92, 3.91, 4.17] },
  { maxOz: 16, fees: [2.95, 3.96, 4.22] },
];

const LARGE_STANDARD: readonly { maxOz: number; fees: BandFees }[] = [
  { maxOz: 4, fees: [2.91, 3.73, 3.99] },
  { maxOz: 8, fees: [3.13, 3.95, 4.21] },
  { maxOz: 12, fees: [3.38, 4.2, 4.46] },
  { maxOz: 16, fees: [3.78, 4.6, 4.86] },
  { maxOz: 20, fees: [4.22, 5.04, 5.3] },
  { maxOz: 24, fees: [4.6, 5.42, 5.68] },
  { maxOz: 28, fees: [4.75, 5.57, 5.83] },
  { maxOz: 32, fees: [5.0, 5.82, 6.08] },
  { maxOz: 36, fees: [5.1, 5.92, 6.18] },
  { maxOz: 40, fees: [5.28, 6.1, 6.36] },
  { maxOz: 44, fees: [5.44, 6.26, 6.52] },
  { maxOz: 48, fees: [5.85, 6.67, 6.93] },
];
const LARGE_STANDARD_OVER_3LB_BASE: BandFees = [6.15, 6.97, 7.23];
const LARGE_STANDARD_PER_4OZ = 0.08;

function priceBand(price: number): 0 | 1 | 2 {
  if (price < 10) return 0;
  if (price <= 50) return 1;
  return 2;
}

function sortedDims(pkg: PackageSpec): [number, number, number] {
  const d = [pkg.lengthIn, pkg.widthIn, pkg.heightIn].sort((a, b) => b - a);
  return [d[0], d[1], d[2]];
}

export function dimensionalWeightLb(pkg: PackageSpec, minSideIn = 0): number {
  const [l, w, h] = sortedDims(pkg).map((d) => Math.max(d, minSideIn));
  return (l * w * h) / DIM_DIVISOR;
}

export function classifyFbaSizeTier(pkg: PackageSpec): FbaSizeTier {
  const [l, m, s] = sortedDims(pkg);
  const lengthPlusGirth = l + 2 * (m + s);
  if (pkg.weightLb <= 1 && l <= 15 && m <= 12 && s <= 0.75) return "smallStandard";
  if (pkg.weightLb <= 20 && l <= 18 && m <= 14 && s <= 8) return "largeStandard";
  if (pkg.weightLb <= 50 && l <= 59 && m <= 33 && s <= 33 && lengthPlusGirth <= 130) return "largeBulky";
  return "extraLarge";
}

export interface FbaFeeResult {
  tier: FbaSizeTier;
  shippingWeightLb: number;
  baseFee: number;
  fuelSurcharge: number;
  total: number;
  verified: boolean;
  note?: string;
}

export function calculateFbaFee(pkg: PackageSpec, salePrice: number): FbaFeeResult {
  const tier = classifyFbaSizeTier(pkg);
  const band = priceBand(salePrice);
  let shippingWeightLb: number;
  let baseFee: number;
  let verified = true;
  let note: string | undefined;

  if (tier === "smallStandard") {
    shippingWeightLb = pkg.weightLb;
    const oz = shippingWeightLb * 16;
    baseFee = SMALL_STANDARD.find((row) => oz <= row.maxOz)!.fees[band];
  } else if (tier === "largeStandard") {
    shippingWeightLb = Math.max(pkg.weightLb, dimensionalWeightLb(pkg));
    const oz = shippingWeightLb * 16;
    const row = LARGE_STANDARD.find((r) => oz <= r.maxOz);
    if (row) {
      baseFee = row.fees[band];
    } else {
      const extraQuarterPounds = Math.ceil((oz - 48) / 4);
      baseFee = LARGE_STANDARD_OVER_3LB_BASE[band] + extraQuarterPounds * LARGE_STANDARD_PER_4OZ;
    }
  } else {
    // Bulky tiers: sources disagree, so use the highest published figure and flag it.
    shippingWeightLb = Math.max(pkg.weightLb, dimensionalWeightLb(pkg, 2));
    const billable = Math.ceil(shippingWeightLb);
    if (tier === "largeBulky") {
      baseFee = 9.73 + Math.max(0, billable - 1) * 0.42;
    } else if (billable <= 50) {
      baseFee = 26.38 + Math.max(0, billable - 1) * 0.38;
    } else if (billable <= 70) {
      baseFee = 40.17 + Math.max(0, billable - 51) * 0.75;
    } else if (billable <= 150) {
      baseFee = 54.86 + Math.max(0, billable - 71) * 0.75;
    } else {
      baseFee = 195.0 + Math.max(0, billable - 151) * 0.19;
    }
    verified = false;
    note = "Bulky/extra-large FBA fees are unverified (sources disagree). Confirm in Seller Central Fee Preview.";
  }

  const fuelSurcharge = baseFee * FBA_FUEL_SURCHARGE;
  return {
    tier,
    shippingWeightLb: roundCents(shippingWeightLb),
    baseFee: roundCents(baseFee),
    fuelSurcharge: roundCents(fuelSurcharge),
    total: roundCents(baseFee + fuelSurcharge),
    verified,
    note,
  };
}
