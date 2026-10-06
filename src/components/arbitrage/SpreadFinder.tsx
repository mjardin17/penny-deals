import React, { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Search, ThumbsDown, XCircle } from "lucide-react";
import { CHANNEL_LABELS, ProfitResult, SalesChannel } from "../../../shared/fees";

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
  brain?: { blockedListingsSkipped: number; calibrationApplied: boolean };
}

interface PricePoint {
  price: number;
  store?: string;
  seenAt: number;
}

interface SpreadReport {
  yourPriceHistory?: { count: number; last?: PricePoint; lowest?: PricePoint };
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

const ChannelRow: React.FC<{ ch: ChannelSpread; onWrongMatch?: (matchUrl: string) => void }> = ({ ch, onWrongMatch }) => {
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
          {ch.matchUrl && onWrongMatch && (
            <button
              type="button"
              onClick={() => onWrongMatch(ch.matchUrl as string)}
              className="flex items-center gap-1 text-[11px] text-[#ff9f0a] hover:underline cursor-pointer bg-transparent border-0 p-0"
            >
              <ThumbsDown className="w-3 h-3" /> Not the same item (never use it again)
            </button>
          )}
          {ch.brain && ch.brain.blockedListingsSkipped > 0 && (
            <p className="text-[11px] text-[#92929d] m-0">Skipped {ch.brain.blockedListingsSkipped} listing(s) you marked as the wrong item.</p>
          )}
        </div>
      )}
    </div>
  );
}

export const SpreadFinder: React.FC<{ prefill?: SpreadFinderPrefill }> = ({ prefill }) => {
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [buyPrice, setBuyPrice] = useState(prefill?.buyPrice?.toString() ?? "");
  const [upc, setUpc] = useState("");
  const [store, setStore] = useState(prefill?.store ?? "");
  // Only a price a person typed is remembered; pre-filled numbers (sample deals, calculators) never are.
  const [priceTyped, setPriceTyped] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [weightLb, setWeightLb] = useState("");
  const [report, setReport] = useState<SpreadReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
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
          title: prefill?.store && title.startsWith(`${prefill.store}: `) ? title.slice(prefill.store.length + 2) : title,
          buyPrice: price,
          upc: upc.trim() || undefined,
          store: store.trim() || undefined,
          priceIsUserTyped: priceTyped,
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

  const markWrongMatch = async (matchUrl: string) => {
    try {
      const res = await fetch("/api/brain/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "wrong_match", title, upc: upc.trim() || undefined, matchUrl }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setNotice("Got it. That listing won't be used for this item again. Check the spread again for a new match.");
    } catch (err) {
      setNotice(`Could not save that: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const mine = report?.yourPriceHistory;

  return (
    <section className="bg-[#18181c] p-4 sm:p-5 rounded-2xl border-2 border-[#30d158] shadow-xl" aria-labelledby="spread-heading">
      <h3 id="spread-heading" className="text-base sm:text-lg font-bold text-[#30d158] m-0">Spread Finder</h3>
      <p className="text-xs text-[#92929d] mt-1 mb-3">
        Cross-checks a find against live eBay (Browse API) and Amazon (Creators API) prices, then applies real fees. Only
        marketplace data counts. A spread is flagged at $10+ net and 50%+ ROI.
      </p>

      <form onSubmit={run} className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
        <input className={`${inputCls} sm:col-span-2`} placeholder="Item name (e.g. Milwaukee M18 drill kit)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={inputCls} placeholder="Buy price $" inputMode="decimal" value={buyPrice} onChange={(e) => { setBuyPrice(e.target.value); setPriceTyped(true); }} />
        <input className={inputCls} placeholder="UPC (optional)" inputMode="numeric" value={upc} onChange={(e) => setUpc(e.target.value)} />
        <input className={inputCls} placeholder="Weight lb (optional)" inputMode="decimal" value={weightLb} onChange={(e) => setWeightLb(e.target.value)} />
        <input className={inputCls} placeholder="Store (optional)" value={store} onChange={(e) => setStore(e.target.value)} />
        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-6 flex items-center justify-center gap-2 py-2 rounded-lg bg-[#30d158] text-black font-bold text-sm hover:brightness-110 active:scale-[0.99] disabled:opacity-60 transition"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? "Checking live prices…" : "Check spread"}
        </button>
      </form>

      {error && <p className="text-sm text-[#ff453a] mt-3 mb-0">{error}</p>}
      {notice && <p className="text-sm text-[#ff9f0a] mt-3 mb-0">{notice}</p>}

      {report && (
        <div className="mt-4 space-y-2.5">
          {report.packageAssumed && (
            <p className="text-[11px] text-[#ff9f0a] m-0">No weight given. Postage and FBA fees assume a 1 lb, 10×8×4 in package.</p>
          )}
          {mine && mine.count > 0 && mine.last && (
            <p className="text-[11px] text-[#92929d] m-0">
              Before this check you had saved {mine.count} price(s) for this item. Last: ${mine.last.price.toFixed(2)}
              {mine.last.store ? ` at ${mine.last.store}` : ""}
              {mine.lowest && mine.count > 1 ? `. Lowest: $${mine.lowest.price.toFixed(2)}${mine.lowest.store ? ` at ${mine.lowest.store}` : ""}` : ""}.
            </p>
          )}
          {!priceTyped && (
            <p className="text-[11px] text-[#92929d] m-0">This price was pre-filled, so it was not saved. Type the price you see on the shelf to remember it.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {report.channels.map((ch) => (
              <ChannelRow key={ch.channel} ch={ch} onWrongMatch={markWrongMatch} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
