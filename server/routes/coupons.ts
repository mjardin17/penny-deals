import { Router } from "express";
import { aggregateCoupons } from "../coupons/aggregator";
import { activeUnexpired, matchesMerchant, sortSoonestExpiring } from "../coupons/filters";
import { addCoupon, deactivateCoupon, readAllCoupons, validateNewCoupon } from "../coupons/internal";
import { applyAmazonTag } from "../coupons/affiliate";

export const couponsRouter = Router();

function withAffiliateTag<T extends { affiliateUrl: string }>(coupon: T): T {
  return { ...coupon, affiliateUrl: applyAmazonTag(coupon.affiliateUrl) };
}

couponsRouter.get("/coupons", async (req, res) => {
  try {
    const { coupons } = await aggregateCoupons();
    let visible = activeUnexpired(coupons);
    const merchant = typeof req.query.merchant === "string" ? req.query.merchant : undefined;
    if (merchant) visible = visible.filter((c) => matchesMerchant(c, merchant));
    const sorted = sortSoonestExpiring(visible).map(withAffiliateTag);
    res.json({ success: true, data: sorted });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to load coupons" });
  }
});

/** Admin view: every internally-managed coupon, active or not, expired or not. */
couponsRouter.get("/coupons/all", async (_req, res) => {
  try {
    const coupons = await readAllCoupons();
    res.json({ success: true, data: coupons.map(withAffiliateTag) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to load coupons" });
  }
});

couponsRouter.get("/coupons/sources", async (_req, res) => {
  try {
    const { sources } = await aggregateCoupons();
    res.json({ success: true, data: sources });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to load coupon sources" });
  }
});

couponsRouter.post("/coupons", async (req, res) => {
  const parsed = validateNewCoupon(req.body);
  if (typeof parsed === "string") return res.status(400).json({ success: false, error: parsed });
  try {
    const created = await addCoupon(parsed);
    res.status(201).json({ success: true, data: withAffiliateTag(created) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to add coupon" });
  }
});

couponsRouter.delete("/coupons/:id", async (req, res) => {
  try {
    const updated = await deactivateCoupon(req.params.id);
    if (!updated) return res.status(404).json({ success: false, error: "No coupon with that id" });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Failed to deactivate coupon" });
  }
});
