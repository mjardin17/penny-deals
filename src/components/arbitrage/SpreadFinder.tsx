import React, { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Search, Tag, XCircle } from "lucide-react";
import { CHANNEL_LABELS, ProfitResult, SalesChannel } from "../../../shared/fees";
import { Coupon, fetchCouponsForMerchant } from "../../utils/coupons";

/** Mirrors server/arbitrage/spreadEngine.ts SpreadReport (JSON shape). */
interface ChannelSpread {
  channel: SalesChannel;
  status: "ok" | "not_configured" | "no_match" | "insufficient_comps" | "error";
  statusMessage: string;
  resalePrice?: number;
  resaleBasis?: string;
  matchedTitle?: string;
  matchUrl?: string;
  profit?: ProfitResult;
  isRealSpread: boolean;
}

interface SpreadReport {
  packageAssumed: boolean;
  channels: ChannelSpread[];
  bestRealSpread?: ChannelSpread;
  checkedAt: string;
}

export interface SpreadFinderPrefill {
  title?: string;
  buyPrice?: number;
  store?: string;
}

const inputCls =
  "w-full bg-[#222227] border border-[#2c2c35] rounded-lg px-3 py-2 text-sm text-[#f5f5f7] focus:border-[#ff9800] outline-none";

const ChannelRow: React.FC<{ ch: ChannelSpread }> = ({ ch }) => {
  return (
    <div className={`rounded-xl border p-3 ${ch.isRealSpread ? "border-[#30d158] bg-[#30d158]/5" : "border-[#2c2c35] bg-[#18181c]"}`}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-[#f5f5f7] m-0 flex items-center gap-1.5">
          {ch.isRealSpread ? <CheckCircle2 className="w-4 h-4 text-[#30d158]" /> : <XCircle className="w-4 h-4 text-[#92929d]" />}
          {CHANNEL_LABELS[ch.channel]}
        </h4>
        {ch.isRealSpread && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#30d158] text-black">REAL SPREAD</span>}
      </div>
      <p className="text-xs text-[#92929d] mt-1 mb-0">{ch.statusMessage}</p>
      {ch.status === "ok" && ch.profit && (
        <div className="mt-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-[#92929d]">Resale ({ch.resaleBasis})</span>
            <span className="text-[#f5f5f7] font-mono">${ch.resalePrice?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#92929d]">Fees + postage + cost</span>
            <span className="text-[#ff453a] font-mono">-${ch.profit.totalCosts.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="text-[#f5f5f7]">Net profit</span>
            <span className={`font-mono ${ch.profit.netProfit > 0 ? "text-[#30d158]" : "text-[#ff453a]"}`}>
              ${ch.profit.netProfit.toFixed(2)}
              {Number.isFinite(ch.profit.roiPct) ? ` (${ch.profit.roiPct.toFixed(0)}% ROI)` : ""}
            </span>
          </div>
          {ch.matchUrl && (
            <a href={ch.matchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0a84ff] hover:underline">
              {ch.matchedTitle?.slice(0, 70)} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

const CouponBadge: React.FC<{ merchant?: string }> = ({ merchant }) => {
  const [coupon, setCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!merchant) {
      setCoupon(null);
      return;
    }
    fetchCouponsForMerchant(merchant).then((coupons) => {
      if (!cancelled) setCoupon(coupons[0] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [merchant]);

  if (!coupon) return null;

  return (
    <div className="rounded-xl border border-[#ff9800] bg-[#ff9800]/10 p-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-xs font-bold text-[#ff9800] flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" /> {coupon.merchant} coupon: {coupon.discountText}
        </div>
        <code className="text-sm text-[#f5f5f7] bg-[#0b0b0d] px-2 py-0.5 rounded mt-1 inline-block">{coupon.code}</code>
      </div>
      <a
        href={coupon.affiliateUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-xs font-bold text-black bg-[#ff9800] px-3 py-1.5 rounded-lg hover:brightness-110"
      >
        Claim
      </a>
    </div>
  );
};

export const SpreadFinder: React.FC<{ prefill?: SpreadFinderPrefill }> = ({ prefill }) => {
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [buyPrice, setBuyPrice] = useState(prefill?.buyPrice?.toString() ?? "");
  const [upc, setUpc] = useState("");
  const [weightLb, setWeightLb] = useState("");
  const [report, setReport] = useState<SpreadReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setReport(null);
    const price = parseFloat(buyPrice);
    if (!title.trim() || !Number.isFinite(price) || price < 0) {
      setError("Enter an item name and what you'd pay.");
      return;
    }
    const weight = parseFloat(weightLb);
    setLoading(true);
    try {
      const res = await fetch("/api/arbitrage/spread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          buyPrice: price,
          upc: upc.trim() || undefined,
          store: prefill?.store,
          pkg: Number.isFinite(weight) && weight > 0 ? { lengthIn: 10, widthIn: 8, heightIn: 4, weightLb: weight } : undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setReport(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-[#18181c] p-4 sm:p-5 rounded-2xl border-2 border-[#30d158] shadow-xl" aria-labelledby="spread-heading">
      <h3 id="spread-heading" className="text-base sm:text-lg font-bold text-[#30d158] m-0">Spread Finder</h3>
      <p className="text-xs text-[#92929d] mt-1 mb-3">
        Cross-checks a find against live eBay (Browse API) and Amazon (Creators API) prices, then applies real fees. Only
        marketplace data counts. A spread is flagged at $10+ net and 50%+ ROI.
      </p>

      <form onSubmit={run} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
        <input className={`${inputCls} sm:col-span-2`} placeholder="Item name (e.g. Milwaukee M18 drill kit)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={inputCls} placeholder="Buy price $" inputMode="decimal" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} />
        <input className={inputCls} placeholder="UPC (optional)" inputMode="numeric" value={upc} onChange={(e) => setUpc(e.target.value)} />
        <input className={inputCls} placeholder="Weight lb (optional)" inputMode="decimal" value={weightLb} onChange={(e) => setWeightLb(e.target.value)} />
        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-5 flex items-center justify-center gap-2 py-2 rounded-lg bg-[#30d158] text-black font-bold text-sm hover:brightness-110 active:scale-[0.99] disabled:opacity-60 transition"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? "Checking live prices…" : "Check spread"}
        </button>
      </form>

      {error && <p className="text-sm text-[#ff453a] mt-3 mb-0">{error}</p>}

      {report && (
        <div className="mt-4 space-y-2.5">
          {report.packageAssumed && (
            <p className="text-[11px] text-[#ff9f0a] m-0">No weight given. Postage and FBA fees assume a 1 lb, 10×8×4 in package.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {report.channels.map((ch) => (
              <ChannelRow key={ch.channel} ch={ch} />
            ))}
          </div>
          <CouponBadge merchant={prefill?.store} />
        </div>
      )}
    </section>
  );
};
