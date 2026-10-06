/**
 * The internal coupon store: a JSON file (data/coupons.json) managed through the
 * admin page and the /api/coupons routes. This is the one source that's always
 * "configured" -- no external account needed.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Coupon, CouponSource, NewCoupon } from "./types";

export function defaultCouponsPath(): string {
  return path.join(process.cwd(), "data", "coupons.json");
}

async function ensureFile(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]\n", "utf8");
  }
}

export async function readAllCoupons(filePath = defaultCouponsPath()): Promise<Coupon[]> {
  await ensureFile(filePath);
  const raw = await readFile(filePath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAllCoupons(coupons: Coupon[], filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(coupons, null, 2) + "\n", "utf8");
}

export function validateNewCoupon(raw: any): NewCoupon | string {
  if (!raw || typeof raw.code !== "string" || !raw.code.trim()) return "code is required";
  if (typeof raw.merchant !== "string" || !raw.merchant.trim()) return "merchant is required";
  if (typeof raw.title !== "string" || !raw.title.trim()) return "title is required";
  if (typeof raw.discountText !== "string" || !raw.discountText.trim()) return "discountText is required";
  if (typeof raw.affiliateUrl !== "string" || !raw.affiliateUrl.trim()) return "affiliateUrl is required";
  const expires = new Date(raw.expiresAt);
  if (!raw.expiresAt || Number.isNaN(expires.getTime())) return "expiresAt must be a valid ISO date";
  let link: URL;
  try {
    link = new URL(raw.affiliateUrl);
  } catch {
    return "affiliateUrl must be a valid URL";
  }
  if (link.protocol !== "https:") return "affiliateUrl must be an https link";
  return {
    code: raw.code.trim(),
    merchant: raw.merchant.trim(),
    title: raw.title.trim(),
    discountText: raw.discountText.trim(),
    expiresAt: expires.toISOString(),
    affiliateUrl: raw.affiliateUrl.trim(),
    active: raw.active === undefined ? true : Boolean(raw.active),
  };
}

export async function addCoupon(input: NewCoupon, filePath = defaultCouponsPath()): Promise<Coupon> {
  const coupons = await readAllCoupons(filePath);
  const coupon: Coupon = {
    id: randomUUID(),
    source: "internal",
    active: input.active ?? true,
    ...input,
  };
  coupons.push(coupon);
  await writeAllCoupons(coupons, filePath);
  return coupon;
}

export async function deactivateCoupon(id: string, filePath = defaultCouponsPath()): Promise<Coupon | null> {
  const coupons = await readAllCoupons(filePath);
  const idx = coupons.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  coupons[idx] = { ...coupons[idx], active: false };
  await writeAllCoupons(coupons, filePath);
  return coupons[idx];
}

export const internalSource: CouponSource = {
  name: "internal",
  status: () => "ok",
  fetchCoupons: () => readAllCoupons(),
};
