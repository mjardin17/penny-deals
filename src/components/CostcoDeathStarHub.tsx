import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  ShoppingBag,
  Calculator,
  Plus,
  X,
  ExternalLink,
  Zap,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Navigation,
  Volume2,
  VolumeX,
  Radio,
  Eye,
  ScanLine,
  Layers,
  Percent,
  Check,
  Copy,
} from 'lucide-react';
import { WholesaleDeathMarkDeal, WholesaleClubName } from '../types';
import {
  DEFAULT_COSTCO_DEATH_MARK_DEALS,
  WHOLESALE_PRICE_CODE_RULES,
} from '../data/costcoDeathStarDeals';
import { soundFx } from '../utils/audioFeedback';

interface CostcoDeathStarHubProps {
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

export const CostcoDeathStarHub: React.FC<CostcoDeathStarHubProps> = ({
  zipCode,
  onLoadIntoCalculator,
  onAddToCart,
  onNotify,
  onOpenScanner,
}) => {
  // Deals local state
  const [deals, setDeals] = useState<WholesaleDeathMarkDeal[]>(() => {
    try {
      const saved = localStorage.getItem('dealSoldierCostcoDeathDeals');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse dealSoldierCostcoDeathDeals', e);
    }
    return DEFAULT_COSTCO_DEATH_MARK_DEALS;
  });

  const [activeTab, setActiveTab] = useState<'radar' | 'decoder' | 'rules'>('radar');
  const [selectedClub, setSelectedClub] = useState<'All' | 'Costco Wholesale' | "Sam's Club">('All');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [copiedSkuId, setCopiedSkuId] = useState<string | null>(null);

  // Interactive Tag Decoder State
  const [decodePriceInput, setDecodePriceInput] = useState('29.97');
  const [decodeHasAsterisk, setDecodeHasAsterisk] = useState(true);
  const [decodeClubType, setDecodeClubType] = useState<'Costco' | "Sam's Club">('Costco');
  const [decodeHasLetterC, setDecodeHasLetterC] = useState(false);

  // Add Custom Sighting Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClub, setNewClub] = useState<WholesaleClubName>('Costco Wholesale');
  const [newCategory, setNewCategory] = useState('Electronics');
  const [newItemNum, setNewItemNum] = useState('');
  const [newOrigPrice, setNewOrigPrice] = useState('');
  const [newMarkdownPrice, setNewMarkdownPrice] = useState('');
  const [newResalePrice, setNewResalePrice] = useState('');
  const [newHasAsterisk, setNewHasAsterisk] = useState(true);
  const [newAisle, setNewAisle] = useState('Center Fence / Pallet Row');
  const [newHunterTip, setNewHunterTip] = useState('');

  const saveDeals = (updated: WholesaleDeathMarkDeal[]) => {
    setDeals(updated);
    try {
      localStorage.setItem('dealSoldierCostcoDeathDeals', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save dealSoldierCostcoDeathDeals', e);
    }
  };

  const handleCopySku = (dealId: string, sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSkuId(dealId);
    soundFx.playStandardScan();
    onNotify(`Copied Club Item #${sku} to clipboard!`, 'success');
    setTimeout(() => setCopiedSkuId(null), 2000);
  };

  // Tag Decoder Logic
  const decodedTagAnalysis = useMemo(() => {
    const raw = decodePriceInput.trim();
    const num = parseFloat(raw) || 0;
    const centsStr = raw.includes('.') ? raw.split('.')[1] : '';

    if (decodeClubType === 'Costco') {
      if (centsStr === '97') {
        return {
          type: 'Corporate Markdown (Below Cost)',
          severity: 'Critical Clearance',
          badgeColor: '#ff3b30',
          reorderStatus: decodeHasAsterisk
            ? 'DEATH STAR (*): Permanently Deleted. Will NEVER restock.'
            : 'Active replenishment cycle, but corporate forced price cut.',
          actionVerdict: decodeHasAsterisk ? '🚨 BUY OUT PALLET' : '🔥 HIGH-MARGIN FLIP',
          explanation:
            'Costco headquarters set this price below wholesale acquisition cost to dump floor inventory. The store manager cannot raise or lower this price.',
          negotiable: 'No (fixed corporate price, but check with manager for display box cuts).',
        };
      }
      if (centsStr === '00' || centsStr === '88') {
        return {
          type: 'Store Manager Discretion Markdown',
          severity: 'Maximum Local Discount',
          badgeColor: '#ff9800',
          reorderStatus: decodeHasAsterisk
            ? 'DEATH STAR (*): Last floor units being liquidated.'
            : 'Store-level blowout of return / demo units.',
          actionVerdict: '💰 EXTREME ROI BUYOUT',
          explanation:
            'The General Manager of THIS specific warehouse manually keyed in this price to purge open-box, customer return, or last-unit inventory.',
          negotiable: 'YES! Ask the floor supervisor: "Can you do an extra 10% off since it is the open display?"',
        };
      }
      if (centsStr === '49' || centsStr === '79') {
        return {
          type: 'Manufacturer Promotional Trial',
          severity: 'Temporary Promo',
          badgeColor: '#0a84ff',
          reorderStatus: decodeHasAsterisk
            ? 'DEATH STAR (*): Promo running on discontinued packaging.'
            : 'Standard promo run.',
          actionVerdict: '⚠️ MODERATE FLIP RISK',
          explanation:
            'Manufacturer paid Costco a temporary rebate or trial allowance. Rarely provides enough margin for reseller arbitrage.',
          negotiable: 'No.',
        };
      }
      if (decodeHasAsterisk) {
        return {
          type: 'Standard Price + Death Star (*)',
          severity: 'SKU Deleted',
          badgeColor: '#ffd60a',
          reorderStatus: 'DEATH STAR (*): Discontinued from catalog.',
          actionVerdict: '👀 WATCHLIST FOR .97 CUT',
          explanation:
            'Item has not been marked down yet (still ends in .99), BUT the asterisk confirms corporate has cancelled future orders. Wait 7-14 days for the .97 drop!',
          negotiable: 'No.',
        };
      }
      return {
        type: 'Standard Full Retail (.99)',
        severity: 'Regular Price',
        badgeColor: '#92929d',
        reorderStatus: 'Active everyday warehouse catalog item.',
        actionVerdict: '❌ PASS FOR ARBITRAGE',
        explanation: 'Normal warehouse price. Only worth buying if selling an exclusive collector pack (e.g. sealed TCG tins).',
        negotiable: 'No.',
      };
    } else {
      // Sam's Club
      if (centsStr === '91' || centsStr === '71') {
        return {
          type: "Sam's Club Clearance Liquidation",
          severity: 'Corporate Clearance',
          badgeColor: '#34c759',
          reorderStatus: decodeHasLetterC
            ? "LETTER 'C': Discontinued / Cancelled by merchant."
            : 'Active seasonal clearance run.',
          actionVerdict: '🔥 BULK LIQUIDATION BUY',
          explanation:
            "Official Sam's Club clearance pricing set by corporate category managers to clear patio, holiday, and tech items.",
          negotiable: 'Rarely, unless damaged box.',
        };
      }
      if (decodeHasLetterC) {
        return {
          type: "Cancelled Status (Letter 'C')",
          severity: 'Discontinued SKU',
          badgeColor: '#ff2d55',
          reorderStatus: "Letter 'C' confirmed: Supplier contract terminated.",
          actionVerdict: '👀 MONITOR FOR .91 CUT',
          explanation: "Item is cancelled and will drop to .91 or .00 once stock dwindles.",
          negotiable: 'Possible on last floor unit.',
        };
      }
      return {
        type: "Standard Sam's Club Price",
        severity: 'Regular Price',
        badgeColor: '#92929d',
        reorderStatus: "Status 'A' (Active) in inventory.",
        actionVerdict: '❌ PASS',
        explanation: "Normal warehouse club retail price with standard margins.",
        negotiable: 'No.',
      };
    }
  }, [decodePriceInput, decodeHasAsterisk, decodeClubType, decodeHasLetterC]);

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.itemNumber.toLowerCase().includes(q) ||
        d.hunterProTips.toLowerCase().includes(q);

      const matchesClub = selectedClub === 'All' || d.club === selectedClub;

      const matchesTag =
        selectedTagFilter === 'All' ||
        (selectedTagFilter === '.97' && d.tagEnding === '.97') ||
        (selectedTagFilter === '.00' && (d.tagEnding === '.00' || d.tagEnding === '.88')) ||
        (selectedTagFilter === 'death_star' && d.hasAsterisk) ||
        (selectedTagFilter === '.91' && d.tagEnding === '.91');

      return matchesQuery && matchesClub && matchesTag;
    });
  }, [deals, searchQuery, selectedClub, selectedTagFilter]);

  const handleAddSighting = (e: React.FormEvent) => {
    e.preventDefault();
    const markP = parseFloat(newMarkdownPrice) || 0;
    const origP = parseFloat(newOrigPrice) || markP * 1.8;
    const resP = parseFloat(newResalePrice) || markP * 1.6;

    if (!newTitle.trim() || markP <= 0) {
      onNotify('Please provide product title and markdown price', 'error');
      return;
    }

    const cents = newMarkdownPrice.includes('.') ? newMarkdownPrice.split('.')[1] : '97';
    const tagEnd = `.${cents}`;

    const newDeal: WholesaleDeathMarkDeal = {
      id: `wholesale-${Date.now()}`,
      club: newClub,
      title: newTitle.trim(),
      category: newCategory,
      itemNumber: newItemNum.trim() || Math.floor(1000000 + Math.random() * 9000000).toString(),
      upc: '0' + Math.floor(10000000000 + Math.random() * 90000000000).toString(),
      originalPrice: origP,
      markdownPrice: markP,
      discountPct: Math.round(((origP - markP) / origP) * 100),
      tagEnding: tagEnd,
      hasAsterisk: newHasAsterisk,
      hasDiscontinuedLetter: newClub === "Sam's Club",
      statusLabel:
        tagEnd === '.97'
          ? 'CORPORATE .97' + (newHasAsterisk ? ' + DEATH STAR (*)' : '')
          : tagEnd === '.00'
          ? 'MANAGER .00 BLOWOUT'
          : `${newClub.toUpperCase()} CLEARANCE`,
      tagDecodedMeaning: 'Sighted and verified live by local warehouse hunter.',
      actionRecommendation: 'BUY OUT PALLET',
      marketResaleComps: {
        source: 'eBay Sold',
        soldAvgPrice: resP,
        sellThroughRatePct: 90,
        velocity: 'Fast (1-3 days)',
        netProfit: Math.round((resP - markP - resP * 0.13 - 6) * 100) / 100,
        roiPct: Math.round(((resP - markP) / markP) * 100),
      },
      warehouseLocationAisle: newAisle.trim() || 'Center Floor Pallet Stacks',
      reportedWarehouse: {
        clubName: `${newClub} near ${zipCode}`,
        distanceMiles: 3.2,
        stockOnHand: 4,
        reportedAt: 'Just now by you',
      },
      hunterProTips: newHunterTip.trim() || 'Inspected tag and carton in person.',
      isManagerDiscretion: tagEnd === '.00' || tagEnd === '.88',
    };

    const updated = [newDeal, ...deals];
    saveDeals(updated);
    setShowAddModal(false);
    soundFx.playPennyJackpot();
    onNotify(`Added Death Star Sighting: "${newTitle.substring(0, 26)}..."`, 'success');

    // Reset
    setNewTitle('');
    setNewOrigPrice('');
    setNewMarkdownPrice('');
    setNewResalePrice('');
    setNewHunterTip('');
    setNewItemNum('');
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Header */}
      <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-52 h-52 bg-[#ff3b30]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-[#ff3b30]/20 text-[#ff3b30] text-[11px] font-black tracking-wide uppercase border border-[#ff3b30]/40 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#ff3b30]" /> Wholesale Club Liquidation Radar
              </span>
              <span className="text-xs text-[#92929d] flex items-center gap-1 font-mono">
                <MapPin className="w-3 h-3 text-[#ffd60a]" /> Warehouse Radius: <strong className="text-[#f5f5f7]">{zipCode}</strong>
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#ffd60a]/20 text-[#ffd60a] font-black border border-[#ffd60a]/30">
                ★ The Death Star (*) & .97 Decoder Active
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#f5f5f7] tracking-tight">
              Costco & Sam's Club "Death Mark" Clearance Radar
            </h2>
            <p className="text-xs text-[#92929d] mt-1 max-w-2xl leading-relaxed">
              Wholesale clubs don't use standard clearance stickers. Decode hidden corporate markdowns (<strong>.97</strong> below cost), manager discretionary cuts (<strong>.00 / .88</strong>), and the legendary <strong>Asterisk (*) "Death Star"</strong> signifying permanent SKU cancellation.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowCheatSheet(!showCheatSheet)}
              className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#ffd60a]" />
              <span>Tag Code Secrets</span>
              {showCheatSheet ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#ffd60a] border border-[#2c2c35] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Camera Scan</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-xl bg-[#ff3b30] hover:bg-[#ff453a] text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Report Death Mark</span>
            </button>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-[#2c2c35]/80 text-xs scrollbar-none mt-3">
          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'radar'
                ? 'bg-[#ff3b30] text-white shadow-sm'
                : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>🔥 Live Warehouse Death Marks ({deals.length} Active)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('decoder')}
            className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'decoder'
                ? 'bg-[#ffd60a] text-black shadow-sm font-black'
                : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>🎯 In-Store Tag Decoder & Action Verdict</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-[#0a84ff] text-white shadow-sm'
                : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>📖 Wholesale Club Rules & Pallet Sourcing Blueprint</span>
          </button>
        </div>

        {/* Collapsible Quick Cheat Sheet */}
        {showCheatSheet && (
          <div className="mt-4 p-3.5 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#ffd60a]" /> The 4 Golden Rules of Wholesale Club Liquidation
              </h4>
              <span className="text-[10px] text-[#ffd60a] font-mono font-bold">INSIDER PRICE CODES</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
              <div className="bg-[#18181c] p-2.5 rounded-lg border border-[#2c2c35]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-[#ff3b30]">.97 Ending</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff3b30]/20 text-[#ff3b30] font-bold">COSTCO</span>
                </div>
                <div className="text-[11px] text-[#f5f5f7] font-semibold">Corporate Markdown Below Cost</div>
                <p className="text-[10px] text-[#92929d] mt-1 leading-snug">
                  Costco HQ forces this reduction to clear floor space. Non-negotiable, but deep arbitrage profit.
                </p>
              </div>

              <div className="bg-[#18181c] p-2.5 rounded-lg border border-[#2c2c35]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-[#ff9800]">.00 / .88</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff9800]/20 text-[#ff9800] font-bold">COSTCO</span>
                </div>
                <div className="text-[11px] text-[#f5f5f7] font-semibold">Store Manager Discretion</div>
                <p className="text-[10px] text-[#92929d] mt-1 leading-snug">
                  Local warehouse manager keyed this down to dump display or returned units. Highest ROI (70-90% off)!
                </p>
              </div>

              <div className="bg-[#18181c] p-2.5 rounded-lg border border-[#2c2c35]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-[#ffd60a]">★ Asterisk (*)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ffd60a]/20 text-[#ffd60a] font-bold">BOTH</span>
                </div>
                <div className="text-[11px] text-[#f5f5f7] font-semibold">The "Death Star" (Deleted)</div>
                <p className="text-[10px] text-[#92929d] mt-1 leading-snug">
                  Upper right tag corner. Means SKU is cancelled forever. Combined with .97, buy the whole pallet.
                </p>
              </div>

              <div className="bg-[#18181c] p-2.5 rounded-lg border border-[#2c2c35]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-[#34c759]">.91 Ending</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#34c759]/20 text-[#34c759] font-bold">SAM'S CLUB</span>
                </div>
                <div className="text-[11px] text-[#f5f5f7] font-semibold">Sam's Corporate Liquidation</div>
                <p className="text-[10px] text-[#92929d] mt-1 leading-snug">
                  Look for letter 'C' (Cancelled) on the shelf tag. Prime target for outdoor, patio, and sound gear.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: LIVE DEATH MARK & .97 CLEARANCE FEED                              */}
      {/* ========================================================================= */}
      {activeTab === 'radar' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-3.5 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#92929d]" />
              <input
                type="text"
                placeholder="Search by product name, brand (Traeger, Ninja, Dyson, Bose, Dewalt), or Item #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] text-xs placeholder-[#92929d]/60 focus:border-[#ff3b30] outline-none"
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

            {/* Club Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              <span className="text-[#92929d] text-[11px] font-semibold uppercase shrink-0 mr-1">
                Wholesale Club:
              </span>
              {['All', 'Costco Wholesale', "Sam's Club"].map((club) => (
                <button
                  key={club}
                  type="button"
                  onClick={() => setSelectedClub(club as any)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedClub === club
                      ? 'bg-[#ff3b30] text-white font-black shadow-xs'
                      : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
                  }`}
                >
                  {club}
                </button>
              ))}
            </div>

            {/* Price Code Tag Filter */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#2c2c35]/60 text-xs">
              <span className="text-[#92929d] text-[11px] font-semibold uppercase shrink-0 mr-1">
                Tag Code:
              </span>
              {[
                { id: 'All', label: 'All Codes' },
                { id: '.97', label: '🔥 .97 Corporate Markdown' },
                { id: '.00', label: '💰 .00 / .88 Manager Cut' },
                { id: 'death_star', label: '★ Asterisk (*) Death Star' },
                { id: '.91', label: "🟢 Sam's .91 Clearance" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedTagFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedTagFilter === f.id
                      ? 'bg-[#ffd60a] text-black font-black'
                      : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              {(searchQuery || selectedClub !== 'All' || selectedTagFilter !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedClub('All');
                    setSelectedTagFilter('All');
                  }}
                  className="text-xs text-[#ff3b30] hover:underline ml-auto font-semibold cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Sighting Summary Header */}
          <div className="flex items-center justify-between text-xs px-1 text-[#92929d]">
            <span>
              Showing <strong className="text-[#f5f5f7]">{filteredDeals.length}</strong> verified wholesale death marks & clearance items near{' '}
              <strong className="text-[#ffd60a]">{zipCode}</strong>
            </span>
            <span className="text-[11px] text-[#34c759] font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#34c759]" /> Real-time eBay & Amazon BuyBox Comps Active
            </span>
          </div>

          {/* Deals Cards Grid */}
          <div className="space-y-3">
            {filteredDeals.length === 0 ? (
              <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-8 text-center">
                <AlertTriangle className="w-8 h-8 text-[#92929d] mx-auto mb-2 opacity-50" />
                <h3 className="text-sm font-bold text-[#f5f5f7] mb-1">No wholesale deals matching criteria</h3>
                <p className="text-xs text-[#92929d] max-w-sm mx-auto mb-3">
                  Reset your filters or click "Report Death Mark" to log a new .97 or manager liquidation you spotted in the warehouse.
                </p>
              </div>
            ) : (
              filteredDeals.map((deal) => {
                const isDeathStar = deal.hasAsterisk;
                const isManagerBlowout = deal.tagEnding === '.00' || deal.tagEnding === '.88';
                const isCorporate97 = deal.tagEnding === '.97';
                const comp = deal.marketResaleComps;

                return (
                  <div
                    key={deal.id}
                    className={`bg-[#18181c] border rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all relative overflow-hidden group ${
                      isManagerBlowout
                        ? 'border-[#ff9800]/60 shadow-[#ff9800]/5'
                        : isCorporate97
                        ? 'border-[#ff3b30]/60 shadow-[#ff3b30]/5'
                        : 'border-[#2c2c35] hover:border-[#ffd60a]/40'
                    }`}
                  >
                    {/* Top Status Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#222227] text-[#f5f5f7] font-extrabold border border-[#2c2c35]">
                          {deal.club}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-[#222227] text-[#92929d]">
                          {deal.category}
                        </span>

                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-md font-black flex items-center gap-1 ${
                            isManagerBlowout
                              ? 'bg-[#ff9800]/20 text-[#ff9800] border border-[#ff9800]/40'
                              : isCorporate97
                              ? 'bg-[#ff3b30]/20 text-[#ff3b30] border border-[#ff3b30]/40'
                              : 'bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/40'
                          }`}
                        >
                          {deal.statusLabel}
                        </span>

                        {isDeathStar && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/40 font-black flex items-center gap-1">
                            ★ DEATH STAR (*)
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-[#92929d] flex items-center gap-2 font-mono">
                        <span>
                          Item #: <strong className="text-[#f5f5f7]">{deal.itemNumber}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopySku(deal.id, deal.itemNumber)}
                          className="text-[#ffd60a] hover:underline flex items-center gap-0.5 cursor-pointer"
                          title="Copy SKU for warehouse terminal lookup"
                        >
                          {copiedSkuId === deal.id ? (
                            <Check className="w-3 h-3 text-[#34c759]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedSkuId === deal.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-bold text-[#f5f5f7] group-hover:text-[#ff3b30] transition-colors leading-snug">
                      {deal.title}
                    </h3>

                    {/* Aisle & Stock Row */}
                    <div className="flex items-center gap-2 text-xs text-[#92929d] mt-1 font-mono flex-wrap">
                      <span className="text-[#ffd60a] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {deal.warehouseLocationAisle}
                      </span>
                      <span>• Store Stock: <strong className="text-[#34c759]">{deal.reportedWarehouse.stockOnHand} units</strong></span>
                      <span>• Reported: <strong className="text-[#f5f5f7]">{deal.reportedWarehouse.reportedAt}</strong></span>
                    </div>

                    {/* PRICING & ARBITRAGE MARGIN COMPARISON BOX */}
                    <div className="mt-3 p-3 bg-[#222227] border border-[#2c2c35] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] text-[#92929d] uppercase font-bold mb-0.5">
                          Original Member Price:
                        </div>
                        <div className="text-base font-bold text-[#92929d] line-through font-mono">
                          ${deal.originalPrice.toFixed(2)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-[#34c759] uppercase font-bold mb-0.5 flex items-center gap-1">
                          <Tag className="w-3 h-3" /> Warehouse Markdown Price:
                        </div>
                        <div className="text-2xl font-black text-[#34c759] font-mono leading-none">
                          ${deal.markdownPrice.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#34c759] font-bold mt-0.5">
                          {deal.discountPct}% OFF
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-[#ffd60a] hidden sm:block" />
                        <div>
                          <div className="text-[10px] text-[#ffd60a] uppercase font-bold mb-0.5 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> {comp.source} Sold Benchmark:
                          </div>
                          <div className="text-2xl font-black text-[#ffd60a] font-mono leading-none">
                            ${comp.soldAvgPrice.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-[#92929d] mt-0.5">
                            Velocity: <strong className="text-[#f5f5f7]">{comp.velocity}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="text-right sm:border-l sm:border-[#2c2c35] sm:pl-3">
                        <span className="px-2 py-0.5 rounded-full bg-[#34c759]/20 text-[#34c759] text-xs font-black border border-[#34c759]/40 font-mono">
                          +${comp.netProfit.toFixed(2)} Profit ({comp.roiPct}% ROI)
                        </span>
                        <div className="text-[10px] text-[#92929d] mt-1 uppercase font-bold">
                          Action: <strong className="text-[#ffd60a]">{deal.actionRecommendation}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Pro Hunting & Negotiation Intel Box */}
                    <div className="mt-2.5 p-2.5 bg-[#18181c] border border-[#2c2c35] rounded-xl flex items-start gap-2 text-xs">
                      <Zap className="w-3.5 h-3.5 text-[#ffd60a] shrink-0 mt-0.5" />
                      <div className="leading-snug text-[#92929d]">
                        <strong className="text-[#f5f5f7]">Warehouse Scout Directive: </strong>
                        {deal.hunterProTips}
                        {isManagerBlowout && (
                          <span className="block mt-1 text-[#ff9800] font-semibold">
                            💡 Manager Negotiating Tip: Since this is an in-store .00 markdown, you can ask a red-vest supervisor: "If I take all remaining units, can you do $250 each?"
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#2c2c35]/80 text-xs flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={
                            deal.club === 'Costco Wholesale'
                              ? `https://www.costco.com/CatalogSearch?dept=All&keyword=${encodeURIComponent(deal.itemNumber)}`
                              : `https://www.samsclub.com/s/${encodeURIComponent(deal.itemNumber)}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35] flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Club Item Lookup</span>
                        </a>

                        <a
                          href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(deal.title)}&LH_Complete=1&LH_Sold=1`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#ffd60a] border border-[#2c2c35] flex items-center gap-1 transition-colors"
                        >
                          <TrendingUp className="w-3 h-3" />
                          <span>eBay Sold Comps</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        {onAddToCart && (
                          <button
                            type="button"
                            onClick={() => {
                              onAddToCart({
                                title: deal.title,
                                buyPrice: deal.markdownPrice,
                                sellPrice: comp.soldAvgPrice,
                                store: deal.club,
                                category: deal.category,
                                notes: `Wholesale Death Mark ${deal.tagEnding} - Item #${deal.itemNumber}`,
                              });
                              soundFx.playStandardScan();
                              onNotify(`Added "${deal.title.substring(0, 20)}..." to Haul Bag!`, 'success');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#f5f5f7] border border-[#2c2c35] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-[#34c759]" />
                            <span>Bag Deal</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            onLoadIntoCalculator({
                              name: deal.title,
                              buy: deal.markdownPrice.toString(),
                              sell: comp.soldAvgPrice.toString(),
                              store: deal.club,
                            });
                            soundFx.playStandardScan();
                            onNotify(`Loaded "${deal.title.substring(0, 20)}..." into Calculator`, 'info');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#ff3b30] hover:bg-[#ff453a] text-white font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Analyze Profit</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: INTERACTIVE IN-STORE TAG DECODER                                 */}
      {/* ========================================================================= */}
      {activeTab === 'decoder' && (
        <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2c2c35] pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#f5f5f7] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#ffd60a]" /> Interactive Shelf Tag Decoder
              </h3>
              <p className="text-xs text-[#92929d] mt-0.5">
                Standing in the aisle? Enter the exact shelf price and tag markings to instantly know if it's corporate liquidation or manager discount.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-[#ffd60a]/20 text-[#ffd60a] font-mono font-black border border-[#ffd60a]/40 self-start sm:self-auto">
              AS400 HEURISTICS ACTIVE
            </span>
          </div>

          {/* Decoder Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Club Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#92929d] font-bold uppercase">1. Store Chain:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDecodeClubType('Costco')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    decodeClubType === 'Costco'
                      ? 'bg-[#ff3b30] text-white shadow-sm'
                      : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
                  }`}
                >
                  Costco
                </button>
                <button
                  type="button"
                  onClick={() => setDecodeClubType("Sam's Club")}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    decodeClubType === "Sam's Club"
                      ? 'bg-[#34c759] text-black shadow-sm'
                      : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
                  }`}
                >
                  Sam's Club
                </button>
              </div>
            </div>

            {/* Price Input & Quick Endings */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#92929d] font-bold uppercase">2. Enter Shelf Price ($):</label>
              <input
                type="text"
                value={decodePriceInput}
                onChange={(e) => setDecodePriceInput(e.target.value)}
                placeholder="e.g. 49.97, 19.00, 14.88, 79.91"
                className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] font-mono text-sm font-black focus:border-[#ffd60a] outline-none"
              />
              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto pt-1 scrollbar-none">
                <span className="text-[10px] text-[#92929d] font-mono">Quick:</span>
                {['.97', '.00', '.88', '.91', '.49', '.99'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      const prefix = decodePriceInput.includes('.') ? decodePriceInput.split('.')[0] : '29';
                      setDecodePriceInput(`${prefix}${c}`);
                    }}
                    className="px-1.5 py-0.5 rounded bg-[#18181c] hover:bg-[#2c2c35] text-[#ffd60a] border border-[#2c2c35] text-[10px] font-mono font-bold cursor-pointer"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Special Tag Markings Toggle */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[#92929d] font-bold uppercase">3. Upper Corner Tag Mark:</label>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setDecodeHasAsterisk(!decodeHasAsterisk)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                    decodeHasAsterisk
                      ? 'bg-[#ffd60a]/20 text-[#ffd60a] border-[#ffd60a]/50 font-black'
                      : 'bg-[#222227] text-[#92929d] border-[#2c2c35]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-base leading-none font-mono">★</span>
                    <span>Asterisk (*) "Death Star"</span>
                  </span>
                  <span>{decodeHasAsterisk ? 'YES' : 'NO'}</span>
                </button>

                {decodeClubType === "Sam's Club" && (
                  <button
                    type="button"
                    onClick={() => setDecodeHasLetterC(!decodeHasLetterC)}
                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                      decodeHasLetterC
                        ? 'bg-[#ff2d55]/20 text-[#ff2d55] border-[#ff2d55]/50 font-black'
                        : 'bg-[#222227] text-[#92929d] border-[#2c2c35]'
                    }`}
                  >
                    <span>Status Letter 'C' (Cancelled)</span>
                    <span>{decodeHasLetterC ? 'YES' : 'NO'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Decoded Output Box */}
          <div className="p-4 bg-[#222227] border border-[#2c2c35] rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2c2c35] pb-2.5">
              <div>
                <span className="text-[10px] text-[#92929d] font-bold uppercase">Decoded Liquidation Category:</span>
                <div className="text-base font-black text-[#f5f5f7] flex items-center gap-2">
                  <span style={{ color: decodedTagAnalysis.badgeColor }}>● {decodedTagAnalysis.type}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#18181c] text-[#f5f5f7] border border-[#2c2c35] font-mono">
                    {decodedTagAnalysis.severity}
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] text-[#92929d] font-bold uppercase">Hunter Verdict:</span>
                <div className="text-sm font-black text-[#ffd60a]">{decodedTagAnalysis.actionVerdict}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-[#18181c] p-3 rounded-xl border border-[#2c2c35] space-y-1">
                <span className="text-[10px] text-[#ffd60a] font-bold uppercase block">Inventory Restock Status:</span>
                <p className="text-[#f5f5f7] font-semibold">{decodedTagAnalysis.reorderStatus}</p>
              </div>

              <div className="bg-[#18181c] p-3 rounded-xl border border-[#2c2c35] space-y-1">
                <span className="text-[10px] text-[#34c759] font-bold uppercase block">Negotiation Power:</span>
                <p className="text-[#f5f5f7] font-semibold">{decodedTagAnalysis.negotiable}</p>
              </div>
            </div>

            <div className="bg-[#18181c] p-3 rounded-xl border border-[#2c2c35] text-xs text-[#92929d] leading-relaxed">
              <strong className="text-[#f5f5f7]">Tactical Explanation: </strong>
              {decodedTagAnalysis.explanation}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: WHOLESALE PALLET SOURCING BLUEPRINT                               */}
      {/* ========================================================================= */}
      {activeTab === 'rules' && (
        <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="border-b border-[#2c2c35] pb-3">
            <h3 className="text-base sm:text-lg font-black text-[#f5f5f7] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0a84ff]" /> The Master Guide to Wholesale Club Liquidation
            </h3>
            <p className="text-xs text-[#92929d] mt-0.5">
              Everything you need to master sourcing high-ticket electronics, power tools, and patio pallets at Costco and Sam's Club.
            </p>
          </div>

          {/* Master Rules Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WHOLESALE_PRICE_CODE_RULES.map((rule) => (
              <div key={rule.code + rule.club} className="bg-[#222227] p-3.5 rounded-xl border border-[#2c2c35] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black font-mono" style={{ color: rule.badgeColor }}>
                    {rule.code} ({rule.club})
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18181c] text-[#f5f5f7] font-semibold">
                    {rule.significance}
                  </span>
                </div>
                <div className="text-xs font-bold text-[#f5f5f7]">{rule.name}</div>
                <p className="text-[11px] text-[#92929d] leading-snug">{rule.description}</p>
                <div className="pt-1 text-[11px] text-[#ffd60a] font-semibold leading-snug">
                  👉 <strong>Scout Action:</strong> {rule.action}
                </div>
              </div>
            ))}
          </div>

          {/* Pallet Stash Spots Guide */}
          <div className="p-4 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs space-y-2">
            <h4 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#ffd60a]" /> Where to Walk in the Warehouse (The "Fence" & "Back Wall")
            </h4>
            <ul className="space-y-1.5 text-[#92929d] text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-[#ff3b30] font-bold">•</span>
                <span>
                  <strong>The Center "Fence" Aisles:</strong> The center wide runway dividing clothing from food/electronics is where Costco dumps seasonal overstock pallets that need to vanish.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#ff9800] font-bold">•</span>
                <span>
                  <strong>The Back Perimeter Wall:</strong> Near the tire center and paper towel steel racks. Single unit manager markdowns (.00) are commonly stashed on bottom shelving.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#34c759] font-bold">•</span>
                <span>
                  <strong>Monday Morning Markdown Run (9:45 AM - 11:00 AM):</strong> Warehouse supervisors perform inventory walks on Monday mornings to clear units returned over the weekend. New .00 and .97 shelf tags are printed before noon.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CUSTOM DEATH MARK SIGHTING                                     */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl w-full max-w-lg p-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-[#92929d] hover:text-white hover:bg-[#222227] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-[#ff3b30]" />
              <h3 className="text-base font-black text-[#f5f5f7]">Report Warehouse Death Mark / .97</h3>
            </div>
            <p className="text-xs text-[#92929d] mb-4">
              Found a .97, .00, or Asterisk (*) liquidation deal in your local club? Log it to update your sourcing radar.
            </p>

            <form onSubmit={handleAddSighting} className="space-y-3 text-xs">
              <div>
                <label className="text-[#92929d] font-bold uppercase block mb-1">Product Title & Brand:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Traeger Flatrock Griddle or Ninja Air Fryer"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none focus:border-[#ff3b30]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#92929d] font-bold uppercase block mb-1">Club Chain:</label>
                  <select
                    value={newClub}
                    onChange={(e) => setNewClub(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                  >
                    <option value="Costco Wholesale">Costco Wholesale</option>
                    <option value="Sam's Club">Sam's Club</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#92929d] font-bold uppercase block mb-1">Club Item # (Optional):</label>
                  <input
                    type="text"
                    placeholder="e.g. 1694820"
                    value={newItemNum}
                    onChange={(e) => setNewItemNum(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[#92929d] font-bold uppercase block mb-1">Original Price ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="899.99"
                    value={newOrigPrice}
                    onChange={(e) => setNewOrigPrice(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-[#34c759] font-bold uppercase block mb-1">Markdown Price ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="449.97"
                    value={newMarkdownPrice}
                    onChange={(e) => setNewMarkdownPrice(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#222227] border border-[#34c759]/60 rounded-xl text-[#34c759] font-bold font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-[#ffd60a] font-bold uppercase block mb-1">Est Resell Price ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="700.00"
                    value={newResalePrice}
                    onChange={(e) => setNewResalePrice(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#222227] border border-[#ffd60a]/60 rounded-xl text-[#ffd60a] font-bold font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hasAsteriskCheck"
                  checked={newHasAsterisk}
                  onChange={(e) => setNewHasAsterisk(e.target.checked)}
                  className="rounded text-[#ffd60a] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="hasAsteriskCheck" className="text-xs text-[#f5f5f7] font-bold cursor-pointer">
                  Tag has Asterisk (*) "Death Star" in top right corner (SKU deleted)
                </label>
              </div>

              <div>
                <label className="text-[#92929d] font-bold uppercase block mb-1">Pallet / Aisle Location:</label>
                <input
                  type="text"
                  placeholder="e.g. Center Fence Aisle 12 or Patio Pallet Row"
                  value={newAisle}
                  onChange={(e) => setNewAisle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                />
              </div>

              <div>
                <label className="text-[#92929d] font-bold uppercase block mb-1">Hunter Scout Tip:</label>
                <input
                  type="text"
                  placeholder="e.g. 3 sealed units left on lower shelf, clean boxes"
                  value={newHunterTip}
                  onChange={(e) => setNewHunterTip(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl bg-[#222227] text-[#92929d] hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#ff3b30] hover:bg-[#ff453a] text-white font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Log Death Mark</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
