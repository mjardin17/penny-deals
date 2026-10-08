import React, { useMemo, useState } from "react";
import { AlertTriangle, DollarSign, Info } from "lucide-react";
import {
  AMAZON_REFERRAL_RULES,
  AmazonCategory,
  breakEvenPrice,
  calculateProfit,
  CHANNEL_LABELS,
  EBAY_CATEGORY_LABELS,
  EbayCategory,
  FEE_SOURCES,
  FEE_TABLES_RETRIEVED,
  ProfitInput,
  ProfitResult,
  SalesChannel,
  SHIPPING_METHOD_LABELS,
  ShippingMethod,
  ShippingRateUnavailableError,
  TIKTOK_REFERRAL_RATES,
  TiktokCategory,
  UspsZone,
} from "../../../shared/fees";
import { canCalculateProfit, defaultedAssumptions, PROFIT_DEFAULTS } from "./profitReadiness";

export interface ProfitCalculatorPrefill {
  title?: string;
  buyPrice?: number;
  salePrice?: number;
}

interface ProfitCalculatorProps {
  prefill?: ProfitCalculatorPrefill;
}

const CHANNELS: SalesChannel[] = ["ebay", "amazonFba", "amazonFbm", "tiktok"];
const ZONES: UspsZone[] = [1, 2, 3, 4, 5, 6, 7, 8];

const inputCls =
  "w-full bg-[#222227] border border-[#2c2c35] rounded-lg px-2.5 py-1.5 text-sm text-[#f5f5f7] focus:border-[#ff9800] outline-none";
const labelCls = "block text-[11px] font-semibold text-[#92929d] mb-1 uppercase tracking-wide";

function money(n: number): string {
  return `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}`;
}

/** value null = the box is empty. onBlank (when given) is called if the person clears the box. */
function NumberField(props: { label: string; value: number | null; step?: number; onChange: (n: number) => void; onBlank?: () => void }) {
  return (
    <label className="block">
      <span className={labelCls}>{props.label}</span>
      <input
        type="number"
        min={0}
        step={props.step ?? 0.01}
        value={props.value !== null && Number.isFinite(props.value) ? props.value : ""}
        onChange={(e) => (e.target.value === "" && props.onBlank ? props.onBlank() : props.onChange(Math.max(0, parseFloat(e.target.value) || 0)))}
        className={inputCls}
      />
    </label>
  );
}

