/**
 * Fee schedules come in two shapes:
 *  - "marginal": each rate applies only to the portion of the price inside its band
 *    (eBay FVF, Amazon jewelry / electronics accessories).
 *  - "whole": the band the total price falls in sets one rate for the entire price
 *    (Amazon beauty / clothing / grocery).
 */

export interface RateBand {
  /** Upper bound of this band in USD (inclusive). Omit for the last band. */
  upTo?: number;
  rate: number;
}

export function marginalFee(amount: number, bands: readonly RateBand[]): number {
  let fee = 0;
  let lower = 0;
  for (const band of bands) {
    const upper = band.upTo ?? Infinity;
    if (amount <= lower) break;
    fee += (Math.min(amount, upper) - lower) * band.rate;
    lower = upper;
  }
  return fee;
}

export function wholePriceRate(amount: number, bands: readonly RateBand[]): number {
  for (const band of bands) {
    if (band.upTo === undefined || amount <= band.upTo) return band.rate;
  }
  return bands[bands.length - 1].rate;
}

export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}
