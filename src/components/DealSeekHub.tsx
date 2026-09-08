import React, { useState } from 'react';
import {
  Flame,
  Search,
  Tag,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Calculator,
  ShoppingBag,
  Plus,
  Percent,
  Sparkles,
  AlertTriangle,
  Zap,
  TrendingUp,
  ShieldCheck,
  X,
  Store,
} from 'lucide-react';
import { DealSeekItem, DealSeekStore, DealSeekType } from '../types';
import { DEFAULT_DEALSEEK_ITEMS } from '../data/defaultDeals';

interface DealSeekHubProps {
  onLoadIntoCalculator: (prefill: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => void;
  onAddToCart?: (deal: DealSeekItem) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const DealSeekHub: React.FC<DealSeekHubProps> = ({
  onLoadIntoCalculator,
  onAddToCart,
  onNotify,
}) => {
  const [deals, setDeals] = useState<DealSeekItem[]>(() => {
    try {
      const saved = localStorage.getItem('dealSeekDeals');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load dealSeekDeals', e);
    }
    return DEFAULT_DEALSEEK_ITEMS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('All');
  const [selectedDiscount, setSelectedDiscount] = useState<number>(0);
  const [selectedType, setSelectedType] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'discount' | 'upvotes' | 'profit' | 'price'>('discount');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Deal Form State
  const [newTitle, setNewTitle] = useState('');
  const [newStore, setNewStore] = useState<DealSeekStore>('Amazon');
  const [newCategory, setNewCategory] = useState('Electronics');
  const [newDealType, setNewDealType] = useState<DealSeekType>('promo_code');
  const [newOrigPrice, setNewOrigPrice] = useState('49.99');
  const [newDealPrice, setNewDealPrice] = useState('12.49');
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newCouponText, setNewCouponText] = useState('');
  const [newDealUrl, setNewDealUrl] = useState('');
  const [newEstResell, setNewEstResell] = useState('35.00');
  const [newNotes, setNewNotes] = useState('');

  // Persist to local storage
  const saveDeals = (updated: DealSeekItem[]) => {
    setDeals(updated);
    try {
      localStorage.setItem('dealSeekDeals', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save dealSeekDeals', e);
    }
  };

  const handleCopyCode = async (deal: DealSeekItem) => {
    if (!deal.promoCode) return;
    try {
      await navigator.clipboard.writeText(deal.promoCode);
      setCopiedCodeId(deal.id);
      onNotify(`Copied code "${deal.promoCode}"! Paste at ${deal.store} checkout.`, 'success');
      setTimeout(() => setCopiedCodeId(null), 2500);
    } catch {
      onNotify(`Code: ${deal.promoCode}`, 'info');
    }
  };

  const handleVote = (id: string, direction: 'up' | 'down') => {
    const updated = deals.map((d) => {
      if (d.id !== id) return d;
      if (d.userVoted === direction) {
        // Toggle off
        return {
          ...d,
          upvotes: direction === 'up' ? d.upvotes - 1 : d.upvotes,
          downvotes: direction === 'down' ? d.downvotes - 1 : d.downvotes,
          userVoted: undefined,
        };
      }
      const prevVoted = d.userVoted;
      return {
        ...d,
        upvotes:
          direction === 'up'
            ? d.upvotes + 1
            : prevVoted === 'up'
            ? d.upvotes - 1
            : d.upvotes,
        downvotes:
          direction === 'down'
            ? d.downvotes + 1
            : prevVoted === 'down'
            ? d.downvotes - 1
            : d.downvotes,
        userVoted: direction,
      };
    });
    saveDeals(updated);
    onNotify(direction === 'up' ? 'Marked deal as still working!' : 'Reported deal issue/expired.', 'info');
  };

  const handleAddDeal = (e: React.FormEvent) => {
    e.preventDefault();
    const orig = parseFloat(newOrigPrice) || 0;
    const deal = parseFloat(newDealPrice) || 0;
    const resell = parseFloat(newEstResell) || deal * 2;
    const discount = orig > 0 ? Math.round(((orig - deal) / orig) * 100) : 50;

    const newItem: DealSeekItem = {
      id: `custom-deal-${Date.now()}`,
      title: newTitle.trim() || 'Found Promo Deal',
      store: newStore,
      category: newCategory,
      dealType: newDealType,
      origPrice: orig,
      dealPrice: deal,
      discountPct: discount,
      promoCode: newPromoCode.trim() || undefined,
      clippableCouponText: newCouponText.trim() || undefined,
      dealUrl: newDealUrl.trim() || `https://www.google.com/search?q=${encodeURIComponent(newTitle)}`,
      estResellPrice: resell,
      verifiedTime: 'Just now by you',
      isStaffPick: false,
      isGlitch: discount >= 85,
      upvotes: 1,
      downvotes: 0,
      userVoted: 'up',
      notes: newNotes.trim() || undefined,
    };

    const updated = [newItem, ...deals];
    saveDeals(updated);
    setShowAddModal(false);
    onNotify(`Added deal: "${newItem.title}" (${discount}% OFF)`, 'success');

    // Reset inputs
    setNewTitle('');
    setNewPromoCode('');
    setNewCouponText('');
    setNewDealUrl('');
    setNewNotes('');
  };

  // Filter & Search Logic
  const filteredDeals = deals.filter((deal) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      deal.title.toLowerCase().includes(q) ||
      deal.store.toLowerCase().includes(q) ||
      deal.category.toLowerCase().includes(q) ||
      (deal.promoCode && deal.promoCode.toLowerCase().includes(q)) ||
      (deal.notes && deal.notes.toLowerCase().includes(q));

    const matchesStore = selectedStore === 'All' || deal.store === selectedStore;
    const matchesDiscount = deal.discountPct >= selectedDiscount;
    const matchesType =
      selectedType === 'All' ||
      (selectedType === 'glitch' && deal.isGlitch) ||
      (selectedType === 'promo_code' && deal.promoCode) ||
      (selectedType === 'clippable' && deal.clippableCouponText) ||
      (selectedType === 'price_drop' && deal.dealType === 'price_drop');

    return matchesQuery && matchesStore && matchesDiscount && matchesType;
  });

  // Sort Logic
  const sortedDeals = [...filteredDeals].sort((a, b) => {
    if (sortBy === 'discount') {
      return b.discountPct - a.discountPct;
    }
    if (sortBy === 'upvotes') {
      return b.upvotes - b.downvotes - (a.upvotes - a.downvotes);
    }
    if (sortBy === 'profit') {
      const profitA = a.estResellPrice - a.dealPrice;
      const profitB = b.estResellPrice - b.dealPrice;
      return profitB - profitA;
    }
    if (sortBy === 'price') {
      return a.dealPrice - b.dealPrice;
    }
    return 0;
  });

  const glitchCount = deals.filter((d) => d.isGlitch || d.discountPct >= 80).length;

  return (
    <div id="dealSeekHub" className="space-y-4 mb-6">
      {/* DealSeek Header Banner */}
      <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#ff3b30]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-[#ff3b30]/20 text-[#ff453a] text-[11px] font-extrabold tracking-wide uppercase border border-[#ff3b30]/40 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-[#ff453a]" /> DealSeek Engine
              </span>
              <span className="text-xs text-[#92929d] flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#ff9800]" /> Verified Promo Codes & Glitches
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#f5f5f7] tracking-tight flex items-center gap-2">
              Promo Codes, Coupons & Price Drops
            </h2>
            <p className="text-xs text-[#92929d] mt-1 max-w-lg leading-relaxed">
              Find deep discounts up to 99% off across Amazon, Walmart, Target & Best Buy with 1-tap copy promo codes, then check your resale flip profit with our Arbitrage Engine.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3 py-2 rounded-xl bg-[#ff9800] hover:bg-[#e08600] text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Submit Deal</span>
            </button>
          </div>
        </div>

        {/* Live Glitch Alert Ticker */}
        <div className="mt-3 pt-3 border-t border-[#2c2c35]/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#ff9800] font-medium">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>
              <strong>{glitchCount} Active Glitches & 80%+ Drops:</strong> Live promo codes detected today.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedType('glitch');
              setSelectedDiscount(80);
            }}
            className="text-[11px] text-[#0a84ff] hover:underline font-semibold shrink-0 cursor-pointer"
          >
            Show Glitches Only →
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-3.5 sm:p-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#92929d]" />
          <input
            type="text"
            placeholder="Search deals by title, brand, store, or promo code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] text-xs sm:text-sm placeholder-[#92929d]/60 focus:border-[#ff9800] outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#92929d] hover:text-[#f5f5f7] p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Store Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="text-[#92929d] text-[11px] font-semibold uppercase shrink-0 mr-1 flex items-center gap-1">
            <Store className="w-3 h-3" /> Stores:
          </span>
          {['All', 'Amazon', 'Walmart', 'Target', 'Best Buy', 'Dollar General', 'Home Depot'].map(
            (store) => (
              <button
                key={store}
                type="button"
                onClick={() => setSelectedStore(store)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedStore === store
                    ? 'bg-[#ff9800] text-black font-bold shadow-xs'
                    : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
                }`}
              >
                {store}
              </button>
            )
          )}
        </div>

        {/* Discount Magnitude & Deal Type Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#2c2c35]/50 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[#92929d] text-[11px] font-semibold uppercase">Discount:</span>
            {[
              { label: 'All', val: 0 },
              { label: '50%+ Off', val: 50 },
              { label: '70%+ Off', val: 70 },
              { label: '80%+ Glitches', val: 80 },
              { label: '90%+ Freebie', val: 90 },
            ].map((disc) => (
              <button
                key={disc.val}
                type="button"
                onClick={() => setSelectedDiscount(disc.val)}
                className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
                  selectedDiscount === disc.val
                    ? 'bg-[#ff453a] text-white shadow-xs'
                    : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
                }`}
              >
                {disc.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#92929d] text-[11px] font-semibold uppercase">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#222227] border border-[#2c2c35] text-[#f5f5f7] text-[11px] rounded-lg px-2 py-1 outline-none font-medium"
            >
              <option value="discount">Highest % Off</option>
              <option value="upvotes">Community Popular</option>
              <option value="profit">Highest Flip Profit</option>
              <option value="price">Lowest Price</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deals Count & Clear Filters Indicator */}
      <div className="flex items-center justify-between text-xs px-1 text-[#92929d]">
        <span>
          Showing <strong className="text-[#f5f5f7]">{sortedDeals.length}</strong> active deal{sortedDeals.length === 1 ? '' : 's'}
          {selectedStore !== 'All' && ` at ${selectedStore}`}
          {selectedDiscount > 0 && ` (${selectedDiscount}%+ Off)`}
        </span>
        {(selectedStore !== 'All' || selectedDiscount > 0 || searchQuery || selectedType !== 'All') && (
          <button
            type="button"
            onClick={() => {
              setSelectedStore('All');
              setSelectedDiscount(0);
              setSelectedType('All');
              setSearchQuery('');
            }}
            className="text-[#ff9800] hover:underline font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Deals Grid / List */}
      <div className="space-y-3">
        {sortedDeals.length === 0 ? (
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-8 text-center">
            <Tag className="w-8 h-8 text-[#92929d] mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-[#f5f5f7] mb-1">No deals match your filters</h3>
            <p className="text-xs text-[#92929d] max-w-sm mx-auto mb-3">
              Try relaxing your discount criteria or store filter to see more verified promo codes and price drops.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedStore('All');
                setSelectedDiscount(0);
                setSelectedType('All');
                setSearchQuery('');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#222227] text-[#ff9800] border border-[#2c2c35] text-xs font-bold hover:border-[#ff9800]"
            >
              View All Deals
            </button>
          </div>
        ) : (
          sortedDeals.map((deal) => {
            const savings = deal.origPrice - deal.dealPrice;
            const estFlipProfit = deal.estResellPrice - deal.dealPrice - deal.estResellPrice * 0.15 - 4.5;
            const isCodeCopied = copiedCodeId === deal.id;

            return (
              <div
                key={deal.id}
                className="bg-[#18181c] border border-[#2c2c35] hover:border-[#ff9800]/50 rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all relative overflow-hidden group"
              >
                {/* Glitch or Staff Pick ribbon */}
                {deal.isGlitch && (
                  <div className="absolute top-0 right-0 bg-linear-to-l from-[#ff3b30] to-[#ff9800] text-black text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-lg shadow-sm flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 fill-black" /> Price Glitch / 80%+
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left Column: Deal Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-[#222227] text-[#f5f5f7] font-bold border border-[#2c2c35]">
                        {deal.store}
                      </span>
                      <span className="text-[11px] text-[#92929d]">
                        {deal.category}
                      </span>
                      <span className="text-[10px] text-[#34c759] flex items-center gap-0.5 font-medium">
                        <ShieldCheck className="w-3 h-3" /> {deal.verifiedTime}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-[#f5f5f7] group-hover:text-[#ff9800] transition-colors leading-snug">
                      {deal.title}
                    </h3>

                    {/* Price and Savings Row */}
                    <div className="flex items-baseline gap-2.5 mt-2 flex-wrap">
                      <span className="text-xl sm:text-2xl font-black text-[#34c759] tracking-tight font-mono">
                        ${deal.dealPrice.toFixed(2)}
                      </span>
                      <span className="text-xs text-[#92929d] line-through font-mono">
                        ${deal.origPrice.toFixed(2)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#ff3b30]/20 text-[#ff453a] font-extrabold text-xs border border-[#ff3b30]/30">
                        {deal.discountPct}% OFF
                      </span>
                      <span className="text-xs text-[#92929d]">
                        (Save ${savings.toFixed(2)})
                      </span>
                    </div>

                    {/* Promo Code Box or Clippable Coupon Note */}
                    {deal.promoCode && (
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-[#222227] border border-dashed border-[#ff9800] px-2.5 py-1 rounded-lg text-xs font-mono">
                          <span className="text-[10px] text-[#92929d] uppercase">Code:</span>
                          <span className="font-extrabold text-[#ff9800] tracking-wider select-all">
                            {deal.promoCode}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(deal)}
                          className="px-2.5 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#f5f5f7] border border-[#2c2c35] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {isCodeCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#34c759]" />
                              <span className="text-[#34c759]">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#92929d]" />
                              <span>Copy Code</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {deal.clippableCouponText && (
                      <div className="mt-2 text-xs text-[#ff9800] flex items-center gap-1 bg-[#ff9800]/10 px-2.5 py-1 rounded-lg border border-[#ff9800]/20 w-fit">
                        <Tag className="w-3 h-3 shrink-0" />
                        <span>{deal.clippableCouponText}</span>
                      </div>
                    )}

                    {deal.notes && (
                      <p className="text-xs text-[#92929d] mt-2 leading-relaxed italic">
                        💡 {deal.notes}
                      </p>
                    )}

                    {/* Reseller Arbitrage Intel Badge */}
                    <div className="mt-2.5 pt-2 border-t border-[#2c2c35]/50 flex items-center gap-3 text-xs flex-wrap">
                      <div className="flex items-center gap-1 text-[#0a84ff] font-semibold">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Est. Resale: ${deal.estResellPrice.toFixed(2)}</span>
                      </div>
                      <div className="text-[#34c759] font-bold">
                        Flip Profit: ~${estFlipProfit > 0 ? estFlipProfit.toFixed(2) : '0.00'}
                      </div>
                      <div className="text-[11px] text-[#92929d]">
                        ROI: {Math.round((estFlipProfit / (deal.dealPrice || 1)) * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Action Buttons & Community Votes */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#2c2c35]">
                    {/* Primary Buy / View Button */}
                    <a
                      href={deal.dealUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-[#ff9800] hover:bg-[#e08600] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 text-center"
                    >
                      <span>Buy on {deal.store}</span>
                      <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                    </a>

                    {/* Resale Arbitrage Calculator Fast-Track */}
                    <button
                      type="button"
                      onClick={() => {
                        onLoadIntoCalculator({
                          name: `${deal.store}: ${deal.title}`,
                          buy: deal.dealPrice.toFixed(2),
                          sell: deal.estResellPrice.toFixed(2),
                          store: deal.store,
                        });
                        onNotify(`Loaded "${deal.title}" into Arbitrage Calculator`, 'info');
                      }}
                      className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#f5f5f7] border border-[#2c2c35] hover:border-[#ff9800] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Load into 1¢ & Arbitrage Calculator"
                    >
                      <Calculator className="w-3.5 h-3.5 text-[#ff9800]" />
                      <span>Flip Calc</span>
                    </button>

                    {/* Community Upvote / Downvote Feedback */}
                    <div className="flex items-center gap-1 bg-[#222227] px-2 py-1 rounded-lg border border-[#2c2c35] text-xs">
                      <button
                        type="button"
                        onClick={() => handleVote(deal.id, 'up')}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                          deal.userVoted === 'up'
                            ? 'text-[#34c759] font-bold'
                            : 'text-[#92929d] hover:text-[#34c759]'
                        }`}
                        title="Worked for me!"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{deal.upvotes}</span>
                      </button>
                      <span className="text-[#2c2c35]">|</span>
                      <button
                        type="button"
                        onClick={() => handleVote(deal.id, 'down')}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                          deal.userVoted === 'down'
                            ? 'text-[#ff3b30] font-bold'
                            : 'text-[#92929d] hover:text-[#ff3b30]'
                        }`}
                        title="Expired or not working"
                      >
                        <ThumbsDown className="w-3 h-3" />
                        <span>{deal.downvotes}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Submit Deal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#ff453a]" />
                <h3 className="text-base font-bold text-[#f5f5f7]">Submit New Deal or Promo Code</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#92929d] hover:text-[#f5f5f7] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDeal} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Product / Deal Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apple AirPods Pro 2 USB-C"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] focus:border-[#ff9800] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Store
                  </label>
                  <select
                    value={newStore}
                    onChange={(e) => setNewStore(e.target.value as DealSeekStore)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                  >
                    <option value="Amazon">Amazon</option>
                    <option value="Walmart">Walmart</option>
                    <option value="Target">Target</option>
                    <option value="Best Buy">Best Buy</option>
                    <option value="Dollar General">Dollar General</option>
                    <option value="Home Depot">Home Depot</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Home & Kitchen">Home & Kitchen</option>
                    <option value="Toys & Kids">Toys & Kids</option>
                    <option value="Tools & Hardware">Tools & Hardware</option>
                    <option value="Patio & Home">Patio & Home</option>
                    <option value="Grocery & Household">Grocery & Household</option>
                    <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                    <option value="Sports & Outdoors">Sports & Outdoors</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Original ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrigPrice}
                    onChange={(e) => setNewOrigPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Deal Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newDealPrice}
                    onChange={(e) => setNewDealPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Est Resell ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newEstResell}
                    onChange={(e) => setNewEstResell(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Promo Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SAVE50PROMO"
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Clippable / Coupon Text
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Clip 20% on page"
                    value={newCouponText}
                    onChange={(e) => setNewCouponText(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Deal Link / URL
                </label>
                <input
                  type="url"
                  placeholder="https://www.amazon.com/dp/..."
                  value={newDealUrl}
                  onChange={(e) => setNewDealUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Hacking / Stacking Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Add 2 to cart, apply promo code at checkout step 3."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222227] text-[#92929d] hover:text-white font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#ff9800] text-black font-bold hover:bg-[#e08600] transition-colors cursor-pointer"
                >
                  Publish Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