function SelectField<T extends string | number>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{props.label}</span>
      <select
        value={String(props.value)}
        onChange={(e) => {
          const found = props.options.find((o) => String(o.value) === e.target.value);
          if (found) props.onChange(found.value);
        }}
        className={inputCls}
      >
        {props.options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type ChannelOutcome = { channel: SalesChannel; result?: ProfitResult; breakEven?: number; error?: string };

const ChannelCard: React.FC<{ outcome: ChannelOutcome; best: boolean }> = ({ outcome, best }) => {
  const { channel, result, breakEven, error } = outcome;
  const positive = (result?.netProfit ?? 0) > 0;
  return (
    <div
      className={`rounded-xl border p-3 bg-[#18181c] flex flex-col gap-2 ${
        best ? "border-[#30d158] shadow-[0_0_0_1px_#30d158]" : "border-[#2c2c35]"
      }`}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-[#f5f5f7] m-0">{CHANNEL_LABELS[channel]}</h4>
        {best && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#30d158] text-black">BEST</span>}
      </div>

      {error && (
        <p className="text-xs text-[#ff9f0a] flex gap-1.5 m-0">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
        </p>
      )}

      {result && (
        <>
          <div className="text-xs space-y-1">
            <div className="flex justify-between text-[#92929d]">
              <span>Revenue</span>
              <span className="text-[#f5f5f7]">{money(result.grossRevenue)}</span>
            </div>
            {result.lines.map((l) => (
              <div key={l.label} className="flex justify-between text-[#92929d] gap-2">
                <span title={l.sourceKey === "input" ? "Your input" : FEE_SOURCES[l.sourceKey]?.table}>{l.label}</span>
                <span className="text-[#ff453a] shrink-0">-{money(l.amount)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#2c2c35] pt-2 flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase text-[#92929d] font-semibold">Net profit</div>
              <div className={`text-xl font-black ${positive ? "text-[#30d158]" : "text-[#ff453a]"}`}>
                {money(result.netProfit)}
              </div>
            </div>
            <div className="text-right text-[11px] text-[#92929d]">
              <div>
                ROI <strong className="text-[#f5f5f7]">{Number.isFinite(result.roiPct) ? `${result.roiPct.toFixed(0)}%` : "∞"}</strong>
              </div>
              <div>
                Margin <strong className="text-[#f5f5f7]">{result.marginPct.toFixed(1)}%</strong>
              </div>
              {breakEven !== undefined && (
                <div>
                  Break-even <strong className="text-[#f5f5f7]">{money(breakEven)}</strong>
                </div>
              )}
            </div>
          </div>
          {!result.feesVerified && (
            <p className="text-[11px] text-[#ff9f0a] m-0">Includes an unverified fee. Confirm before buying.</p>
          )}
          {result.notes.map((n) => (
            <p key={n} className="text-[11px] text-[#92929d] m-0">
              {n}
            </p>
          ))}
        </>
      )}
    </div>
  );
}

export const ProfitCalculator: React.FC<ProfitCalculatorProps> = ({ prefill }) => {
  // Start empty: a made-up sale price or cost would show made-up profit. Numbers only appear once you type real ones.
  const [salePrice, setSalePrice] = useState<number | null>(prefill?.salePrice ?? null);
  const [cogs, setCogs] = useState<number | null>(prefill?.buyPrice ?? null);
  const [buyerShipping, setBuyerShipping] = useState(0);
  const [weightLb, setWeightLb] = useState(PROFIT_DEFAULTS.weightLb);
  const [dims, setDims] = useState(PROFIT_DEFAULTS.dims);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>(PROFIT_DEFAULTS.shippingMethod);
  const [zone, setZone] = useState<UspsZone>(PROFIT_DEFAULTS.zone);
  const [handling, setHandling] = useState(PROFIT_DEFAULTS.handling);
  const [ebayCategory, setEbayCategory] = useState<EbayCategory>("most");
  const [ebayPromotedPct, setEbayPromotedPct] = useState(PROFIT_DEFAULTS.ebayPromotedPct);
  const [ebayTaxPct, setEbayTaxPct] = useState(PROFIT_DEFAULTS.ebayTaxPct);
  const [amazonCategory, setAmazonCategory] = useState<AmazonCategory>("everythingElse");
  const [fbaInbound, setFbaInbound] = useState(PROFIT_DEFAULTS.fbaInbound);
  const [tiktokCategory, setTiktokCategory] = useState<TiktokCategory>("standard");
  const [tiktokAffiliatePct, setTiktokAffiliatePct] = useState(0);

  const hasInputs = canCalculateProfit(salePrice, cogs);
  const assumptions = defaultedAssumptions({ weightLb, dims, shippingMethod, zone, handling, ebayPromotedPct, ebayTaxPct, fbaInbound });

  const outcomes = useMemo<ChannelOutcome[]>(() => {
    if (!hasInputs || salePrice === null || cogs === null) return [];
    const shared: Omit<ProfitInput, "channel" | "salePrice"> = {
      cogs,
      buyerShipping,
      pkg: { ...dims, weightLb },
      shippingMethod,
      zone,
      handling,
      ebayCategory,
      ebayPromotedRate: ebayPromotedPct / 100,
      ebayBuyerSalesTaxRate: ebayTaxPct / 100,
      amazonCategory,
      fbaInboundPerUnit: fbaInbound,
      tiktokCategory,
      tiktokAffiliateRate: tiktokAffiliatePct / 100,
    };
    return CHANNELS.map((channel) => {
      try {
        const input = { ...shared, channel };
        return { channel, result: calculateProfit({ ...input, salePrice }), breakEven: breakEvenPrice(input) };
      } catch (err) {
        const message = err instanceof ShippingRateUnavailableError ? err.message : `Could not calculate: ${String(err)}`;
        return { channel, error: message };
      }
    });
  }, [hasInputs, salePrice, cogs, buyerShipping, weightLb, dims, shippingMethod, zone, handling, ebayCategory, ebayPromotedPct, ebayTaxPct, amazonCategory, fbaInbound, tiktokCategory, tiktokAffiliatePct]);

  const bestChannel = outcomes
    .filter((o) => o.result)
    .reduce<ChannelOutcome | undefined>((best, o) => (!best || o.result!.netProfit > best.result!.netProfit ? o : best), undefined)?.channel;

  return (
    <section className="bg-[#18181c] p-4 sm:p-5 rounded-2xl border-2 border-[#ff9800] shadow-xl" aria-labelledby="profit-calc-heading">
      <header className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h3 id="profit-calc-heading" className="text-base sm:text-lg font-bold text-[#ff9800] flex items-center gap-2 m-0">
            <DollarSign className="w-5 h-5" /> Multi-Channel Profit Calculator
          </h3>
          <p className="text-xs text-[#92929d] m-0 mt-1">
            {prefill?.title ? `${prefill.title} · ` : ""}Real fee tables as of {FEE_TABLES_RETRIEVED}. Hover a line for its source.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
        <NumberField label="Sale price" value={salePrice} onChange={setSalePrice} onBlank={() => setSalePrice(null)} />
        <NumberField label="Your cost (COGS)" value={cogs} onChange={setCogs} onBlank={() => setCogs(null)} />
        <NumberField label="Buyer-paid shipping" value={buyerShipping} onChange={setBuyerShipping} />
        <NumberField label="Handling / packaging" value={handling} onChange={setHandling} />
        <NumberField label="Weight (lb)" value={weightLb} step={0.05} onChange={setWeightLb} />
        <NumberField label="Length (in)" value={dims.lengthIn} step={0.5} onChange={(v) => setDims({ ...dims, lengthIn: v })} />
        <NumberField label="Width (in)" value={dims.widthIn} step={0.5} onChange={(v) => setDims({ ...dims, widthIn: v })} />
        <NumberField label="Height (in)" value={dims.heightIn} step={0.25} onChange={(v) => setDims({ ...dims, heightIn: v })} />
        <SelectField
          label="Ship method"
          value={shippingMethod}
          options={(Object.keys(SHIPPING_METHOD_LABELS) as ShippingMethod[]).map((m) => ({ value: m, label: SHIPPING_METHOD_LABELS[m] }))}
          onChange={setShippingMethod}
        />
        <SelectField label="USPS zone" value={zone} options={ZONES.map((z) => ({ value: z, label: `Zone ${z}` }))} onChange={setZone} />
      </div>

      <details className="mb-4 rounded-xl border border-[#2c2c35] bg-[#222227]/40 p-3">
        <summary className="cursor-pointer text-xs font-bold text-[#f5f5f7]">Channel settings</summary>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
          <SelectField
            label="eBay category"
            value={ebayCategory}
            options={(Object.keys(EBAY_CATEGORY_LABELS) as EbayCategory[]).map((c) => ({ value: c, label: EBAY_CATEGORY_LABELS[c] }))}
            onChange={setEbayCategory}
          />
          <NumberField label="eBay promoted ad %" value={ebayPromotedPct} step={0.5} onChange={setEbayPromotedPct} />
          <NumberField label="Buyer sales tax % (eBay FVF base)" value={ebayTaxPct} step={0.25} onChange={setEbayTaxPct} />
          <SelectField
            label="Amazon category"
            value={amazonCategory}
            options={(Object.keys(AMAZON_REFERRAL_RULES) as AmazonCategory[]).map((c) => ({ value: c, label: AMAZON_REFERRAL_RULES[c].label }))}
            onChange={setAmazonCategory}
          />
          <NumberField label="FBA inbound per unit" value={fbaInbound} onChange={setFbaInbound} />
          <SelectField
            label="TikTok category"
            value={tiktokCategory}
            options={(Object.keys(TIKTOK_REFERRAL_RATES) as TiktokCategory[]).map((c) => ({ value: c, label: TIKTOK_REFERRAL_RATES[c].label }))}
            onChange={setTiktokCategory}
          />
          <NumberField label="TikTok affiliate %" value={tiktokAffiliatePct} step={1} onChange={setTiktokAffiliatePct} />
        </div>
      </details>

      {!hasInputs && (
        <p className="text-xs text-[#92929d] m-0 mb-1" role="status">
          Enter a sale price and your cost (both above $0) to see the numbers. Nothing is assumed for you.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {outcomes.map((o) => (
          <ChannelCard key={o.channel} outcome={o} best={o.channel === bestChannel && (o.result?.netProfit ?? 0) > 0} />
        ))}
      </div>

      {hasInputs && assumptions.length > 0 && (
        <div className="mt-3 rounded-xl border border-[#ff9f0a]/40 bg-[#ff9f0a]/5 p-3" role="note">
          <p className="text-[11px] font-bold text-[#ff9f0a] m-0 mb-1 uppercase tracking-wide">Assumptions, not your numbers</p>
          <p className="text-[11px] text-[#92929d] m-0 mb-1.5">
            These are still at their starting values, so the results above use them as guesses. Change them in the boxes above or in Channel settings.
          </p>
          <ul className="text-[11px] text-[#f5f5f7] m-0 pl-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            {assumptions.map((a) => (
              <li key={a.key}>
                {a.label}: <strong>{a.value}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-[#92929d] mt-3 mb-0 flex gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        Postage is USPS published commercial pricing (Jul 12, 2026). Zones and weights round up, so estimates lean
        conservative. Amazon excludes storage, prep and the Professional plan fee.
      </p>
    </section>
  );
};
