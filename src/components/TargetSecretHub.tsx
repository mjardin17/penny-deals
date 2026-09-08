import React, { useState, useMemo } from 'react';
import {
  Tag,
  Calendar,
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
} from 'lucide-react';
import { TargetClearanceItem, TargetDayOfWeek } from '../types';
import {
  TARGET_MARKDOWN_SCHEDULE,
  TARGET_TAG_MATRIX_RULES,
  DEFAULT_TARGET_DEALS,
} from '../data/defaultTargetDeals';

interface TargetSecretHubProps {
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

export const TargetSecretHub: React.FC<TargetSecretHubProps> = ({
  zipCode,
  onLoadIntoCalculator,
  onAddToCart,
  onNotify,
  onOpenScanner,
}) => {
  // Determine current day of week
  const todayDayName = useMemo<TargetDayOfWeek>(() => {
    const days: TargetDayOfWeek[] = ['Weekend', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Weekend'];
    const d = new Date().getDay();
    return days[d] || 'Thursday';
  }, []);

  const [selectedDay, setSelectedDay] = useState<TargetDayOfWeek>(
    todayDayName === 'Weekend' ? 'Thursday' : todayDayName
  );
  const [deals, setDeals] = useState<TargetClearanceItem[]>(() => {
    try {
      const saved = localStorage.getItem('targetClearanceDeals');
      return saved ? JSON.parse(saved) : DEFAULT_TARGET_DEALS;
    } catch {
      return DEFAULT_TARGET_DEALS;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [filterSalvageOnly, setFilterSalvageOnly] = useState(false);
  const [filter04Only, setFilter04Only] = useState(false);
  const [showTagGuide, setShowTagGuide] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedDpci, setCopiedDpci] = useState<string | null>(null);

  // Interactive Price Ending Decoder State
  const [testDecoderPrice, setTestDecoderPrice] = useState('14.04');

  // Save to localStorage
  const saveDeals = (updated: TargetClearanceItem[]) => {
    setDeals(updated);
    try {
      localStorage.setItem('targetClearanceDeals', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save Target deals', e);
    }
  };

  // Copy DPCI
  const handleCopyDpci = (dpci: string) => {
    navigator.clipboard.writeText(dpci);
    setCopiedDpci(dpci);
    onNotify(`Copied DPCI ${dpci} to clipboard!`, 'info');
    setTimeout(() => setCopiedDpci(null), 2000);
  };

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !q ||
        deal.title.toLowerCase().includes(q) ||
        deal.dpci.toLowerCase().includes(q) ||
        deal.upc.toLowerCase().includes(q) ||
        deal.department.toLowerCase().includes(q) ||
        deal.aisleEndcap.toLowerCase().includes(q);

      const matchesDept =
        selectedDepartment === 'All' || deal.department === selectedDepartment;

      const matchesSalvage = !filterSalvageOnly || deal.isSalvage || deal.clearancePercent >= 70;
      const matches04 = !filter04Only || deal.priceEnding === '.04';

      return matchesQuery && matchesDept && matchesSalvage && matches04;
    });
  }, [deals, searchQuery, selectedDepartment, filterSalvageOnly, filter04Only]);

  // Decode test price for the interactive simulator
  const decodedResult = useMemo(() => {
    const val = testDecoderPrice.trim();
    if (!val) return null;
    const num = parseFloat(val);
    if (isNaN(num)) return null;

    if (val.endsWith('.04')) {
      return {
        badge: 'FINAL FLOOR SALVAGE (.04)',
        type: 'salvage',
        color: 'text-[#ff3b30] bg-[#ff3b30]/15 border-[#ff3b30]/40',
        summary: 'Lowest possible retail markdown. Target will not mark this down again. Heading to liquidation/salvage within 48h.',
        action: 'BUY IMMEDIATELY - High profit margin guaranteed.',
      };
    } else if (val.endsWith('.98')) {
      return {
        badge: 'STANDARD CLEARANCE CUT (.98)',
        type: 'clearance',
        color: 'text-[#ffd60a] bg-[#ffd60a]/15 border-[#ffd60a]/40',
        summary: 'Standard 15%, 30%, or 50% markdown. If shelves remain full, check back in 10-14 days for 70% or .04 salvage.',
        action: 'Good buy if comps allow, or watch for next cycle.',
      };
    } else if (val.endsWith('.99')) {
      return {
        badge: 'FULL REGULAR RETAIL (.99)',
        type: 'retail',
        color: 'text-[#92929d] bg-[#222227] border-[#2c2c35]',
        summary: 'Standard MSRP. Has not yet entered clearance cycle.',
        action: 'Do not buy for clearance arbitrage unless promo coupon applies.',
      };
    } else {
      return {
        badge: `SPECIAL / PROMO ENDING (${val.slice(-3)})`,
        type: 'special',
        color: 'text-[#007aff] bg-[#007aff]/15 border-[#007aff]/40',
        summary: 'Promotional markdown or store-specific manager clearance.',
        action: 'Scan at in-store price scanner to verify actual price.',
      };
    }
  }, [testDecoderPrice]);

  // Selected schedule details
  const activeSchedule = useMemo(() => {
    return (
      TARGET_MARKDOWN_SCHEDULE.find((s) => s.day === selectedDay) ||
      TARGET_MARKDOWN_SCHEDULE[3]
    );
  }, [selectedDay]);

  // New Deal Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDpci, setNewDpci] = useState('');
  const [newUpc, setNewUpc] = useState('');
  const [newDept, setNewDept] = useState('Toys');
  const [newOrigPrice, setNewOrigPrice] = useState('');
  const [newCurrPrice, setNewCurrPrice] = useState('');
  const [newPercent, setNewPercent] = useState('70');
  const [newEndcap, setNewEndcap] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const handleAddDealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCurrPrice) return;

