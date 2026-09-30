import { Coupon } from "../server/coupons/types";
import { applyAmazonTag } from "../server/coupons/affiliate";

const MAX_COUPONS = 3;

function escapeMd(text: string): string {
  return text.replace(/([\\`*_[\]<>|])/g, "\\$1");
}

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** `sortedActiveCoupons` must already be filtered to active+unexpired and sorted soonest-expiring first. */
export function renderCouponsSection(sortedActiveCoupons: Coupon[]): string {
  const out = ["## Top coupons", ""];
  if (sortedActiveCoupons.length === 0) {
    out.push("_No active coupons._", "");
    return out.join("\n");
  }
  for (const c of sortedActiveCoupons.slice(0, MAX_COUPONS)) {
    out.push(
      `- **${escapeMd(c.merchant)}** — ${escapeMd(c.title)}: \`${c.code}\` (${escapeMd(c.discountText)}), ` +
        `expires ${formatExpiry(c.expiresAt)} — [Claim](${applyAmazonTag(c.affiliateUrl)})`
    );
  }
  out.push("");
  return out.join("\n");
}
