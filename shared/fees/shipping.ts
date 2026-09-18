/**
 * USPS commercial postage, Notice 123 effective 2026-07-12 (FEE_SOURCES.usps).
 * Only the zones and weights below were transcribed. Lookups round the weight
 * and zone UP to the next row, so estimates are never optimistic.
 */

export type ShippingMethod =
  | "groundAdvantage"
  | "priorityMail"
  | "flatRateEnvelope"
  | "flatRatePaddedEnvelope"
  | "flatRateSmallBox"
  | "flatRateMediumBox"
  | "flatRateLargeBox"
  | "mediaMail"
  | "localPickup";

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  groundAdvantage: "USPS Ground Advantage",
  priorityMail: "USPS Priority Mail",
  flatRateEnvelope: "Priority Flat Rate Envelope",
  flatRatePaddedEnvelope: "Priority Flat Rate Padded Envelope",
  flatRateSmallBox: "Priority Flat Rate Small Box",
  flatRateMediumBox: "Priority Flat Rate Medium Box",
  flatRateLargeBox: "Priority Flat Rate Large Box",
  mediaMail: "USPS Media Mail (books/media only)",
  localPickup: "Local pickup / meetup",
};

export const USPS_ZONES = [1, 2, 4, 6, 8] as const;
export type UspsZone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Zone 5-6 is typical for a coast-to-middle shipment; used when zone is unknown. */
export const DEFAULT_ZONE: UspsZone = 6;
/** Box, mailer, tape, label: an assumption, override per item. */
export const DEFAULT_HANDLING_COST = 0.75;

type ZoneRow = readonly [number, number, number, number, number];

const GROUND_ADVANTAGE: readonly { maxLb: number; zones: ZoneRow }[] = [
  { maxLb: 15.999 / 16, zones: [6.93, 6.94, 7.46, 7.86, 8.4] },
  { maxLb: 1, zones: [7.61, 7.68, 8.15, 9.63, 10.67] },
  { maxLb: 2, zones: [7.99, 8.08, 8.51, 11.58, 12.87] },
  { maxLb: 3, zones: [8.64, 8.66, 9.67, 13.59, 15.75] },
  { maxLb: 5, zones: [9.7, 9.76, 11.02, 15.89, 19.19] },
  { maxLb: 10, zones: [11.91, 12.26, 14.44, 19.94, 25.34] },
  { maxLb: 20, zones: [16.46, 17.06, 19.66, 30.32, 40.39] },
];

const PRIORITY_MAIL: readonly { maxLb: number; zones: ZoneRow }[] = [
  { maxLb: 1, zones: [9.04, 9.32, 10.4, 14.47, 15.22] },
  { maxLb: 2, zones: [9.1, 9.39, 10.79, 15.34, 16.37] },
  { maxLb: 3, zones: [9.45, 9.71, 12.68, 18.86, 20.57] },
  { maxLb: 5, zones: [11.39, 11.56, 15.72, 26.35, 29.18] },
  { maxLb: 10, zones: [14.5, 14.63, 19.62, 33.74, 41.28] },
];

const FLAT_RATE: Partial<Record<ShippingMethod, number>> = {
  flatRateEnvelope: 11.12,
  flatRatePaddedEnvelope: 11.99,
  flatRateSmallBox: 12.1,
  flatRateMediumBox: 21.17,
  flatRateLargeBox: 31.0,
};

const MEDIA_MAIL: readonly { maxLb: number; price: number }[] = [
  { maxLb: 1, price: 4.39 },
  { maxLb: 2, price: 5.13 },
  { maxLb: 3, price: 5.86 },
];

/** Flat-rate containers are capped at 70 lb by USPS. */
const FLAT_RATE_MAX_LB = 70;

export class ShippingRateUnavailableError extends Error {}

function zoneIndex(zone: UspsZone): number {
  const idx = USPS_ZONES.findIndex((z) => z >= zone);
  if (idx === -1) throw new ShippingRateUnavailableError(`Zone ${zone} is not in the transcribed table (max zone 8).`);
  return idx;
}

function lookup(table: readonly { maxLb: number; zones: ZoneRow }[], weightLb: number, zone: UspsZone, name: string): number {
  const row = table.find((r) => weightLb <= r.maxLb);
  if (!row) {
    const max = table[table.length - 1].maxLb;
    throw new ShippingRateUnavailableError(`${name}: ${weightLb} lb exceeds the transcribed table (max ${max} lb).`);
  }
  return row.zones[zoneIndex(zone)];
}

export interface ShippingQuote {
  method: ShippingMethod;
  postage: number;
  handling: number;
  total: number;
}

export function quoteShipping(
  method: ShippingMethod,
  weightLb: number,
  zone: UspsZone = DEFAULT_ZONE,
  handling: number = DEFAULT_HANDLING_COST
): ShippingQuote {
  if (weightLb <= 0) throw new ShippingRateUnavailableError("Weight must be greater than 0.");
  let postage: number;

  if (method === "localPickup") {
    postage = 0;
    handling = 0;
  } else if (method === "groundAdvantage") {
    postage = lookup(GROUND_ADVANTAGE, weightLb, zone, "Ground Advantage");
  } else if (method === "priorityMail") {
    postage = lookup(PRIORITY_MAIL, weightLb, zone, "Priority Mail");
  } else if (method === "mediaMail") {
    const row = MEDIA_MAIL.find((r) => weightLb <= r.maxLb);
    if (!row) throw new ShippingRateUnavailableError(`Media Mail: ${weightLb} lb exceeds the transcribed table (max 3 lb).`);
    postage = row.price;
  } else {
    if (weightLb > FLAT_RATE_MAX_LB) throw new ShippingRateUnavailableError("Flat rate max is 70 lb.");
    postage = FLAT_RATE[method]!;
  }

  return { method, postage, handling, total: Math.round((postage + handling) * 100) / 100 };
}

/**
 * Cheapest weight-and-zone priced method for this weight. Flat-rate boxes are
 * left out because whether the item fits one depends on its size.
 */
export function cheapestShipping(weightLb: number, zone: UspsZone = DEFAULT_ZONE, handling = DEFAULT_HANDLING_COST): ShippingQuote {
  const candidates: ShippingMethod[] = ["groundAdvantage", "priorityMail"];
  const quotes = candidates.flatMap((m) => {
    try {
      return [quoteShipping(m, weightLb, zone, handling)];
    } catch {
      return [];
    }
  });
  if (quotes.length === 0) throw new ShippingRateUnavailableError(`No transcribed rate covers ${weightLb} lb.`);
  return quotes.reduce((best, q) => (q.total < best.total ? q : best));
}