    const curr = parseFloat(newCurrPrice) || 0;
    const orig = parseFloat(newOrigPrice) || curr * 2;
    const pct = parseInt(newPercent, 10) || 70;
    const ending = curr.toFixed(2).slice(-3);

    const newItem: TargetClearanceItem = {
      id: `tgt-custom-${Date.now()}`,
      title: newTitle.trim(),
      dpci: newDpci.trim() || '000-00-0000',
      upc: newUpc.trim() || '000000000000',
      department: newDept,
      markdownDay: selectedDay,
      originalPrice: orig,
      currentPrice: curr,
      priceEnding: ending,
      clearancePercent: pct,
      isSalvage: ending === '.04' || pct >= 70,
      stickerCode: pct.toString(),
      aisleEndcap: newEndcap.trim() || 'Clearance Endcap',
      estResale: Math.round(curr * 2.2),
      stockStatus: ending === '.04' ? 'Floor Salvage Watch' : 'In Stock',
      hunterNotes: newNotes.trim() || 'Custom user reported find.',
    };

    saveDeals([newItem, ...deals]);
    setShowAddModal(false);
    onNotify(`Added "${newItem.title}" to Target Clearance Tracker!`, 'success');

    // Reset
    setNewTitle('');
    setNewDpci('');
    setNewUpc('');
    setNewOrigPrice('');
    setNewCurrPrice('');
    setNewEndcap('');
    setNewNotes('');
  };

  return (
    <div className="bg-[#18181c] border border-[#ff3b30]/30 rounded-3xl p-4 sm:p-5 shadow-xl space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2c2c35]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ff3b30]/15 border border-[#ff3b30]/40 flex items-center justify-center text-[#ff3b30] shadow-sm shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-[#f5f5f7] tracking-tight">
                Target Secret Clearance & Markdown Matrix
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff3b30] text-white font-black uppercase tracking-wider">
                DPCI & Salvage Radar
              </span>
            </div>
            <p className="text-xs text-[#92929d] mt-0.5">
              Weekly department schedule, red sticker decoder (.04 salvage), & clearance endcap tracker.
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
            <Info className="w-3.5 h-3.5 text-[#ff3b30]" />
            <span>Tag Decoder Matrix</span>
            {showTagGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-xl bg-[#ff3b30] hover:bg-[#e03126] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Report Clearance</span>
          </button>
        </div>
      </div>

      {/* TODAY'S FLASH BANNER */}
      <div className="p-3 bg-gradient-to-r from-[#ff3b30]/15 via-[#18181c] to-[#ff3b30]/10 border border-[#ff3b30]/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff3b30] animate-pulse shrink-0" />
          <div className="text-xs text-[#f5f5f7]">
            <span className="font-extrabold text-[#ff3b30] uppercase">
              {todayDayName === 'Weekend' ? 'Weekend Reset Watch' : `${todayDayName} Markdowns Active:`}
            </span>{' '}
            <span className="text-[#92929d]">
              {todayDayName === 'Weekend'
                ? 'Check clearance endcaps for carryover .04 salvage tags before Monday zone reset.'
                : TARGET_MARKDOWN_SCHEDULE.find((s) => s.day === todayDayName)?.departments.join(', ')}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-[#ffd60a] font-mono shrink-0 font-bold">
          ZIP {zipCode} Active Radar
        </div>
      </div>

      {/* WEEKLY DEPARTMENT SCHEDULE SELECTOR */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#92929d] uppercase">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#ff3b30]" /> Weekly Target Markdown Cadence:
          </span>
          <span className="text-[10px] text-[#ff3b30] normal-case font-medium">
            (Select day to view department targets)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {TARGET_MARKDOWN_SCHEDULE.map((sched) => {
            const isToday = sched.day === todayDayName;
            const isSelected = sched.day === selectedDay;
            return (
              <button
                key={sched.day}
                type="button"
                onClick={() => setSelectedDay(sched.day)}
                className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#ff3b30] text-white border-[#ff3b30] shadow-md font-bold'
                    : 'bg-[#121215] text-[#92929d] hover:text-[#f5f5f7] border-[#2c2c35] hover:border-[#ff3b30]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black">{sched.day}</span>
                  {isToday && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                        isSelected ? 'bg-white text-[#ff3b30]' : 'bg-[#ff3b30] text-white'
                      }`}
                    >
                      Today
                    </span>
                  )}
                </div>
                <div
                  className={`text-[10px] mt-1 line-clamp-1 ${
                    isSelected ? 'text-white/90' : 'text-[#92929d]'
                  }`}
                >
                  {sched.departments.slice(0, 2).join(', ')}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Day Details Panel */}
        <div className="p-3.5 rounded-2xl bg-[#121215] border border-[#2c2c35] space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-[#ff3b30]/20 text-[#ff3b30] font-black uppercase text-[11px]">
                {activeSchedule.day} Department Priority
              </span>
              <span className="text-xs font-bold text-[#f5f5f7]">
                {activeSchedule.departments.join(' • ')}
              </span>
            </div>
            <span className="text-[11px] text-[#ffd60a] font-mono">
              ⏰ {activeSchedule.bestTimeToHunt}
            </span>
          </div>

          <p className="text-[11px] text-[#92929d] leading-relaxed">
            🔍 <strong>Sticker Focus:</strong> {activeSchedule.tagStickerFocus}
          </p>
          <p className="text-[11px] text-[#92929d] leading-relaxed">
            💡 <strong>Hunter Intel:</strong> {activeSchedule.hunterTips}
          </p>
        </div>
      </div>

      {/* EXPANDABLE RED TAG DECODER & SIMULATOR */}
      {showTagGuide && (
        <div className="p-4 rounded-2xl bg-[#121215] border border-[#ff3b30]/40 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#f5f5f7] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#ff3b30]" /> Target Red Tag Secret Decoding Rules
            </h3>
            <span className="text-[11px] text-[#92929d]">Look at the physical sticker</span>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {TARGET_TAG_MATRIX_RULES.map((rule, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-[#18181c] border border-[#2c2c35] space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#ff3b30]">{rule.code}</span>
                  <span className="text-[10px] font-bold text-[#ffd60a]">{rule.meaning}</span>
                </div>
                <p className="text-[11px] text-[#92929d] leading-snug">{rule.detail}</p>
              </div>
            ))}
          </div>

          {/* Interactive Tag Price Ending Simulator */}
          <div className="p-3 bg-[#18181c] rounded-xl border border-[#2c2c35] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#f5f5f7] flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-[#ffd60a]" /> Interactive Price Ending Decoder:
              </span>
              <span className="text-[10px] text-[#92929d]">Test .04, .98, or .99</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 text-sm text-[#92929d] font-mono">$</span>
                <input
                  type="text"
                  value={testDecoderPrice}
                  onChange={(e) => setTestDecoderPrice(e.target.value)}
                  placeholder="e.g. 14.04 or 47.98"
                  className="w-full pl-7 pr-3 py-1.5 bg-[#222227] border border-[#2c2c35] rounded-lg text-sm text-[#f5f5f7] font-mono outline-none focus:border-[#ff3b30]"
                />
              </div>

              <div className="flex gap-1.5">
                {['14.04', '47.98', '159.99'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTestDecoderPrice(p)}
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
              placeholder="Search Target clearance by DPCI, UPC, Title, or Endcap..."
              className="w-full pl-9 pr-4 py-2 bg-[#121215] border border-[#2c2c35] rounded-xl text-sm text-[#f5f5f7] placeholder-[#92929d]/60 outline-none focus:border-[#ff3b30]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 bg-[#121215] border border-[#2c2c35] rounded-xl text-xs text-[#f5f5f7] outline-none cursor-pointer focus:border-[#ff3b30]"
            >
              <option value="All">All Departments</option>
              <option value="Toys">Toys (Thursday)</option>
              <option value="Housewares & Cookware">Housewares & Cookware</option>
              <option value="Electronics">Electronics (Monday)</option>
              <option value="Bullseye Playground">Bullseye Playground</option>
              <option value="Hardware & Home Improvement">Hardware</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Toggles */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => setFilterSalvageOnly(!filterSalvageOnly)}
            className={`px-2.5 py-1 rounded-lg border font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              filterSalvageOnly
                ? 'bg-[#ff3b30] text-white border-[#ff3b30]'
                : 'bg-[#121215] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7]'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>70% & 90% Salvage Only</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter04Only(!filter04Only)}
            className={`px-2.5 py-1 rounded-lg border font-bold transition-colors cursor-pointer flex items-center gap-1 ${
              filter04Only
                ? 'bg-[#ff3b30] text-white border-[#ff3b30]'
                : 'bg-[#121215] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7]'
            }`}
          >
            <Tag className="w-3 h-3" />
            <span>Ending in .04 Floor Price</span>
          </button>

          <span className="text-[11px] text-[#92929d] ml-auto">
            Showing <strong className="text-[#f5f5f7]">{filteredDeals.length}</strong> Target items
          </span>
        </div>
      </div>

      {/* CLEARANCE DEALS CARDS */}
      <div className="space-y-3">
        {filteredDeals.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#121215] border border-[#2c2c35] space-y-2">
            <Tag className="w-8 h-8 text-[#92929d] mx-auto opacity-50" />
            <h4 className="text-sm font-bold text-[#f5f5f7]">No Target Clearance Found</h4>
            <p className="text-xs text-[#92929d]">
              Try adjusting your search query or toggling off the salvage filters.
            </p>
          </div>
        ) : (
          filteredDeals.map((deal) => {
            const netProfit = (deal.estResale - deal.currentPrice - deal.estResale * 0.13 - 4.5).toFixed(2);
            const roi = Math.round(((parseFloat(netProfit) || 0) / deal.currentPrice) * 100);

            return (
              <div
                key={deal.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-3 ${
                  deal.isSalvage || deal.priceEnding === '.04'
                    ? 'bg-[#18181c] border-[#ff3b30]/50 shadow-md hover:border-[#ff3b30]'
                    : 'bg-[#121215] border-[#2c2c35] hover:border-[#ff3b30]/40'
                }`}
              >
                {/* Top Row: Department, Day, Salvage Badge, DPCI */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#ff3b30] text-white font-black uppercase tracking-wider">
                      Target • {deal.department}
                    </span>

                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#222227] text-[#f5f5f7] border border-[#2c2c35] font-bold">
                      {deal.markdownDay} Drop
                    </span>

                    {deal.priceEnding === '.04' ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#ff3b30]/20 text-[#ff3b30] border border-[#ff3b30]/50 font-black animate-pulse">
                        🔥 .04 SALVAGE FLOOR
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/40 font-bold">
                        Tag Corner: "{deal.stickerCode}" ({deal.clearancePercent}% Off)
                      </span>
                    )}
                  </div>

                  {/* DPCI Tag with Copy */}
                  <button
                    type="button"
                    onClick={() => handleCopyDpci(deal.dpci)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] border border-[#2c2c35] text-[11px] font-mono text-[#f5f5f7] transition-colors cursor-pointer"
                    title="Click to copy DPCI for Target App or BrickSeek"
                  >
                    <span>DPCI: {deal.dpci}</span>
                    {copiedDpci === deal.dpci ? (
                      <Check className="w-3 h-3 text-[#34c759]" />
                    ) : (
                      <Copy className="w-3 h-3 text-[#92929d]" />
                    )}
                  </button>
                </div>

                {/* Title */}
                <h3 className="text-sm sm:text-base font-black text-[#f5f5f7] leading-snug">
                  {deal.title}
                </h3>

                {/* Price Breakdown Box */}
                <div className="p-3 bg-[#18181c] border border-[#2c2c35] rounded-xl flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-[10px] text-[#92929d] uppercase font-bold">Target MSRP:</div>
                    <div className="text-xs sm:text-sm font-bold text-[#92929d] line-through font-mono">
                      ${deal.originalPrice.toFixed(2)}
                    </div>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-[#ff3b30] hidden sm:block" />

                  <div>
                    <div className="text-[10px] text-[#34c759] uppercase font-black flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Clearance Scan Price:
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-[#34c759] font-mono leading-none">
                      ${deal.currentPrice.toFixed(2)}
                    </div>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-[#ff3b30] hidden sm:block" />

                  <div>
                    <div className="text-[10px] text-[#ffd60a] uppercase font-bold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Resale Comps:
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

                {/* Aisle Endcap Location & Hunter Notes */}
                <div className="text-xs space-y-1 bg-[#121215] p-2.5 rounded-xl border border-[#2c2c35]">
                  <div className="flex items-center gap-1 text-[#f5f5f7]">
                    <MapPin className="w-3.5 h-3.5 text-[#ff3b30] shrink-0" />
                    <strong className="text-[#ff3b30]">Target In-Store Location:</strong>{' '}
                    <span>{deal.aisleEndcap}</span>
                  </div>
                  <p className="text-[11px] text-[#92929d] leading-snug">
                    🏷️ <strong>Hunter Strategy:</strong> {deal.hunterNotes}
                  </p>

                  {/* Specific Store and Distance Details */}
                  {(() => {
                    const storeObj = deal.closestStore || (deal.inStockStoresNearZip && deal.inStockStoresNearZip[0]);
                    if (!storeObj) return null;
                    return (
                      <div className="pt-2 border-t border-[#2c2c35]/60 mt-1.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] uppercase font-bold text-[#92929d]">Available At:</span>
                            <span className="text-xs font-black text-[#f5f5f7] inline-flex items-center gap-1 bg-[#222227] px-2 py-0.5 rounded-md border border-[#2c2c35]">
                              <MapPin className="w-3 h-3 text-[#ff3b30]" />
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
                            {storeObj.stockQty} in stock
                          </span>
                        </div>

                        {deal.inStockStoresNearZip && deal.inStockStoresNearZip.length > 1 && (
                          <div className="text-[10px] text-[#92929d] flex items-center gap-1.5 flex-wrap pt-0.5 pl-1">
                            <span>Other Target nearby:</span>
                            {deal.inStockStoresNearZip.slice(1).map((s, idx) => (
                              <span key={idx} className="text-[#f5f5f7] bg-[#1c1c22] px-1.5 py-0.5 rounded border border-[#2c2c35]">
                                {s.storeName} ({s.address || s.storeNumber}) • <strong className="text-[#ffd60a]">{s.distanceMiles} mi</strong> ({s.stockQty} on hand)
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
                      href={`https://www.target.com/s?searchTerm=${encodeURIComponent(deal.dpci)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-xs text-[#f5f5f7] border border-[#2c2c35] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>Target App Check</span>
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
                        const targetStore = deal.closestStore || (deal.inStockStoresNearZip && deal.inStockStoresNearZip[0]);
                        const storeLabel = targetStore
                          ? `${targetStore.storeName} (${targetStore.address || 'Local'}) • ${targetStore.distanceMiles} mi away`
                          : 'Target Store #0892 (Swansea Mall Dr) • 3.2 mi away';
                        onLoadIntoCalculator({
                          name: `Target: ${deal.title}`,
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
                          const targetStore = deal.closestStore || (deal.inStockStoresNearZip && deal.inStockStoresNearZip[0]);
                          const storeLabel = targetStore
                            ? `${targetStore.storeName} (${targetStore.address || 'Local'}) • ${targetStore.distanceMiles} mi away`
                            : 'Target Store #0892 (Swansea Mall Dr) • 3.2 mi away';
                          onAddToCart({
                            title: deal.title,
                            buyPrice: deal.currentPrice,
                            sellPrice: deal.estResale,
                            store: storeLabel,
                            category: deal.department,
                            notes: `DPCI: ${deal.dpci} • Aisle: ${deal.aisleEndcap} • Store: ${storeLabel}`,
                          });
                          onNotify(`Added "${deal.title}" to Sourcing Cart!`, 'success');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#ff3b30] hover:bg-[#e03126] text-white text-xs font-black flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
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

      {/* ADD CUSTOM TARGET CLEARANCE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2c2c35]">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#ff3b30]" />
                <h3 className="text-base font-black text-[#f5f5f7]">Report Target Clearance Find</h3>
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
                  placeholder="e.g. Barbie Dreamhouse Playset"
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-sm text-[#f5f5f7] outline-none focus:border-[#ff3b30]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-[#92929d] block mb-1">DPCI (XXX-XX-XXXX)</label>
                  <input
                    type="text"
                    value={newDpci}
                    onChange={(e) => setNewDpci(e.target.value)}
                    placeholder="e.g. 204-00-1849"
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-sm font-mono text-[#f5f5f7] outline-none focus:border-[#ff3b30]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#92929d] block mb-1">UPC Barcode</label>
                  <input
                    type="text"
                    value={newUpc}
                    onChange={(e) => setNewUpc(e.target.value)}
                    placeholder="e.g. 673419376976"
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-sm font-mono text-[#f5f5f7] outline-none focus:border-[#ff3b30]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-[#92929d] block mb-1">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-2 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs text-[#f5f5f7] outline-none focus:border-[#ff3b30]"
                  >
                    <option value="Toys">Toys</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Housewares & Cookware">Housewares</option>
                    <option value="Apparel">Apparel</option>
                    <option value="Bullseye Playground">Bullseye Spot</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#92929d] block mb-1">Original MSRP ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrigPrice}
                    onChange={(e) => setNewOrigPrice(e.target.value)}
                    placeholder="54.99"
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-sm font-mono text-[#f5f5f7] outline-none focus:border-[#ff3b30]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#34c759] block mb-1">Clearance Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newCurrPrice}
                    onChange={(e) => setNewCurrPrice(e.target.value)}
                    placeholder="14.04"
                    className="w-full px-3 py-2 bg-[#222227] border border-[#34c759]/50 rounded-xl text-sm font-mono text-[#34c759] font-bold outline-none focus:border-[#34c759]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#92929d] block mb-1">Aisle Endcap Location</label>
                <input
                  type="text"
                  value={newEndcap}
                  onChange={(e) => setNewEndcap(e.target.value)}
                  placeholder="e.g. Rear Toy Clearance Endcap E26"
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-sm text-[#f5f5f7] outline-none focus:border-[#ff3b30]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#92929d] block mb-1">Hunter Strategy / Notes</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Sticker shows 70 in corner, 3 units left on bottom shelf..."
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-sm text-[#f5f5f7] outline-none focus:border-[#ff3b30]"
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
                  className="px-5 py-2 rounded-xl bg-[#ff3b30] hover:bg-[#e03126] text-white text-xs font-black cursor-pointer shadow-md"
                >
                  Save Target Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
