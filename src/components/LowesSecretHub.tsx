import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Search,
  Filter,
  Flame,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MapPin,
  ExternalLink,
  Calculator,
  ShoppingBag,
  Plus,
  Info,
  Copy,
  Check,
  ScanLine,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { LowesClearanceItem, LowesMarkdownStage } from '../types';
import {
  LOWES_TAG_MATRIX_RULES,
  DEFAULT_LOWES_DEALS,
} from '../data/defaultLowesDeals';

interface LowesSecretHubProps {
  zipCode: string;
  onLoadIntoCalculator: (item: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => void;
  onAddToCart?: (deal: {
    title: string;
    buyPrice: number;
    sellPrice: number;
    store: string;
    category: string;
    notes?: string;
  }) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenScanner?: () => void;
}

export const LowesSecretHub: React.FC<LowesSecretHubProps> = ({
  zipCode,
  onLoadIntoCalculator,
  onAddToCart,
  onNotify,
  onOpenScanner,
}) => {
  const [deals, setDeals] = useState<LowesClearanceItem[]>(() => {
    try {
      const saved = localStorage.getItem('lowesClearanceDeals');
      return saved ? JSON.parse(saved) : DEFAULT_LOWES_DEALS;
    } catch {
      return DEFAULT_LOWES_DEALS;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterRtvOnly, setFilterRtvOnly] = useState(false);
  const [filterPowerToolsOnly, setFilterPowerToolsOnly] = useState(false);
  const [showTagGuide, setShowTagGuide] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedItemNum, setCopiedItemNum] = useState<string | null>(null);

  // Interactive Price Ending Decoder State
  const [testPrice, setTestPrice] = useState('89.02');

  // Save to localStorage
  const saveDeals = (updated: LowesClearanceItem[]) => {
    setDeals(updated);
    try {
      localStorage.setItem('lowesClearanceDeals', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save Lowe\'s deals', e);
    }
  };

  // Copy Item Number
  const handleCopyItemNumber = (itemNum: string) => {
    navigator.clipboard.writeText(itemNum);
    setCopiedItemNum(itemNum);
    onNotify(`Copied Lowe's Item #${itemNum} to clipboard!`, 'info');
    setTimeout(() => setCopiedItemNum(null), 2000);
  };

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !q ||
        deal.title.toLowerCase().includes(q) ||
        deal.itemNumber.toLowerCase().includes(q) ||
        (deal.modelNumber && deal.modelNumber.toLowerCase().includes(q)) ||
        deal.upc.toLowerCase().includes(q) ||
        deal.brand.toLowerCase().includes(q) ||
        deal.category.toLowerCase().includes(q) ||
        deal.bayAisle.toLowerCase().includes(q);

      const matchesCat =
        selectedCategory === 'All' || deal.category === selectedCategory;

      const matchesRtv = !filterRtvOnly || deal.isFinalRtv;
      const matchesPowerTools =
        !filterPowerToolsOnly || deal.category === 'Power Tools';

      return matchesQuery && matchesCat && matchesRtv && matchesPowerTools;
    });
  }, [deals, searchQuery, selectedCategory, filterRtvOnly, filterPowerToolsOnly]);

  // Decode test price for the interactive simulator
  const decodedResult = useMemo(() => {
    const val = testPrice.trim();
    if (!val) return null;
    const num = parseFloat(val);
    if (isNaN(num)) return null;

    if (val.endsWith('.02') || val.endsWith('.03')) {
      return {
        badge: 'PHASE 2 FINAL CLEARANCE (.02 / .03)',
        stage: 'Final Markdown / Imminent RTV Pull',
        color: 'text-[#ff3b30] bg-[#ff3b30]/15 border-[#ff3b30]/40',
        summary: 'Lowest possible markdown price at Lowe’s (75% to 90% off MSRP). Scheduled for Return to Vendor (RTV) or field disposal within 72 hours.',
        action: '🚨 BUY IMMEDIATELY — Floor associates are tasked to remove remaining inventory to back pallets.',
      };
    } else if (val.endsWith('.06') || val.endsWith('.07')) {
      return {
        badge: 'PHASE 1 CLEARANCE (.06 / .07)',
        stage: 'First Major Markdown Cut (25% – 50% Off)',
        color: 'text-[#ffd60a] bg-[#ffd60a]/15 border-[#ffd60a]/40',
        summary: 'Item is actively on clearance. If multiple units remain on the shelf or overhead racks, it will drop to .02 or .03 in 30–45 days.',
        action: 'Solid flip if current margin exceeds 40% ROI; otherwise set a calendar alert for next cut.',
      };
    } else if (val.endsWith('.00')) {
      return {
        badge: 'STORE MANAGER AS-IS SPECIAL (.00)',
        stage: 'Store-Specific Display / Floor Clearance',
        color: 'text-[#34c759] bg-[#34c759]/15 border-[#34c759]/40',
        summary: 'Manager markdown for discontinued display models, damaged packaging, or customer return.',
        action: 'Inspect accessories and negotiate further with department manager if missing box parts.',
      };
    } else {
      return {
        badge: `REGULAR / PROMO PRICING (${val.slice(-3)})`,
        stage: 'Standard Retail Price',
        color: 'text-[#92929d] bg-[#222227] border-[#2c2c35]',
        summary: 'Standard retail or temporary promotional price. Not in the deep yellow tag clearance cycle.',
        action: 'Do not buy for clearance arbitrage unless paired with military/pro discount or manufacturer rebate.',
      };
    }
  }, [testPrice]);

  // Form State for Add Deal Modal
  const [newTitle, setNewTitle] = useState('');
  const [newItemNum, setNewItemNum] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newUpc, setNewUpc] = useState('');
  const [newBrand, setNewBrand] = useState('DeWalt');
  const [newCategory, setNewCategory] = useState('Power Tools');
  const [newOrigPrice, setNewOrigPrice] = useState('');
  const [newCurrPrice, setNewCurrPrice] = useState('');
  const [newBay, setNewBay] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const handleAddDealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCurrPrice) return;

    const curr = parseFloat(newCurrPrice) || 0;
    const orig = parseFloat(newOrigPrice) || curr * 2.5;
    const discount = Math.round(((orig - curr) / orig) * 100);
    const ending = curr.toFixed(2).slice(-3);
    const isRtv = ending === '.02' || ending === '.03';

    const newItem: LowesClearanceItem = {
      id: `lowes-custom-${Date.now()}`,
      title: newTitle.trim(),
      itemNumber: newItemNum.trim() || '0000000',
      modelNumber: newModel.trim() || undefined,
      upc: newUpc.trim() || '000000000000',
      brand: newBrand.trim(),
      category: newCategory,
      originalPrice: orig,
      currentPrice: curr,
      priceEnding: ending,
      stage: isRtv ? 'phase2_final_rtv' : 'phase1_markdown',
      discountPct: discount,
      isFinalRtv: isRtv,
      bayAisle: newBay.trim() || 'Clearance Endcap / Overhead',
      estResale: Math.round(curr * 2.2),
      stockStatus: isRtv ? 'RTV Pull Pending' : 'In Stock',
      hunterNotes: newNotes.trim() || 'Custom user reported yellow tag find.',
    };

    saveDeals([newItem, ...deals]);
    setShowAddModal(false);
    onNotify(`Added "${newItem.title}" to Lowe's Yellow Tag Tracker!`, 'success');

    // Reset Form
    setNewTitle('');
    setNewItemNum('');
    setNewModel('');
    setNewUpc('');
    setNewOrigPrice('');
    setNewCurrPrice('');
    setNewBay('');
    setNewNotes('');
  };

  return (
    <div className="bg-[#18181c] border border-[#004990]/50 rounded-3xl p-4 sm:p-5 shadow-xl space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2c2c35]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#004990]/20 border border-[#004990]/60 flex items-center justify-center text-[#ffd60a] shadow-sm shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-[#f5f5f7] tracking-tight">
                Lowe’s Secret Yellow Tag & Markdown Radar
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#004990] text-[#ffd60a] border border-[#ffd60a]/40 font-black uppercase tracking-wider">
                .02 / .03 RTV Pulls
              </span>
            </div>
            <p className="text-xs text-[#92929d] mt-0.5">
              Decode yellow tag endings (.06/.07 Phase 1 vs .02/.03 Final RTV), date stamps, and top-stock overhead bays.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-3 py-1.5 rounded-xl bg-[#ffd60a] hover:bg-[#ffc107] text-black font-black text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Scan Barcode</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowTagGuide(!showTagGuide)}
            className="px-3 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#f5f5f7] border border-[#2c2c35] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-[#ffd60a]" />
            <span>Yellow Tag Rules</span>
            {showTagGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-xl bg-[#004990] hover:bg-[#003d7a] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border border-[#004990]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Report Yellow Tag</span>
          </button>
        </div>
      </div>

      {/* HUNTER INTEL FLASH BANNER */}
      <div className="p-3 bg-gradient-to-r from-[#004990]/25 via-[#18181c] to-[#ffd60a]/10 border border-[#004990]/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffd60a] animate-pulse shrink-0" />
          <div className="text-xs text-[#f5f5f7]">
            <span className="font-extrabold text-[#ffd60a] uppercase">
              Lowe’s Markdown Rule:
            </span>{' '}
            <span className="text-[#92929d]">
              Prices ending in <strong>.02</strong> or <strong>.03</strong> indicate final 75%–90% RTV status. Scan yellow tags older than 21 days—register often rings lower than the sticker!
            </span>
          </div>
        </div>

        <div className="text-[11px] text-[#ffd60a] font-mono shrink-0 font-bold">
          ZIP {zipCode} Store Proximity
        </div>
      </div>

      {/* EXPANDABLE YELLOW TAG DECODER & PRICE SIMULATOR */}
      {showTagGuide && (
        <div className="p-4 rounded-2xl bg-[#121215] border border-[#004990]/60 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#f5f5f7] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#ffd60a]" /> Lowe’s Yellow Tag Price Ending Secrets
            </h3>
            <span className="text-[11px] text-[#92929d]">Official Store Markdown Hierarchy</span>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {LOWES_TAG_MATRIX_RULES.map((rule, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#18181c] border border-[#2c2c35] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#ffd60a]">{rule.code}</span>
                  <span className="text-[10px] font-bold text-[#f5f5f7]">{rule.stage}</span>
                </div>
                <p className="text-[11px] text-[#92929d] leading-snug">{rule.detail}</p>
                <div className="text-[10px] font-mono text-[#34c759] font-bold">
                  🎯 Strategy: {rule.action}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Tag Price Ending Simulator */}
          <div className="p-3.5 bg-[#18181c] rounded-xl border border-[#2c2c35] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#f5f5f7] flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-[#ffd60a]" /> Interactive Yellow Tag Price Ending Simulator:
              </span>
              <span className="text-[10px] text-[#92929d]">Test .02, .03, .06, or .07</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-sm text-[#92929d] font-mono">$</span>
                <input
                  type="text"
                  value={testPrice}
                  onChange={(e) => setTestPrice(e.target.value)}
                  placeholder="e.g. 89.02 or 34.06"
                  className="w-full pl-7 pr-3 py-1.5 bg-[#222227] border border-[#2c2c35] rounded-lg text-sm text-[#f5f5f7] font-mono outline-none focus:border-[#ffd60a]"
                />
              </div>

              <div className="flex gap-1.5">
                {['89.02', '29.03', '34.06', '49.07'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTestPrice(p)}
                    className="px-2 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[11px] font-mono text-[#ffd60a] border border-[#2c2c35] cursor-pointer"
                  >
                    ${p}
                  </button>
                ))}
              </div>
            </div>

            {decodedResult && (
              <div
                className={`p-2.5 rounded-lg border text-xs space-y-1 ${decodedResult.color}`}
              >
                <div className="flex items-center justify-between">
                  <strong className="font-black">{decodedResult.badge}</strong>
                  <span className="text-[10px] uppercase font-bold">{decodedResult.action}</span>
                </div>
                <p className="text-[11px] leading-snug">{decodedResult.summary}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEARCH & FILTERS */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#92929d] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Lowe's clearance by Item #, Brand (DeWalt, Kobalt), Tool, or Bay..."
              className="w-full pl-9 pr-4 py-2 bg-[#121215] border border-[#2c2c35] rounded-xl text-sm text-[#f5f5f7] placeholder-[#92929d]/60 outline-none focus:border-[#ffd60a]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-[#121215] border border-[#2c2c35] rounded-xl text-xs text-[#f5f5f7] outline-none cursor-pointer focus:border-[#ffd60a]"
            >
              <option value="All">All Categories</option>
              <option value="Power Tools">Power Tools (DeWalt/Kobalt/Craftsman)</option>
              <option value="Lighting & Ceiling Fans">Lighting & Ceiling Fans</option>
              <option value="Bath & Faucets">Bath & Faucets (Allen+Roth/Moen)</option>
              <option value="Patio & Outdoor Living">Patio & Outdoor Living</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Toggles */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => setFilterRtvOnly(!filterRtvOnly)}
            className={`px-2.5 py-1 rounded-lg border font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              filterRtvOnly
                ? 'bg-[#ff3b30] text-white border-[#ff3b30]'
                : 'bg-[#121215] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7]'
            }`}
          >
            <Flame className="w-3 h-3 text-[#ffd60a]" />
            <span>.02 & .03 Final RTV Only</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterPowerToolsOnly(!filterPowerToolsOnly)}
            className={`px-2.5 py-1 rounded-lg border font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              filterPowerToolsOnly
                ? 'bg-[#004990] text-[#ffd60a] border-[#ffd60a]'
                : 'bg-[#121215] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7]'
            }`}
          >
            <Wrench className="w-3 h-3" />
            <span>Power Tools Only</span>
          </button>

          <span className="text-[11px] text-[#92929d] ml-auto">
            Showing <strong className="text-[#f5f5f7]">{filteredDeals.length}</strong> Lowe's clearance finds
          </span>
        </div>
      </div>

      {/* CLEARANCE DEALS CARDS */}
      <div className="space-y-3">
        {filteredDeals.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#121215] border border-[#2c2c35] space-y-2">
            <Wrench className="w-8 h-8 text-[#92929d] mx-auto opacity-50" />
            <h4 className="text-sm font-bold text-[#f5f5f7]">No Lowe's Yellow Tag Deals Found</h4>
            <p className="text-xs text-[#92929d]">
              Try clearing your search filters or report a new yellow tag find in your local store.
            </p>
          </div>
        ) : (
          filteredDeals.map((deal) => {
            const netProfit = (deal.estResale - deal.currentPrice - deal.estResale * 0.13 - 6.5).toFixed(2);
            const roi = Math.round(((parseFloat(netProfit) || 0) / deal.currentPrice) * 100);

            return (
              <div
                key={deal.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-3 ${
                  deal.isFinalRtv
                    ? 'bg-[#18181c] border-[#ff3b30]/60 shadow-md hover:border-[#ff3b30]'
                    : 'bg-[#121215] border-[#2c2c35] hover:border-[#004990]/80'
                }`}
              >
                {/* Top Row: Brand, Category, RTV Badge, Item Number */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#004990] text-[#ffd60a] font-black uppercase tracking-wider border border-[#ffd60a]/30">
                      Lowe's • {deal.brand}
                    </span>

                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#222227] text-[#f5f5f7] border border-[#2c2c35] font-bold">
                      {deal.category}
                    </span>

                    {deal.isFinalRtv ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#ff3b30]/20 text-[#ff3b30] border border-[#ff3b30]/50 font-black flex items-center gap-1 animate-pulse">
                        <Flame className="w-3 h-3 text-[#ffd60a]" />
                        <span>PHASE 2 FINAL RTV ({deal.priceEnding})</span>
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/40 font-bold">
                        Phase 1 Clearance ({deal.priceEnding})
                      </span>
                    )}

                    <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-[#222227] text-[#34c759] font-mono font-bold">
                      {deal.discountPct}% OFF
                    </span>
                  </div>

                  {/* Lowe's Item Number with Copy */}
                  <button
                    type="button"
                    onClick={() => handleCopyItemNumber(deal.itemNumber)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] border border-[#2c2c35] text-[11px] font-mono text-[#ffd60a] transition-colors cursor-pointer"
                    title="Click to copy Item # for Lowe's App or Associate Scanner"
                  >
                    <span>Item #{deal.itemNumber}</span>
                    {copiedItemNum === deal.itemNumber ? (
                      <Check className="w-3 h-3 text-[#34c759]" />
                    ) : (
                      <Copy className="w-3 h-3 text-[#92929d]" />
                    )}
                  </button>
                </div>

                {/* Title and Model */}
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#f5f5f7] leading-snug">
                    {deal.title}
                  </h3>
                  {deal.modelNumber && (
                    <div className="text-[11px] text-[#92929d] font-mono mt-0.5">
                      Model: {deal.modelNumber} • UPC: {deal.upc}
                    </div>
                  )}
                </div>

                {/* Price Breakdown Box */}
                <div className="p-3 bg-[#18181c] border border-[#2c2c35] rounded-xl flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-[10px] text-[#92929d] uppercase font-bold">Lowe's MSRP:</div>
                    <div className="text-xs sm:text-sm font-bold text-[#92929d] line-through font-mono">
                      ${deal.originalPrice.toFixed(2)}
                    </div>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-[#004990] hidden sm:block" />

                  <div>
                    <div className="text-[10px] text-[#34c759] uppercase font-black flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Yellow Tag Scan:
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-[#34c759] font-mono leading-none">
                      ${deal.currentPrice.toFixed(2)}
                    </div>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-[#004990] hidden sm:block" />

                  <div>
                    <div className="text-[10px] text-[#ffd60a] uppercase font-bold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Secondary Comps:
                    </div>
                    <div className="text-base sm:text-lg font-black text-[#ffd60a] font-mono leading-none">
                      ${deal.estResale.toFixed(2)}
                    </div>
                  </div>

                  <div className="text-right pl-2 border-l border-[#2c2c35]">
                    <div className="text-[10px] text-[#34c759] font-bold uppercase">Est. Net Flip:</div>
                    <div className="text-sm font-black text-[#34c759] font-mono">
                      +${netProfit} ({roi}% ROI)
                    </div>
                  </div>
                </div>

                {/* Bay & Aisle Location & Hunter Notes */}
                <div className="text-xs space-y-1 bg-[#121215] p-2.5 rounded-xl border border-[#2c2c35]">
                  <div className="flex items-center gap-1 text-[#f5f5f7]">
                    <MapPin className="w-3.5 h-3.5 text-[#ffd60a] shrink-0" />
                    <strong className="text-[#ffd60a]">In-Store Location:</strong>{' '}
                    <span>{deal.bayAisle}</span>
                  </div>
                  <p className="text-[11px] text-[#92929d] leading-snug">
                    🏷️ <strong>Hunter Strategy:</strong> {deal.hunterNotes}
                  </p>

                  {/* Specific Store and Proximity Distance Badge */}
                  {(() => {
                    const storeObj = deal.closestStore || (deal.inStockStoresNearZip && deal.inStockStoresNearZip[0]);
                    if (!storeObj) return null;
                    return (
                      <div className="pt-2 border-t border-[#2c2c35]/60 mt-1.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] uppercase font-bold text-[#92929d]">Available At:</span>
                            <span className="text-xs font-black text-[#f5f5f7] inline-flex items-center gap-1 bg-[#222227] px-2 py-0.5 rounded-md border border-[#2c2c35]">
                              <MapPin className="w-3 h-3 text-[#0a84ff]" />
                              {storeObj.storeName}
                              {storeObj.address && (
                                <span className="text-[#92929d] font-normal">({storeObj.address})</span>
                              )}
                            </span>
                            <span className="text-xs font-black text-[#ffd60a] bg-[#ffd60a]/10 px-2 py-0.5 rounded-md border border-[#ffd60a]/30">
                              {storeObj.distanceMiles} mi away
                              {storeObj.driveTimeMinutes && ` (${storeObj.driveTimeMinutes} min drive)`}
                            </span>
                          </div>
                          <span className="text-xs text-[#34c759] font-bold bg-[#34c759]/10 px-2 py-0.5 rounded-md border border-[#34c759]/30">
                            {storeObj.stockQty} on shelf
                          </span>
                        </div>

                        {deal.inStockStoresNearZip && deal.inStockStoresNearZip.length > 1 && (
                          <div className="text-[10px] text-[#92929d] flex items-center gap-1.5 flex-wrap pt-0.5 pl-1">
                            <span>Other Lowe's nearby:</span>
                            {deal.inStockStoresNearZip.slice(1).map((s, idx) => (
                              <span key={idx} className="text-[#f5f5f7] bg-[#1c1c22] px-1.5 py-0.5 rounded border border-[#2c2c35]">
                                {s.storeName} ({s.address || s.storeNumber}) • <strong className="text-[#ffd60a]">{s.distanceMiles} mi</strong> ({s.stockQty} in stock)
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Action Buttons */}
                <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <a
                      href={`https://www.lowes.com/search?searchTerm=${encodeURIComponent(deal.itemNumber)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-xs text-[#f5f5f7] border border-[#2c2c35] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>Lowe's App Check</span>
                      <ExternalLink className="w-3 h-3 text-[#92929d]" />
                    </a>

                    <a
                      href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(deal.title)}&LH_Sold=1&LH_Complete=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-xs text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>eBay Solds</span>
                      <ExternalLink className="w-3 h-3 text-[#92929d]" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const lowesStore = deal.closestStore || (deal.inStockStoresNearZip && deal.inStockStoresNearZip[0]);
                        const storeLabel = lowesStore
                          ? `${lowesStore.storeName} (${lowesStore.address || 'Local'}) • ${lowesStore.distanceMiles} mi away`
                          : "Lowe's Home Improvement #1842 (Faunce Corner Rd) • 2.4 mi away";
                        onLoadIntoCalculator({
                          name: `Lowe's: ${deal.title}`,
                          buy: deal.currentPrice.toFixed(2),
                          sell: deal.estResale.toFixed(2),
                          store: storeLabel,
                        });
                        onNotify(`Loaded "${deal.title}" into Flip Calculator`, 'info');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#f5f5f7] border border-[#2c2c35] flex items-center gap-1 cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5 text-[#ffd60a]" />
                      <span>Flip Calc</span>
                    </button>

                    {onAddToCart && (
                      <button
                        type="button"
                        onClick={() => {
                          const lowesStore = deal.closestStore || (deal.inStockStoresNearZip && deal.inStockStoresNearZip[0]);
                          const storeLabel = lowesStore
                            ? `${lowesStore.storeName} (${lowesStore.address || 'Local'}) • ${lowesStore.distanceMiles} mi away`
                            : "Lowe's Home Improvement #1842 (Faunce Corner Rd) • 2.4 mi away";
                          onAddToCart({
                            title: deal.title,
                            buyPrice: deal.currentPrice,
                            sellPrice: deal.estResale,
                            store: storeLabel,
                            category: deal.category,
                            notes: `Item #${deal.itemNumber} • Bay: ${deal.bayAisle} • Store: ${storeLabel}`,
                          });
                          onNotify(`Added "${deal.title}" to Sourcing Cart!`, 'success');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#004990] hover:bg-[#003d7a] text-[#ffd60a] text-xs font-black flex items-center gap-1 transition-colors cursor-pointer shadow-sm border border-[#ffd60a]/40"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add to Cart</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD CUSTOM LOWE'S YELLOW TAG MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2c2c35]">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#ffd60a]" />
                <h3 className="text-base font-black text-[#f5f5f7]">Report Lowe's Yellow Tag Find</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#92929d] hover:text-white text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddDealSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#92929d] block mb-1">Item Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. DeWalt 20V MAX XR Hammerdrill Kit"
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-sm text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-[#92929d] block mb-1">Lowe's Item # (6-7 digits)</label>
                  <input
                    type="text"
                    value={newItemNum}
                    onChange={(e) => setNewItemNum(e.target.value)}
                    placeholder="e.g. 1248902"
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-sm font-mono text-[#ffd60a] outline-none focus:border-[#ffd60a]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#92929d] block mb-1">Brand</label>
                  <input
                    type="text"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="DeWalt, Kobalt, Craftsman..."
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-sm text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-[#92929d] block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-2 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                  >
                    <option value="Power Tools">Power Tools</option>
                    <option value="Lighting & Ceiling Fans">Lighting/Fans</option>
                    <option value="Bath & Faucets">Bath/Faucets</option>
                    <option value="Patio & Outdoor Living">Patio/Outdoor</option>
                    <option value="Hardware">Hardware</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#92929d] block mb-1">Original MSRP ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrigPrice}
                    onChange={(e) => setNewOrigPrice(e.target.value)}
                    placeholder="399.00"
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-sm font-mono text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#34c759] block mb-1">Yellow Tag Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newCurrPrice}
                    onChange={(e) => setNewCurrPrice(e.target.value)}
                    placeholder="89.02"
                    className="w-full px-3 py-2 bg-[#222227] border border-[#34c759]/50 rounded-xl text-sm font-mono text-[#34c759] font-bold outline-none focus:border-[#34c759]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#92929d] block mb-1">Aisle / Bay / Overhead Location</label>
                <input
                  type="text"
                  value={newBay}
                  onChange={(e) => setNewBay(e.target.value)}
                  placeholder="e.g. Aisle 12 Bay 04 Bottom Shelf Cage"
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-sm text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#92929d] block mb-1">Hunter Strategy / Notes</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ends in .02, yellow tag date is 2 weeks old, 2 units remain in overhead pallet..."
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-sm text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#92929d] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#004990] hover:bg-[#003d7a] text-[#ffd60a] border border-[#ffd60a]/40 text-xs font-black cursor-pointer shadow-md"
                >
                  Save Yellow Tag Find
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
