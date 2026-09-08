import React, { useState, useMemo } from 'react';
import {
  Zap,
  Sparkles,
  Ticket,
  Tag,
  DollarSign,
  Layers,
  Flame,
  CheckCircle2,
  Copy,
  ExternalLink,
  Scissors,
  Wrench,
  Calculator,
  ShoppingCart,
  Search,
  ChevronDown,
  ChevronUp,
  Percent,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  RotateCcw,
  Gift
} from 'lucide-react';
import { AutoCoupledDeal, StoreCouponOffer, StoreChain } from '../types';
import {
  MOCK_AUTO_COUPLED_DEALS,
  MOCK_STORE_COUPONS,
  autoCoupleCustomItem
} from '../data/autoCouplerData';
import { soundFx } from '../utils/audioFeedback';

interface AutoCouponMaximizerProps {
  zipCode: string;
  onLoadIntoCalculator: (prefill: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => void;
  onAddToCart: (deal: AutoCoupledDeal) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const AutoCouponMaximizer: React.FC<AutoCouponMaximizerProps> = ({
  zipCode,
  onLoadIntoCalculator,
  onAddToCart,
  onNotify,
}) => {
  // Navigation tabs
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'tool_hacks' | 'dg_glitch' | 'multitier' | 'coupons_directory'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('All');
  const [expandedHackId, setExpandedHackId] = useState<string | null>('couple-deal-1');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Simulator Sandbox State
  const [simName, setSimName] = useState('DeWalt 20V XR Reciprocating Saw');
  const [simPrice, setSimPrice] = useState('89.00');
  const [simStore, setSimStore] = useState('Home Depot');
  const [simCategory, setSimCategory] = useState('Tools & Hardware');
  const [customCoupledResult, setCustomCoupledResult] = useState<ReturnType<
    typeof autoCoupleCustomItem
  > | null>(() => autoCoupleCustomItem('DeWalt 20V XR Reciprocating Saw', 89.0, 'Home Depot', 'Tools & Hardware'));

  // Run simulator
  const handleRunSimulator = () => {
    const priceNum = parseFloat(simPrice) || 10.0;
    const result = autoCoupleCustomItem(simName, priceNum, simStore, simCategory);
    setCustomCoupledResult(result);
    soundFx.playCashRegister();
    onNotify(
      `Auto-coupled $${result.totalSaved.toFixed(2)} in savings! Net cost dropped to $${result.finalPrice.toFixed(2)}`,
      'success'
    );
  };

  const handleCopyCode = (codeText: string, offerId: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(offerId);
    soundFx.playStandardScan();
    onNotify(`Copied code "${codeText}" to clipboard!`, 'success');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return MOCK_AUTO_COUPLED_DEALS.filter((deal) => {
      // Category filter
      if (activeCategory === 'tool_hacks' && deal.hackType !== 'Tool Return Hack') return false;
      if (activeCategory === 'dg_glitch' && deal.hackType !== 'Saturday Glitch' && deal.store !== 'Dollar General')
        return false;
      if (
        activeCategory === 'multitier' &&
        deal.hackType !== 'Multi-Tier Stack' &&
        deal.hackType !== 'Rebate Moneymaker'
      )
        return false;

      // Store filter
      if (selectedStoreFilter !== 'All' && !deal.store.toLowerCase().includes(selectedStoreFilter.toLowerCase())) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = deal.title.toLowerCase().includes(q);
        const matchesBrand = deal.brand?.toLowerCase().includes(q);
        const matchesSku = deal.skuOrUpc.toLowerCase().includes(q);
        const matchesCoupons = deal.coupledCoupons.some((c) => c.name.toLowerCase().includes(q));
        if (!matchesTitle && !matchesBrand && !matchesSku && !matchesCoupons) return false;
      }

      return true;
    });
  }, [activeCategory, selectedStoreFilter, searchQuery]);

