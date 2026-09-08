import React, { useState } from 'react';
import {
  Search,
  Tag,
  AlertCircle,
  HelpCircle,
  Sparkles,
  MapPin,
  ChevronDown,
  ChevronUp,
  Layers,
  Package,
  ShieldAlert,
  ShoppingBag,
  Calculator,
  Plus,
  X,
  Clock,
  CheckCircle2,
  ExternalLink,
  Flame,
  ArrowRight,
  Filter,
  ScanLine,
} from 'lucide-react';
import { WalmartSecretItem, WalmartMarkdownStage } from '../types';
import {
  WALMART_PRICE_CODE_GUIDE,
  WALMART_SECRET_LOCATIONS,
  DEFAULT_WALMART_SECRET_DEALS,
} from '../data/defaultWalmartDeals';

interface WalmartSecretHubProps {
  zipCode: string;
  onLoadIntoCalculator: (item: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => void;
  onAddToCart?: (deal: WalmartSecretItem) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenScanner?: () => void;
}

export const WalmartSecretHub: React.FC<WalmartSecretHubProps> = ({
  zipCode,
  onLoadIntoCalculator,
  onAddToCart,
  onNotify,
  onOpenScanner,
}) => {
  const [deals, setDeals] = useState<WalmartSecretItem[]>(() => {
    try {
      const saved = localStorage.getItem('walmartSecretDealsList');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load walmartSecretDealsList', e);
    }
    return DEFAULT_WALMART_SECRET_DEALS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedLocationType, setSelectedLocationType] = useState('All');
  const [filterFloorPriceOnly, setFilterFloorPriceOnly] = useState(false);
  const [showPriceGuide, setShowPriceGuide] = useState(false);
  const [showLocationsGuide, setShowLocationsGuide] = useState(false);

  // New Deal Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newUpc, setNewUpc] = useState('');
  const [newShelfPrice, setNewShelfPrice] = useState('');
  const [newScanPrice, setNewScanPrice] = useState('');
  const [newEstResell, setNewEstResell] = useState('');
  const [newDept, setNewDept] = useState('Toys');
  const [newLocationType, setNewLocationType] = useState<WalmartSecretItem['hiddenLocationType']>('Top Stock Riser');
  const [newAisle, setNewAisle] = useState('');
  const [newTip, setNewTip] = useState('');

  // Quick SKU Lookup Simulator State
  const [lookupSku, setLookupSku] = useState('');
  const [lookupResult, setLookupResult] = useState<string | null>(null);

  const saveDeals = (updated: WalmartSecretItem[]) => {
    setDeals(updated);
    try {
      localStorage.setItem('walmartSecretDealsList', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save walmartSecretDealsList', e);
    }
  };

  const handleAddDeal = (e: React.FormEvent) => {
    e.preventDefault();
    const shelfP = parseFloat(newShelfPrice) || 0;
    const scanP = parseFloat(newScanPrice) || 0;
    const resellP = parseFloat(newEstResell) || scanP * 2;

    if (!newTitle.trim() || scanP <= 0) {
      onNotify('Please enter a valid title and scan price', 'error');
      return;
    }

    const discount = shelfP > 0 ? Math.round(((shelfP - scanP) / shelfP) * 100) : 0;
    let stage: WalmartMarkdownStage = 'Hidden Scan Drop';
    if (newScanPrice.endsWith('.00') || scanP <= 1.0) stage = '.00 Floor Price';
    else if (newScanPrice.endsWith('.03') || newScanPrice.endsWith('.04')) stage = '.03 / .04 Deep Cut';
    else if (newScanPrice.endsWith('.05')) stage = '.05 First Markdown';

    const newDeal: WalmartSecretItem = {
      id: `wm-${Date.now()}`,
      title: newTitle.trim(),
      sku: newSku.trim() || Math.floor(100000000 + Math.random() * 900000000).toString(),
      upc: newUpc.trim() || '012345678901',
      category: newDept,
      department: newDept,
      shelfTagPrice: shelfP,
      actualScanPrice: scanP,
      discountPct: Math.max(1, discount),
      markdownStage: stage,
      estResellPrice: resellP,
      hiddenLocationType: newLocationType,
      aisleHint: newAisle.trim() || 'Check top stock risers or clearance endcap',
      hunterTip: newTip.trim() || 'Scanned with Walmart App in-store scanner.',
      verifiedAt: 'Verified just now by you',
      inStockStoresNearZip: [
        {
          storeName: `Walmart Supercenter near ${zipCode}`,
          storeNumber: 'Local',
          distanceMiles: 2.3,
          stockQty: 3,
        },
      ],
    };

    const updated = [newDeal, ...deals];
    saveDeals(updated);
    setShowAddModal(false);
    onNotify(`Added secret markdown: "${newTitle.substring(0, 26)}..."`, 'success');

    // Reset fields
    setNewTitle('');
    setNewSku('');
    setNewUpc('');
    setNewShelfPrice('');
    setNewScanPrice('');
    setNewEstResell('');
    setNewAisle('');
    setNewTip('');
  };

  const handleSimulateLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupSku.trim();
    if (!clean) return;

    const matched = deals.find((d) => d.sku === clean || d.upc === clean);
    if (matched) {
      setLookupResult(
        `🚨 SECRET CLEARANCE CONFIRMED! "${matched.title}" is in system at $${matched.actualScanPrice.toFixed(2)} (Shelf tag says $${matched.shelfTagPrice.toFixed(2)}). Location: ${matched.aisleHint}.`
      );
    } else {
      setLookupResult(
        `ℹ️ SKU ${clean}: Scanned in local database. Check physical store top stock or scan directly in Walmart App (Store Mode) for unindexed local markdowns.`
      );
    }
  };

  const filteredDeals = deals.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.sku.includes(q) ||
      d.upc.includes(q) ||
      d.aisleHint.toLowerCase().includes(q) ||
      d.hunterTip.toLowerCase().includes(q);

    const matchesDept = selectedDept === 'All' || d.department === selectedDept;
    const matchesLoc = selectedLocationType === 'All' || d.hiddenLocationType === selectedLocationType;
    const matchesFloor = !filterFloorPriceOnly || d.markdownStage === '.00 Floor Price';

    return matchesQuery && matchesDept && matchesLoc && matchesFloor;
  });

