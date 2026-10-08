import { DEFAULT_EBAY_BUYER_TAX_RATE, DEFAULT_HANDLING_COST, SHIPPING_METHOD_LABELS } from "../../../shared/fees";
import type { ShippingMethod, UspsZone } from "../../../shared/fees";

/** Profit is only shown once a real sale price and a real cost (both above $0) have been typed in. */
export function canCalculateProfit(salePrice: number | null, cogs: number | null): boolean {
  return salePrice !== null && cogs !== null && Number.isFinite(salePrice) && Number.isFinite(cogs) && salePrice > 0 && cogs > 0;
}

export interface ProfitSettings {
  weightLb: number;
  dims: { lengthIn: number; widthIn: number; heightIn: number };
  shippingMethod: ShippingMethod;
  zone: UspsZone;
  handling: number;
  ebayPromotedPct: number;
  ebayTaxPct: number;
  fbaInbound: number;
}

export const PROFIT_DEFAULTS: ProfitSettings = {
  weightLb: 1,
  dims: { lengthIn: 10, widthIn: 8, heightIn: 4 },
  shippingMethod: "groundAdvantage",
  zone: 6,
  handling: DEFAULT_HANDLING_COST,
  ebayPromotedPct: 2,
  ebayTaxPct: Math.round(DEFAULT_EBAY_BUYER_TAX_RATE * 10000) / 100,
  fbaInbound: 0.5,
};

export type AssumptionKey = "weightLb" | "boxSize" | "shippingMethod" | "zone" | "handling" | "ebayPromotedPct" | "ebayTaxPct" | "fbaInbound";
export interface Assumption {
  key: AssumptionKey;
  label: string;
  value: string;
}

/** Every setting the person has not changed from its starting value, described so the screen can label it as an assumption. */
export function defaultedAssumptions(s: ProfitSettings): Assumption[] {
  const d = PROFIT_DEFAULTS;
  const out: Assumption[] = [];
  if (s.weightLb === d.weightLb) out.push({ key: "weightLb", label: "Weight", value: `${s.weightLb} lb` });
  if (s.dims.lengthIn === d.dims.lengthIn && s.dims.widthIn === d.dims.widthIn && s.dims.heightIn === d.dims.heightIn) {
    out.push({ key: "boxSize", label: "Box size", value: `${s.dims.lengthIn}×${s.dims.widthIn}×${s.dims.heightIn} in` });
  }
  if (s.shippingMethod === d.shippingMethod) out.push({ key: "shippingMethod", label: "Ship method", value: SHIPPING_METHOD_LABELS[s.shippingMethod] });
  if (s.zone === d.zone) out.push({ key: "zone", label: "USPS zone", value: `Zone ${s.zone}` });
  if (s.handling === d.handling) out.push({ key: "handling", label: "Handling / packaging", value: `$${s.handling.toFixed(2)}` });
  if (s.ebayPromotedPct === d.ebayPromotedPct) out.push({ key: "ebayPromotedPct", label: "eBay promoted ads", value: `${s.ebayPromotedPct}%` });
  if (s.ebayTaxPct === d.ebayTaxPct) out.push({ key: "ebayTaxPct", label: "Buyer sales tax (eBay)", value: `${s.ebayTaxPct}%` });
  if (s.fbaInbound === d.fbaInbound) out.push({ key: "fbaInbound", label: "FBA inbound per unit", value: `$${s.fbaInbound.toFixed(2)}` });
  return out;
}