  return (
    <div className="bg-[#121215] border-2 border-[#ffd60a] rounded-2xl p-4 sm:p-6 mb-6 shadow-2xl relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#ffd60a]/10 via-[#ff9f0a]/5 to-transparent pointer-events-none rounded-full blur-3xl" />

      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#2c2c35] relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-[#ffd60a] text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <Zap className="w-3.5 h-3.5 fill-current" /> Auto-Coupler Engine
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#30d158]/20 text-[#30d158] text-[11px] font-bold border border-[#30d158]/40 flex items-center gap-1">
              <Scissors className="w-3 h-3" /> Auto-Stacking Active
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#0a84ff]/20 text-[#0a84ff] text-[11px] font-bold border border-[#0a84ff]/40">
              Zip {zipCode} Radius
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#f5f5f7] tracking-tight flex items-center gap-2">
            Auto-Coupon & Multi-Layer Profit Maximizer
          </h2>
          <p className="text-xs sm:text-sm text-[#92929d] mt-1 max-w-2xl leading-relaxed">
            Automatically stacks store promo codes, digital manufacturer coupons, store card 5% perks, rebate apps (Ibotta/Fetch), and <strong>BOGO tool return hacks</strong> to drop purchase prices to pennies or generate free moneymakers.
          </p>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex items-center gap-2.5 sm:self-end shrink-0">
          <div className="bg-[#18181c] border border-[#2c2c35] px-3 py-2 rounded-xl text-center">
            <div className="text-[10px] uppercase font-bold text-[#92929d]">Avg Sourcing Drop</div>
            <div className="text-base sm:text-lg font-black text-[#30d158] font-mono">-58.4%</div>
          </div>
          <div className="bg-[#18181c] border border-[#2c2c35] px-3 py-2 rounded-xl text-center">
            <div className="text-[10px] uppercase font-bold text-[#92929d]">Coupled Deals</div>
            <div className="text-base sm:text-lg font-black text-[#ffd60a] font-mono">{MOCK_AUTO_COUPLED_DEALS.length} Active</div>
          </div>
        </div>
      </div>

      {/* Interactive Universal Simulator Sandbox */}
      <div className="my-5 bg-[#18181c] border border-[#ffd60a]/30 rounded-xl p-4 sm:p-5 relative shadow-inner">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#ffd60a]/10 text-[#ffd60a]">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-[#f5f5f7]">
              Instant Auto-Coupler Sandbox (Simulate Any Item)
            </h3>
          </div>
          <span className="text-[11px] text-[#ffd60a] font-semibold">
            Test any clearance item or receipt item below
          </span>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-3">
          <div className="sm:col-span-5">
            <label className="text-[10px] font-bold text-[#92929d] uppercase block mb-1">
              Item Name / Description
            </label>
            <input
              type="text"
              value={simName}
              onChange={(e) => setSimName(e.target.value)}
              placeholder="e.g. Milwaukee M18 Drill or Tide Pods"
              className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-lg text-xs sm:text-sm text-[#f5f5f7] focus:border-[#ffd60a] outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-[#92929d] uppercase block mb-1">
              Shelf Price ($)
            </label>
            <input
              type="number"
              step="any"
              value={simPrice}
              onChange={(e) => setSimPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-lg text-xs sm:text-sm text-[#f5f5f7] font-mono focus:border-[#ffd60a] outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="text-[10px] font-bold text-[#92929d] uppercase block mb-1">
              Store Chain
            </label>
            <select
              value={simStore}
              onChange={(e) => setSimStore(e.target.value)}
              className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-lg text-xs sm:text-sm text-[#f5f5f7] focus:border-[#ffd60a] outline-none"
            >
              <option value="Dollar General">Dollar General</option>
              <option value="Home Depot">The Home Depot</option>
              <option value="Lowe's">Lowe's</option>
              <option value="Target">Target</option>
              <option value="Walmart">Walmart</option>
              <option value="Harbor Freight">Harbor Freight</option>
              <option value="CVS / Walgreens">CVS / Walgreens</option>
              <option value="Best Buy">Best Buy</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="button"
              onClick={handleRunSimulator}
              className="w-full py-2 bg-gradient-to-r from-[#ffd60a] to-[#ff9f0a] hover:from-[#ffc107] hover:to-[#ff8800] text-black font-black text-xs rounded-lg transition-transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Auto-Couple</span>
            </button>
          </div>
        </div>

        {/* Simulator Results Cascade */}
        {customCoupledResult && (
          <div className="mt-3 pt-3 border-t border-[#2c2c35] bg-[#121215]/80 rounded-xl p-3 sm:p-4 border border-[#2c2c35]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#92929d]">Waterfall Optimization:</span>
                <span className="text-xs line-through text-[#92929d] font-mono">
                  ${parseFloat(simPrice).toFixed(2)} Shelf
                </span>
                <ArrowRight className="w-3 h-3 text-[#ffd60a]" />
                <span className="text-xs text-[#ff453a] font-mono font-bold">
                  -${customCoupledResult.totalSaved.toFixed(2)} Stacked Coupons
                </span>
                <ArrowRight className="w-3 h-3 text-[#30d158]" />
                <span className="text-sm font-black text-[#30d158] font-mono bg-[#30d158]/10 px-2 py-0.5 rounded border border-[#30d158]/30">
                  ${customCoupledResult.finalPrice.toFixed(2)} Net Out-of-Pocket
                </span>
                {customCoupledResult.isMoneymaker && (
                  <span className="px-2 py-0.5 rounded-full bg-[#30d158] text-black font-black text-[10px] animate-pulse">
                    🎉 MONEYMAKER / OVERAGE
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onLoadIntoCalculator({
                      name: `${simStore}: ${simName} (Auto-Coupled Stack)`,
                      buy: customCoupledResult.finalPrice.toFixed(2),
                      sell: customCoupledResult.coupledDeal.estResalePrice.toFixed(2),
                      store: simStore,
                    });
                    soundFx.playStandardScan();
                    onNotify(`Loaded auto-coupled item into Arbitrage Calculator!`, 'info');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#ffd60a] border border-[#ffd60a]/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Send to Calc</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(customCoupledResult.coupledDeal);
                    soundFx.playCashRegister();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#30d158] hover:bg-[#28b84d] text-black text-xs font-black flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Add Coupled Deal</span>
                </button>
              </div>
            </div>

            {/* Applied Layers Chips */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              {customCoupledResult.appliedLayers.map((layer) => (
                <div
                  key={layer.id}
                  className="px-2.5 py-1 rounded-lg bg-[#222227] border border-[#2c2c35] flex items-center gap-1.5 text-[#f5f5f7]"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#30d158]" />
                  <span className="font-semibold">{layer.name}</span>
                  <span className="font-mono text-[#ffd60a] font-bold">
                    -${layer.discountValue.toFixed(2)}
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-[#92929d]">
                    {layer.appSource}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex items-center justify-between gap-3 my-4 overflow-x-auto pb-1 text-xs">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'all'
                ? 'bg-[#ffd60a] text-black shadow-md font-black'
                : 'bg-[#18181c] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Top Auto-Coupled Deals</span>
            <span className="text-[10px] px-1.5 rounded-full bg-black/20">
              {MOCK_AUTO_COUPLED_DEALS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('tool_hacks')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'tool_hacks'
                ? 'bg-[#f96302] text-white shadow-md font-black'
                : 'bg-[#18181c] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>🪓 Tool Return Hacks (BOGO Proration)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('dg_glitch')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'dg_glitch'
                ? 'bg-[#ff9800] text-black shadow-md font-black'
                : 'bg-[#18181c] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <span>🟡 DG Saturday $5/$25 Glitch Stacks</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('multitier')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'multitier'
                ? 'bg-[#ff3b30] text-white shadow-md font-black'
                : 'bg-[#18181c] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Target & Lowe's Stacks</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('coupons_directory')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeCategory === 'coupons_directory'
                ? 'bg-[#0a84ff] text-white shadow-md font-black'
                : 'bg-[#18181c] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>🎫 Active Store Coupons Vault</span>
            <span className="text-[10px] px-1.5 rounded-full bg-black/20">
              {MOCK_STORE_COUPONS.length}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[200px] shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deals, tools, coupons..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#18181c] border border-[#2c2c35] rounded-xl text-xs text-[#f5f5f7] placeholder-[#92929d] focus:border-[#ffd60a] outline-none"
          />
          <Search className="w-3.5 h-3.5 text-[#92929d] absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Main Content View */}
      {activeCategory === 'coupons_directory' ? (
        /* Coupons Vault Table */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-2">
          {MOCK_STORE_COUPONS.map((coupon) => (
            <div
              key={coupon.id}
              className="bg-[#18181c] border border-[#2c2c35] hover:border-[#ffd60a]/50 transition-all rounded-xl p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#ffd60a]/10 text-[#ffd60a] font-bold text-xs border border-[#ffd60a]/30">
                    {coupon.store}
                  </span>
                  <span className="text-[11px] text-[#92929d] font-mono">
                    {coupon.expiresOn}
                  </span>
                </div>

                <h4 className="text-sm sm:text-base font-bold text-[#f5f5f7] mb-1">
                  {coupon.title}
                </h4>
                <p className="text-xs text-[#92929d] mb-2 leading-relaxed">
                  {coupon.discountDescription}
                </p>

                <div className="text-[11px] text-[#30d158] bg-[#30d158]/10 p-2 rounded-lg border border-[#30d158]/20 mb-3">
                  <span className="font-bold">Hunter Pro Tip: </span>
                  {coupon.hunterNotes}
                </div>
              </div>

              <div className="pt-2 border-t border-[#2c2c35] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#92929d] uppercase font-bold">Code:</span>
                  <span className="text-xs font-mono font-bold text-[#ffd60a] bg-black/40 px-2 py-0.5 rounded border border-[#2c2c35]">
                    {coupon.code || 'CLIP IN APP'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {coupon.code && (
                    <button
                      type="button"
                      onClick={() => handleCopyCode(coupon.code || '', coupon.id)}
                      className="px-2 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#f5f5f7] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3 h-3 text-[#ffd60a]" />
                      <span>{copiedCode === coupon.id ? 'Copied!' : 'Copy'}</span>
                    </button>
                  )}
                  {coupon.clipUrl && (
                    <a
                      href={coupon.clipUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-[#ffd60a] hover:bg-[#ffc107] text-black text-xs font-black flex items-center gap-1 transition-colors"
                    >
                      <span>Clip</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Auto-Coupled Deals Grid */
        <div className="grid grid-cols-1 gap-4 mt-2">
          {filteredDeals.length === 0 ? (
            <div className="text-center py-12 bg-[#18181c] rounded-xl border border-[#2c2c35]">
              <Ticket className="w-8 h-8 text-[#92929d] mx-auto mb-2" />
              <p className="text-sm text-[#f5f5f7] font-bold">No deals matched your search.</p>
              <p className="text-xs text-[#92929d] mt-1">Try resetting filters or searching another keyword.</p>
            </div>
          ) : (
            filteredDeals.map((deal) => {
              const isHackExpanded = expandedHackId === deal.id;
              return (
                <div
                  key={deal.id}
                  className={`bg-[#18181c] border rounded-xl p-4 sm:p-5 transition-all shadow-lg ${
                    deal.isMoneymaker
                      ? 'border-[#30d158] shadow-[#30d158]/10'
                      : deal.hackType === 'Tool Return Hack'
                      ? 'border-[#f96302]/60 hover:border-[#f96302]'
                      : 'border-[#2c2c35] hover:border-[#ffd60a]/50'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#2c2c35]/70">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                            deal.store === 'Home Depot'
                              ? 'bg-[#f96302]/20 text-[#f96302] border border-[#f96302]/40'
                              : deal.store === "Lowe's"
                              ? 'bg-[#004990]/30 text-[#60a5fa] border border-[#004990]'
                              : deal.store === 'Dollar General'
                              ? 'bg-[#ff9800]/20 text-[#ff9800] border border-[#ff9800]/40'
                              : deal.store === 'Target'
                              ? 'bg-[#ff3b30]/20 text-[#ff3b30] border border-[#ff3b30]/40'
                              : 'bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/40'
                          }`}
                        >
                          {deal.store}
                        </span>

                        {deal.hackType && (
                          <span className="px-2 py-0.5 rounded bg-[#ffd60a]/20 text-[#ffd60a] font-bold text-[11px] border border-[#ffd60a]/40 flex items-center gap-1">
                            <Scissors className="w-2.5 h-2.5" />
                            {deal.hackType}
                          </span>
                        )}

                        {deal.isMoneymaker && (
                          <span className="px-2 py-0.5 rounded-full bg-[#30d158] text-black font-black text-[10px] uppercase">
                            Free / Moneymaker
                          </span>
                        )}

                        <span className="text-[11px] text-[#92929d] font-mono">
                          {deal.skuOrUpc}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-[#f5f5f7]">
                        {deal.title}
                      </h3>
                      <div className="text-xs text-[#92929d] mt-0.5 flex items-center gap-2">
                        <span>Category: <strong className="text-[#f5f5f7]">{deal.category}</strong></span>
                        <span>•</span>
                        <span className="text-[#30d158] font-semibold">{deal.hunterVerifiedDate}</span>
                      </div>
                    </div>

                    {/* Price Waterfall Summary Card */}
                    <div className="flex items-center gap-3 bg-[#222227] p-3 rounded-xl border border-[#2c2c35] shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-[#92929d]">Original Retail</div>
                        <div className="text-xs text-[#92929d] line-through font-mono">
                          ${deal.originalRetailPrice.toFixed(2)}
                        </div>
                      </div>

                      <div className="text-right pl-2 border-l border-[#2c2c35]">
                        <div className="text-[10px] uppercase font-bold text-[#ffd60a]">Coupled Buy Cost</div>
                        <div className="text-base sm:text-lg font-black text-[#30d158] font-mono">
                          ${deal.finalNetBuyCost.toFixed(2)}
                        </div>
                      </div>

                      <div className="text-right pl-2 border-l border-[#2c2c35]">
                        <div className="text-[10px] uppercase font-bold text-[#92929d]">Net Resell Profit</div>
                        <div className="text-base sm:text-lg font-black text-[#ffd60a] font-mono">
                          +${deal.estNetProfit.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#30d158] font-bold font-mono">
                          {deal.roiPct}% ROI
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Applied Coupons Multi-Stack Layers */}
                  <div className="mt-3">
                    <div className="text-[11px] font-bold text-[#92929d] uppercase mb-1.5 flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-[#ffd60a]" />
                      <span>Coupled Savings Stack ({deal.coupledCoupons.length} Active Layers):</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {deal.coupledCoupons.map((coupon) => (
                        <div
                          key={coupon.id}
                          className="bg-[#222227] border border-[#2c2c35] rounded-lg p-2.5 flex items-start justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-1 text-[11px] font-bold text-[#f5f5f7]">
                              <CheckCircle2 className="w-3 h-3 text-[#30d158] shrink-0" />
                              <span className="line-clamp-1">{coupon.name}</span>
                            </div>
                            <div className="text-[10px] text-[#92929d] mt-0.5">
                              Source: <span className="text-[#ffd60a]">{coupon.appSource}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-bold text-[#30d158]">
                              -${coupon.discountValue.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tool Return Hack Proration Walkthrough Drawer */}
                  {deal.hackDetails && (
                    <div className="mt-3 pt-3 border-t border-[#2c2c35]">
                      <button
                        type="button"
                        onClick={() => setExpandedHackId(isHackExpanded ? null : deal.id)}
                        className="w-full flex items-center justify-between text-xs font-bold text-[#f96302] hover:text-[#ff7824] p-2 bg-[#f96302]/10 rounded-lg border border-[#f96302]/30 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5" />
                          <span>View Step-by-Step Return Hack Recipe & Prorated Receipt Breakdown</span>
                        </div>
                        {isHackExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isHackExpanded && (
                        <div className="mt-2 p-3.5 bg-[#121215] border border-[#f96302]/40 rounded-xl text-xs space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#18181c] p-2.5 rounded-lg border border-[#2c2c35] text-center font-mono">
                            <div>
                              <span className="text-[10px] text-[#92929d] uppercase block">Prorated Receipt Return</span>
                              <span className="text-sm font-bold text-[#30d158]">${deal.hackDetails.receiptReturnRefundValue.toFixed(2)} Refund</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#92929d] uppercase block">Kept Tool Cost</span>
                              <span className="text-sm font-bold text-[#ffd60a]">${deal.hackDetails.netKeptItemCost.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#92929d] uppercase block">Resale Market Comp</span>
                              <span className="text-sm font-bold text-[#f5f5f7]">${deal.estResalePrice.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <span className="font-bold text-[#f5f5f7] block">Instructions to Execute:</span>
                            {deal.hackDetails.stepByStepInstructions.map((step, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-[#92929d]">
                                <span className="w-4 h-4 rounded-full bg-[#f96302]/20 text-[#f96302] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <p className="leading-tight">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="mt-3.5 pt-3 border-t border-[#2c2c35] flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs text-[#92929d]">
                      Saves <strong className="text-[#30d158] font-mono">${deal.totalCouponSavings.toFixed(2)}</strong> off shelf price
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onLoadIntoCalculator({
                            name: `${deal.store}: ${deal.title} (Coupled)`,
                            buy: deal.finalNetBuyCost.toFixed(2),
                            sell: deal.estResalePrice.toFixed(2),
                            store: deal.store,
                          });
                          soundFx.playStandardScan();
                          onNotify(`Loaded "${deal.title}" with coupled price into Calculator!`, 'info');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#ffd60a] border border-[#ffd60a]/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>Calculator</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onAddToCart(deal);
                          soundFx.playCashRegister();
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#ffd60a] hover:bg-[#ffc107] text-black font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-transform active:scale-95"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Add Coupled Deal to Cart</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