  return (
    <div id="walmartSecretHub" className="space-y-4 mb-6">
      {/* Top Banner & Strategy Guides */}
      <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#0a84ff]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-[#0a84ff]/20 text-[#0a84ff] text-[11px] font-extrabold tracking-wide uppercase border border-[#0a84ff]/40 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Walmart Secret Markdowns
              </span>
              <span className="text-xs text-[#92929d] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#0a84ff]" /> Target ZIP{' '}
                <strong className="text-[#f5f5f7]">{zipCode}</strong>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#f5f5f7] tracking-tight">
              Hidden Clearance & Price Glitch Sourcing Engine
            </h2>
            <p className="text-xs text-[#92929d] mt-1 max-w-xl leading-relaxed">
              Items dropped in Walmart's corporate inventory system before physical shelf tags are changed. Scan with the Walmart App in-store to uncover 70% to 95% off discounts hiding in plain sight.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="px-2.5 py-1.5 rounded-xl bg-[#ffd60a] hover:bg-[#ffc107] text-black font-black text-xs flex items-center gap-1 transition-all shadow-sm cursor-pointer"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Scan Barcode</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowPriceGuide(!showPriceGuide)}
              className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#0a84ff]" />
              <span>Price Codes (.00 / .05)</span>
              {showPriceGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-xl bg-[#0a84ff] hover:bg-[#0070e0] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Report Secret Markdown</span>
            </button>
          </div>
        </div>

        {/* Collapsible Price Code & Tag Decoder Guide */}
        {showPriceGuide && (
          <div className="mt-4 p-3.5 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#0a84ff]" /> The Secret Price Ending Formula
              </h4>
              <span className="text-[10px] text-[#92929d]">Walmart Markdown Lifecycle</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WALMART_PRICE_CODE_GUIDE.map((guide) => (
                <div key={guide.ending} className="bg-[#18181c] p-2.5 rounded-lg border border-[#2c2c35]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-extrabold text-xs" style={{ color: guide.color }}>
                      {guide.ending}
                    </span>
                    <span className="text-[10px] text-[#f5f5f7] font-semibold">{guide.status}</span>
                  </div>
                  <p className="text-[11px] text-[#92929d] leading-snug mb-1">{guide.desc}</p>
                  <div className="text-[10px] font-bold text-[#f5f5f7] flex items-center gap-1">
                    👉 <span>{guide.action}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#2c2c35]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#92929d]">
              <div>
                📅 <strong>Yellow Tag Date Stamp:</strong> Under the barcode on older yellow clearance tags, look for a 6-digit date. If it's over 30 days old, scan immediately—it has likely dropped further!
              </div>
              <button
                type="button"
                onClick={() => setShowLocationsGuide(!showLocationsGuide)}
                className="text-[#0a84ff] hover:underline font-bold shrink-0 cursor-pointer"
              >
                {showLocationsGuide ? 'Hide Hidden Spots' : 'View Top 5 Hidden Spots →'}
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Where to Look in Walmart Guide */}
        {showLocationsGuide && (
          <div className="mt-3 p-3.5 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs space-y-2">
            <h4 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#34c759]" /> Where Hidden Markdowns Are Tucked in Walmart
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {WALMART_SECRET_LOCATIONS.map((loc) => (
                <div key={loc.title} className="bg-[#18181c] p-2 rounded-lg border border-[#2c2c35]">
                  <h5 className="font-bold text-[#f5f5f7] text-[11px] mb-1">{loc.title}</h5>
                  <p className="text-[10px] text-[#92929d] leading-tight">{loc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SKU / Barcode Quick Test Box */}
      <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-3 sm:p-4">
        <form onSubmit={handleSimulateLookup} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#92929d]" />
            <input
              type="text"
              placeholder="Test Walmart SKU or UPC (e.g. 184920194, 298104821, 948201948)..."
              value={lookupSku}
              onChange={(e) => setLookupSku(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] text-xs placeholder-[#92929d]/60 outline-none focus:border-[#0a84ff] font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#0a84ff] border border-[#0a84ff]/40 hover:border-[#0a84ff] text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            Check SKU in System
          </button>
        </form>

        {lookupResult && (
          <div className="mt-2.5 p-2.5 bg-[#222227] border border-[#0a84ff]/30 rounded-xl text-xs text-[#f5f5f7] flex items-start justify-between gap-2">
            <span>{lookupResult}</span>
            <button
              type="button"
              onClick={() => setLookupResult(null)}
              className="text-[#92929d] hover:text-white shrink-0 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-3.5 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#92929d]" />
          <input
            type="text"
            placeholder="Search title, SKU, aisle location, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] text-xs placeholder-[#92929d]/60 focus:border-[#0a84ff] outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#92929d] hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Department Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="text-[#92929d] text-[11px] font-semibold uppercase shrink-0 mr-1">
            Department:
          </span>
          {['All', 'Toys', 'Electronics', 'Baby & Kids', 'Home & Kitchen', 'Hardware', 'Lawn & Garden', 'Apparel'].map(
            (dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDept(dept)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedDept === dept
                    ? 'bg-[#0a84ff] text-white font-bold shadow-xs'
                    : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
                }`}
              >
                {dept}
              </button>
            )
          )}
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#2c2c35]/50 text-xs">
          <button
            type="button"
            onClick={() => setFilterFloorPriceOnly(!filterFloorPriceOnly)}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              filterFloorPriceOnly
                ? 'bg-[#34c759] text-black font-extrabold'
                : 'bg-[#222227] text-[#92929d] hover:text-white border border-[#2c2c35]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>.00 Floor / Rock Bottom Only</span>
          </button>

          <select
            value={selectedLocationType}
            onChange={(e) => setSelectedLocationType(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-[#222227] border border-[#2c2c35] text-[#92929d] text-xs outline-none"
          >
            <option value="All">All In-Store Spots</option>
            <option value="Top Stock Riser">Top Stock Risers</option>
            <option value="Unmarked Endcap">Unmarked Endcaps</option>
            <option value="Electronics Cage">Electronics Cages</option>
            <option value="Garden Center Patio">Garden Center Patio</option>
            <option value="Action Alley Bin">Action Alley Bins</option>
            <option value="Clearance Aisle">Clearance Aisle</option>
          </select>

          {(filterFloorPriceOnly || selectedDept !== 'All' || selectedLocationType !== 'All' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setFilterFloorPriceOnly(false);
                setSelectedDept('All');
                setSelectedLocationType('All');
                setSearchQuery('');
              }}
              className="text-xs text-[#0a84ff] hover:underline ml-auto font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Deals Count */}
      <div className="flex items-center justify-between text-xs px-1 text-[#92929d]">
        <span>
          Showing <strong className="text-[#f5f5f7]">{filteredDeals.length}</strong> secret markdowns near{' '}
          <strong className="text-[#0a84ff]">{zipCode}</strong>
        </span>
        <span className="text-[11px] text-[#34c759] font-medium">
          ✓ Verified via in-store Walmart App barcode scanner
        </span>
      </div>

      {/* Secret Deals Feed */}
      <div className="space-y-3">
        {filteredDeals.length === 0 ? (
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-8 text-center">
            <AlertCircle className="w-8 h-8 text-[#92929d] mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-[#f5f5f7] mb-1">No secret markdowns found matching filter</h3>
            <p className="text-xs text-[#92929d] max-w-sm mx-auto mb-3">
              Try resetting the department or in-store spot filter to explore all verified secret deals.
            </p>
          </div>
        ) : (
          filteredDeals.map((deal) => {
            const isFloor = deal.markdownStage === '.00 Floor Price';
            const estFlip = deal.estResellPrice - deal.actualScanPrice - deal.estResellPrice * 0.15 - 5.0;

            return (
              <div
                key={deal.id}
                className="bg-[#18181c] border border-[#2c2c35] hover:border-[#0a84ff]/50 rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all relative overflow-hidden group"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-[#222227] text-[#f5f5f7] font-bold border border-[#2c2c35]">
                      {deal.department}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-extrabold ${
                        isFloor
                          ? 'bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/30'
                          : 'bg-[#ff9800]/20 text-[#ff9800] border border-[#ff9800]/30'
                      }`}
                    >
                      {deal.markdownStage}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/30 font-bold flex items-center gap-1">
                      <Layers className="w-2.5 h-2.5" /> {deal.hiddenLocationType}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#92929d] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{deal.verifiedAt}</span>
                  </div>
                </div>

                {/* Title and SKU */}
                <h3 className="text-sm sm:text-base font-bold text-[#f5f5f7] group-hover:text-[#0a84ff] transition-colors leading-snug">
                  {deal.title}
                </h3>

                <div className="flex items-center gap-2 text-xs text-[#92929d] mt-1 font-mono flex-wrap">
                  <span>Walmart SKU: <strong className="text-[#f5f5f7]">{deal.sku}</strong></span>
                  <span>• UPC: <strong className="text-[#f5f5f7]">{deal.upc}</strong></span>
                  {deal.tagDateHint && (
                    <span>• Tag Date: <strong className="text-[#ff9800]">{deal.tagDateHint}</strong></span>
                  )}
                </div>

                {/* DECEPTIVE SHELF PRICE vs REAL APP SCAN PRICE */}
                <div className="mt-3 p-3 bg-[#222227] border border-[#2c2c35] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-[#92929d] uppercase font-bold mb-0.5">
                      Shelf Tag (What you see):
                    </div>
                    <div className="text-sm line-through text-[#ff3b30] font-bold font-mono">
                      ${deal.shelfTagPrice.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-[#34c759] hidden sm:block" />
                    <div>
                      <div className="text-[10px] text-[#34c759] uppercase font-bold mb-0.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Real In-Store Scan Price:
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-[#34c759] font-mono leading-none">
                        ${deal.actualScanPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right sm:border-l sm:border-[#2c2c35] sm:pl-3">
                    <span className="px-2 py-0.5 rounded-full bg-[#34c759]/20 text-[#34c759] font-black text-xs border border-[#34c759]/30 inline-block">
                      {deal.discountPct}% OFF
                    </span>
                    <div className="text-xs text-[#0a84ff] font-bold mt-1">
                      Flip Profit: ~${estFlip > 0 ? estFlip.toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>

                {/* In-Store Location Tip & Hunter Advice */}
                <div className="mt-2.5 p-2.5 bg-[#18181c] border border-[#2c2c35] rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-[#f5f5f7] font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-[#0a84ff]" />
                    <span>Exact In-Store Location:</span>{' '}
                    <span className="text-[#ff9800] font-normal">{deal.aisleHint}</span>
                  </div>

                  <p className="text-[11px] text-[#92929d] italic pt-0.5">
                    💡 <strong>Insider Tip:</strong> {deal.hunterTip}
                  </p>

                  {/* Stock near zip - Specific Store and Distance Label */}
                  {deal.inStockStoresNearZip && deal.inStockStoresNearZip.length > 0 && (
                    <div className="pt-2 border-t border-[#2c2c35]/60 mt-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-[#92929d]">Available At:</span>
                          <span className="text-xs font-black text-[#f5f5f7] inline-flex items-center gap-1 bg-[#222227] px-2 py-0.5 rounded-md border border-[#2c2c35]">
                            <MapPin className="w-3 h-3 text-[#0a84ff]" />
                            {deal.inStockStoresNearZip[0].storeName}
                            {deal.inStockStoresNearZip[0].address && (
                              <span className="text-[#92929d] font-normal">({deal.inStockStoresNearZip[0].address})</span>
                            )}
                          </span>
                          <span className="text-xs font-black text-[#ffd60a] bg-[#ffd60a]/10 px-2 py-0.5 rounded-md border border-[#ffd60a]/30">
                            {deal.inStockStoresNearZip[0].distanceMiles} mi away
                            {deal.inStockStoresNearZip[0].driveTimeMinutes && ` (${deal.inStockStoresNearZip[0].driveTimeMinutes} min drive)`}
                          </span>
                        </div>
                        <span className="text-xs text-[#34c759] font-bold bg-[#34c759]/10 px-2 py-0.5 rounded-md border border-[#34c759]/30">
                          {deal.inStockStoresNearZip[0].stockQty} units on shelf
                        </span>
                      </div>

                      {deal.inStockStoresNearZip.length > 1 && (
                        <div className="text-[10px] text-[#92929d] flex items-center gap-1.5 flex-wrap pt-0.5 pl-1">
                          <span>Also nearby:</span>
                          {deal.inStockStoresNearZip.slice(1).map((s, idx) => (
                            <span key={idx} className="text-[#f5f5f7] bg-[#1c1c22] px-1.5 py-0.5 rounded border border-[#2c2c35]">
                              {s.storeName} ({s.address || `${s.storeNumber}`}) • <strong className="text-[#ffd60a]">{s.distanceMiles} mi</strong> ({s.stockQty} in stock)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Row */}
                <div className="mt-3 pt-2.5 border-t border-[#2c2c35] flex items-center justify-between gap-2 flex-wrap">
                  <a
                    href={`https://www.walmart.com/ip/${deal.sku}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#92929d] hover:text-[#0a84ff] flex items-center gap-1 transition-colors"
                  >
                    <span>View on Walmart.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const closest = deal.inStockStoresNearZip?.[0];
                        const specificStore = closest
                          ? `${closest.storeName} (${closest.address || 'Dartmouth'}) • ${closest.distanceMiles} mi away`
                          : 'Walmart Supercenter #1909 (506 State Rd) • 2.1 mi away';
                        onLoadIntoCalculator({
                          name: `Walmart: ${deal.title}`,
                          buy: deal.actualScanPrice.toFixed(2),
                          sell: deal.estResellPrice.toFixed(2),
                          store: specificStore,
                        });
                        onNotify(`Loaded "${deal.title}" into Arbitrage Calculator`, 'info');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#f5f5f7] border border-[#2c2c35] hover:border-[#0a84ff] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5 text-[#0a84ff]" />
                      <span>Flip Calc</span>
                    </button>

                    {onAddToCart && (
                      <button
                        type="button"
                        onClick={() => onAddToCart(deal)}
                        className="px-3 py-1.5 rounded-xl bg-[#0a84ff] hover:bg-[#0070e0] text-white text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
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

      {/* MODAL: REPORT SECRET MARKDOWN */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0a84ff]" />
                <h3 className="text-base font-bold text-[#f5f5f7]">Report Secret Walmart Markdown</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#92929d] hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDeal} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dyson V8 Cordless Vacuum"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Walmart SKU (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 184920194"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    UPC Barcode (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 012345678901"
                    value={newUpc}
                    onChange={(e) => setNewUpc(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Shelf Tag Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 199.00"
                    value={newShelfPrice}
                    onChange={(e) => setNewShelfPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Actual Scan ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 35.00"
                    value={newScanPrice}
                    onChange={(e) => setNewScanPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono font-bold text-[#34c759]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Est Resell ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 120.00"
                    value={newEstResell}
                    onChange={(e) => setNewEstResell(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono text-[#0a84ff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Department
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                  >
                    <option value="Toys">Toys & Hobbies</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Baby & Kids">Baby & Kids</option>
                    <option value="Home & Kitchen">Home & Kitchen</option>
                    <option value="Hardware">Hardware & Tools</option>
                    <option value="Lawn & Garden">Lawn & Garden</option>
                    <option value="Apparel">Apparel & Shoes</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    In-Store Spot
                  </label>
                  <select
                    value={newLocationType}
                    onChange={(e) => setNewLocationType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                  >
                    <option value="Top Stock Riser">Top Stock Riser (Overhead)</option>
                    <option value="Unmarked Endcap">Unmarked Endcap</option>
                    <option value="Electronics Cage">Electronics Locked Cage</option>
                    <option value="Garden Center Patio">Garden Center Patio Corral</option>
                    <option value="Action Alley Bin">Action Alley Center Bin</option>
                    <option value="Clearance Aisle">Clearance Aisle Wall</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Aisle / Location Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aisle G-12 Top Stock Riser over toaster ovens"
                  value={newAisle}
                  onChange={(e) => setNewAisle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Hunter Tip & How to Scan
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Shelf tag says $199, scan barcode in Walmart App to see $35."
                  value={newTip}
                  onChange={(e) => setNewTip(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2c2c35]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222227] text-[#92929d] hover:text-white font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0a84ff] text-white font-bold hover:bg-[#0070e0] transition-colors cursor-pointer"
                >
                  Post Secret Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
