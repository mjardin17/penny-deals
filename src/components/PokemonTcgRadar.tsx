import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldAlert,
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
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { PokemonDropItem, PokemonDropStatus } from '../types';
import {
  DEFAULT_POKEMON_DROPS,
  VENDOR_RESTOCK_SCHEDULES,
} from '../data/defaultPokemonDrops';

interface PokemonTcgRadarProps {
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
}

export const PokemonTcgRadar: React.FC<PokemonTcgRadarProps> = ({
  zipCode,
  onLoadIntoCalculator,
  onAddToCart,
  onNotify,
}) => {
  const [drops, setDrops] = useState<PokemonDropItem[]>(() => {
    try {
      const saved = localStorage.getItem('dealSoldierPokemonDrops');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load dealSoldierPokemonDrops', e);
    }
    return DEFAULT_POKEMON_DROPS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [filterClearanceOnly, setFilterClearanceOnly] = useState(false);
  const [showVendorGuide, setShowVendorGuide] = useState(false);

  // Sighting / Restock Report Modal State
  const [reportingItem, setReportingItem] = useState<PokemonDropItem | null>(null);
  const [reportStoreName, setReportStoreName] = useState('');
  const [reportStatus, setReportStatus] = useState<'In Stock' | 'Limited Stock' | 'Out of Stock' | 'Restock Reported'>('Restock Reported');
  const [reportNote, setReportNote] = useState('');

  // Add Custom Drop Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSeries, setNewSeries] = useState('151 Special Set');
  const [newStore, setNewStore] = useState<'Walmart' | 'Target' | 'Costco' | 'Best Buy' | 'Dollar General'>('Walmart');
  const [newMsrp, setNewMsrp] = useState('');
  const [newActualPrice, setNewActualPrice] = useState('');
  const [newMarketPrice, setNewMarketPrice] = useState('');
  const [newStatus, setNewStatus] = useState<PokemonDropStatus>('VENDOR IN-STORE NOW');
  const [newLocation, setNewLocation] = useState('');
  const [newTips, setNewTips] = useState('');

  const saveDrops = (updated: PokemonDropItem[]) => {
    setDrops(updated);
    try {
      localStorage.setItem('dealSoldierPokemonDrops', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save dealSoldierPokemonDrops', e);
    }
  };

  const handleReportSighting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingItem) return;

    const updated = drops.map((d) => {
      if (d.id === reportingItem.id) {
        return {
          ...d,
          dropStatus: (reportStatus === 'Restock Reported' || reportStatus === 'In Stock'
            ? 'VENDOR IN-STORE NOW'
            : reportStatus === 'Out of Stock'
            ? 'STORE RESET WATCH'
            : d.dropStatus) as PokemonDropStatus,
          closestStoreStock: {
            storeName: reportStoreName.trim() || d.closestStoreStock.storeName,
            distanceMiles: d.closestStoreStock.distanceMiles,
            stockStatus: reportStatus,
            reportedAt: 'Just now by you',
            verifiedBy: 'Hunter Scout (You)',
          },
          hunterTips: reportNote.trim()
            ? `${d.hunterTips} [Update: ${reportNote.trim()}]`
            : d.hunterTips,
        };
      }
      return d;
    });

    saveDrops(updated);
    onNotify(`Reported stock status for "${reportingItem.name.substring(0, 24)}..."`, 'success');
    setReportingItem(null);
    setReportStoreName('');
    setReportNote('');
  };

  const handleAddCustomDrop = (e: React.FormEvent) => {
    e.preventDefault();
    const buyP = parseFloat(newActualPrice) || parseFloat(newMsrp) || 0;
    const sellP = parseFloat(newMarketPrice) || buyP * 1.8;

    if (!newTitle.trim() || buyP <= 0) {
      onNotify('Please enter a product title and valid price', 'error');
      return;
    }

    const newItem: PokemonDropItem = {
      id: `poke-${Date.now()}`,
      name: newTitle.trim(),
      series: newSeries,
      productType: 'Booster Bundle',
      store: newStore,
      vendorName: newStore === 'Walmart' ? 'MJ Holding' : newStore === 'Target' ? 'Excell Marketing' : 'Direct Distributor',
      sku: Math.floor(100000000 + Math.random() * 900000000).toString(),
      upc: '820650' + Math.floor(100000 + Math.random() * 900000).toString(),
      msrp: parseFloat(newMsrp) || buyP,
      actualPrice: buyP,
      marketPrice: sellP,
      dropStatus: newStatus,
      restockSchedule: 'Reported by local hunter radar',
      inStoreLocation: newLocation.trim() || 'Front register trading card wall or behind Customer Service',
      hunterTips: newTips.trim() || 'Scanned with in-store app.',
      purchaseLimit: 'Check local store limit',
      closestStoreStock: {
        storeName: `${newStore} near ${zipCode}`,
        distanceMiles: 2.5,
        stockStatus: 'In Stock',
        reportedAt: 'Just now',
        verifiedBy: 'You',
      },
      isHiddenClearance: buyP < (parseFloat(newMsrp) || buyP),
    };

    const updated = [newItem, ...drops];
    saveDrops(updated);
    setShowAddModal(false);
    onNotify(`Added TCG Drop: "${newTitle.substring(0, 24)}..."`, 'success');

    // Reset
    setNewTitle('');
    setNewMsrp('');
    setNewActualPrice('');
    setNewMarketPrice('');
    setNewLocation('');
    setNewTips('');
  };

  const filteredDrops = drops.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.series.toLowerCase().includes(q) ||
      d.store.toLowerCase().includes(q) ||
      d.hunterTips.toLowerCase().includes(q) ||
      d.inStoreLocation.toLowerCase().includes(q);

    const matchesStore = selectedStore === 'All' || d.store === selectedStore;
    const matchesStatus = selectedStatus === 'All' || d.dropStatus === selectedStatus;
    const matchesClearance = !filterClearanceOnly || d.isHiddenClearance || d.dropStatus === 'HIDDEN CLEARANCE';

    return matchesQuery && matchesStore && matchesStatus && matchesClearance;
  });

  return (
    <div className="space-y-4">
      {/* Top Banner & Vendor Intel Header */}
      <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#ffd60a]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-[#ffd60a]/20 text-[#ffd60a] text-[11px] font-black tracking-wide uppercase border border-[#ffd60a]/40 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-[#ffd60a]" /> Deal Soldier TCG Radar
              </span>
              <span className="text-xs text-[#92929d] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#ffd60a]" /> Scout ZIP{' '}
                <strong className="text-[#f5f5f7]">{zipCode}</strong>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#34c759]/20 text-[#34c759] font-extrabold border border-[#34c759]/30 flex items-center gap-1 animate-pulse">
                ● Live In-Store Drops & Restocks
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#f5f5f7] tracking-tight">
              Pokémon & TCG Card Drop Radar & Hidden Clearance
            </h2>
            <p className="text-xs text-[#92929d] mt-1 max-w-xl leading-relaxed">
              Track vendor deliveries (MJ Holding at Walmart & Excell at Target), hidden clearance markdowns on Pokémon sets (151, Prismatic Evolutions, Paldean Fates), and local store inventory.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowVendorGuide(!showVendorGuide)}
              className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#ffd60a]" />
              <span>Vendor Drop Times</span>
              {showVendorGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-xl bg-[#ffd60a] hover:bg-[#ffc107] text-black font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Report Card Drop</span>
            </button>
          </div>
        </div>

        {/* Collapsible Vendor Schedules & Hunting Secrets */}
        {showVendorGuide && (
          <div className="mt-4 p-3.5 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#ffd60a]" /> Retail TCG Vendor Delivery Windows & Hiding Spots
              </h4>
              <span className="text-[10px] text-[#92929d]">Deal Soldier Intel</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VENDOR_RESTOCK_SCHEDULES.map((sched) => (
                <div key={sched.retailer} className="bg-[#18181c] p-2.5 rounded-lg border border-[#2c2c35]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs" style={{ color: sched.color }}>
                      {sched.retailer} ({sched.vendor})
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222227] text-[#f5f5f7] font-semibold">
                      {sched.window}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#ffd60a] font-bold mb-1">
                    🔥 Hot Hits: {sched.hotProducts}
                  </div>
                  <p className="text-[11px] text-[#92929d] leading-snug">{sched.huntingStrategy}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#2c2c35]/50 text-[11px] text-[#92929d] flex items-center gap-2">
              <span>💡 <strong>Pro Tip:</strong> Many Walmarts and Targets now hold high-value Pokémon boxes behind the Customer Service desk or in locked electronics cases to prevent cart sweeps. Always ask!</span>
            </div>
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
            placeholder="Search set (151, Prismatic, Paldean, Crown Zenith), store, or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] text-xs placeholder-[#92929d]/60 focus:border-[#ffd60a] outline-none"
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

        {/* Store Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="text-[#92929d] text-[11px] font-semibold uppercase shrink-0 mr-1">
            Store:
          </span>
          {['All', 'Walmart', 'Target', 'Costco', 'Sam’s Club', 'Dollar General'].map((store) => (
            <button
              key={store}
              type="button"
              onClick={() => setSelectedStore(store)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedStore === store
                  ? 'bg-[#ffd60a] text-black font-black shadow-xs'
                  : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
              }`}
            >
              {store}
            </button>
          ))}
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#2c2c35]/50 text-xs">
          <button
            type="button"
            onClick={() => setFilterClearanceOnly(!filterClearanceOnly)}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              filterClearanceOnly
                ? 'bg-[#34c759] text-black font-extrabold'
                : 'bg-[#222227] text-[#92929d] hover:text-white border border-[#2c2c35]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Hidden Card Clearance / Glitches Only</span>
          </button>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-[#222227] border border-[#2c2c35] text-[#92929d] text-xs outline-none"
          >
            <option value="All">All Drop Statuses</option>
            <option value="VENDOR IN-STORE NOW">Vendor In-Store Now</option>
            <option value="RESTOCK DROP TODAY">Restock Drop Today</option>
            <option value="HIDDEN CLEARANCE">Hidden Clearance</option>
            <option value="STORE RESET WATCH">Store Reset Watch</option>
          </select>

          {(filterClearanceOnly || selectedStore !== 'All' || selectedStatus !== 'All' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setFilterClearanceOnly(false);
                setSelectedStore('All');
                setSelectedStatus('All');
                setSearchQuery('');
              }}
              className="text-xs text-[#ffd60a] hover:underline ml-auto font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Drops Count Header */}
      <div className="flex items-center justify-between text-xs px-1 text-[#92929d]">
        <span>
          Showing <strong className="text-[#f5f5f7]">{filteredDrops.length}</strong> active card drops & restocks near{' '}
          <strong className="text-[#ffd60a]">{zipCode}</strong>
        </span>
        <span className="text-[11px] text-[#34c759] font-medium">
          ⚡ TCGPlayer Market Comps Active
        </span>
      </div>

      {/* Drops List */}
      <div className="space-y-3">
        {filteredDrops.length === 0 ? (
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-[#92929d] mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-[#f5f5f7] mb-1">No card drops matching filter</h3>
            <p className="text-xs text-[#92929d] max-w-sm mx-auto mb-3">
              Reset filters to see all vendor drop schedules and verified hidden Pokémon clearances.
            </p>
          </div>
        ) : (
          filteredDrops.map((drop) => {
            const isClearance = drop.isHiddenClearance || drop.dropStatus === 'HIDDEN CLEARANCE';
            const isVendorLive = drop.dropStatus === 'VENDOR IN-STORE NOW';
            const profit = drop.marketPrice - drop.actualPrice - drop.marketPrice * 0.13 - 4.5;
            const roi = Math.round(((drop.marketPrice - drop.actualPrice) / drop.actualPrice) * 100);

            return (
              <div
                key={drop.id}
                className={`bg-[#18181c] border rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all relative overflow-hidden group ${
                  isVendorLive
                    ? 'border-[#ffd60a]/60 shadow-[#ffd60a]/5'
                    : isClearance
                    ? 'border-[#34c759]/60'
                    : 'border-[#2c2c35] hover:border-[#ffd60a]/40'
                }`}
              >
                {/* Status and Store Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-[#222227] text-[#f5f5f7] font-extrabold border border-[#2c2c35]">
                      {drop.store}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/40 font-bold">
                      {drop.series}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-black flex items-center gap-1 ${
                        isVendorLive
                          ? 'bg-[#ff3b30]/20 text-[#ff3b30] border border-[#ff3b30]/40 animate-pulse'
                          : isClearance
                          ? 'bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/40'
                          : 'bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/40'
                      }`}
                    >
                      {isVendorLive && <Flame className="w-3 h-3 fill-[#ff3b30]" />}
                      {drop.dropStatus}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#92929d] flex items-center gap-1 font-mono">
                    <span>Vendor: <strong className="text-[#f5f5f7]">{drop.vendorName}</strong></span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm sm:text-base font-bold text-[#f5f5f7] group-hover:text-[#ffd60a] transition-colors leading-snug">
                  {drop.name}
                </h3>

                <div className="flex items-center gap-2 text-xs text-[#92929d] mt-1 font-mono flex-wrap">
                  <span>SKU: <strong className="text-[#f5f5f7]">{drop.sku}</strong></span>
                  <span>• UPC: <strong className="text-[#f5f5f7]">{drop.upc}</strong></span>
                  <span>• Rule: <strong className="text-[#ff9800]">{drop.purchaseLimit}</strong></span>
                </div>

                {/* PRICING & MARKET VALUE COMPARISON BOX */}
                <div className="mt-3 p-3 bg-[#222227] border border-[#2c2c35] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-[#92929d] uppercase font-bold mb-0.5">
                      {isClearance ? 'Regular MSRP (Discontinued)' : 'Retail Buy Price (MSRP)'}:
                    </div>
                    <div className={`text-base font-bold font-mono ${isClearance ? 'line-through text-[#ff3b30]' : 'text-[#f5f5f7]'}`}>
                      ${drop.msrp.toFixed(2)}
                    </div>
                  </div>

                  {isClearance && (
                    <div>
                      <div className="text-[10px] text-[#34c759] uppercase font-bold mb-0.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Real In-Store Scan Price:
                      </div>
                      <div className="text-2xl font-black text-[#34c759] font-mono leading-none">
                        ${drop.actualPrice.toFixed(2)}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-[#ffd60a] hidden sm:block" />
                    <div>
                      <div className="text-[10px] text-[#ffd60a] uppercase font-bold mb-0.5 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> TCGPlayer / eBay Market Comps:
                      </div>
                      <div className="text-2xl font-black text-[#ffd60a] font-mono leading-none">
                        ${drop.marketPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right sm:border-l sm:border-[#2c2c35] sm:pl-3">
                    <span className="px-2 py-0.5 rounded-full bg-[#34c759]/20 text-[#34c759] font-black text-xs border border-[#34c759]/30 inline-block">
                      +{roi}% ROI
                    </span>
                    <div className="text-xs text-[#34c759] font-extrabold mt-1">
                      Est Flip: +${profit > 0 ? profit.toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>

                {/* In-Store Location, Restock Intel & Closest Store */}
                <div className="mt-2.5 p-2.5 bg-[#18181c] border border-[#2c2c35] rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#f5f5f7]">
                    <MapPin className="w-3.5 h-3.5 text-[#ffd60a] shrink-0" />
                    <span className="font-semibold">In-Store Hiding Spot:</span>{' '}
                    <span className="text-[#f5f5f7]">{drop.inStoreLocation}</span>
                  </div>

                  <p className="text-[11px] text-[#92929d] leading-snug">
                    💡 <strong>Hunter Intel:</strong> {drop.hunterTips}
                  </p>

                  {/* Closest store stock */}
                  <div className="pt-1.5 border-t border-[#2c2c35]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[#92929d]">Closest Store:</span>
                      <strong className="text-[#f5f5f7]">
                        {drop.closestStoreStock.storeName} ({drop.closestStoreStock.distanceMiles} mi)
                      </strong>
                      <span>—</span>
                      <span
                        className={`font-black px-1.5 py-0.2 rounded ${
                          drop.closestStoreStock.stockStatus === 'In Stock' || drop.closestStoreStock.stockStatus === 'Restock Reported'
                            ? 'bg-[#34c759]/20 text-[#34c759]'
                            : drop.closestStoreStock.stockStatus === 'Limited Stock'
                            ? 'bg-[#ff9800]/20 text-[#ff9800]'
                            : 'bg-[#ff3b30]/20 text-[#ff3b30]'
                        }`}
                      >
                        {drop.closestStoreStock.stockStatus}
                      </span>
                      <span className="text-[#92929d] font-mono">({drop.closestStoreStock.reportedAt})</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setReportingItem(drop);
                        setReportStoreName(drop.closestStoreStock.storeName);
                      }}
                      className="text-[#ffd60a] hover:underline font-bold text-left sm:text-right cursor-pointer"
                    >
                      Report In-Store Sighting / Stock Update →
                    </button>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-3 pt-2.5 border-t border-[#2c2c35] flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-[11px] text-[#92929d]">
                    Schedule: <strong className="text-[#f5f5f7]">{drop.restockSchedule}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onLoadIntoCalculator({
                          name: `${drop.store} TCG: ${drop.name}`,
                          buy: drop.actualPrice.toFixed(2),
                          sell: drop.marketPrice.toFixed(2),
                          store: drop.store,
                        });
                        onNotify(`Loaded "${drop.name}" into Arbitrage Calculator`, 'info');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#f5f5f7] border border-[#2c2c35] hover:border-[#ffd60a] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5 text-[#ffd60a]" />
                      <span>Flip Calc</span>
                    </button>

                    {onAddToCart && (
                      <button
                        type="button"
                        onClick={() => {
                          onAddToCart({
                            title: `TCG: ${drop.name}`,
                            buyPrice: drop.actualPrice,
                            sellPrice: drop.marketPrice,
                            store: drop.store,
                            category: 'Trading Cards',
                            notes: `Set: ${drop.series} • Status: ${drop.dropStatus} • Location: ${drop.inStoreLocation}`,
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#ffd60a] hover:bg-[#ffc107] text-black text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
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

      {/* MODAL: REPORT RESTOCK SIGHTING */}
      {reportingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#ffd60a]" />
                <h3 className="text-base font-bold text-[#f5f5f7]">Report In-Store Sighting</h3>
              </div>
              <button
                type="button"
                onClick={() => setReportingItem(null)}
                className="text-[#92929d] hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#92929d]">
              Update stock for <strong className="text-[#f5f5f7]">{reportingItem.name}</strong> at your local store.
            </p>

            <form onSubmit={handleReportSighting} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Store Location / Number
                </label>
                <input
                  type="text"
                  required
                  value={reportStoreName}
                  onChange={(e) => setReportStoreName(e.target.value)}
                  placeholder="e.g. Walmart Supercenter #1909 or Target Dartmouth"
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Current Stock Status *
                </label>
                <select
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-bold"
                >
                  <option value="Restock Reported">Restock Reported / Vendor In-Store Now</option>
                  <option value="In Stock">In Stock on Shelf</option>
                  <option value="Limited Stock">Limited Stock Remaining</option>
                  <option value="Out of Stock">Wiped Clean / Out of Stock</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Hunter Sighting Note
                </label>
                <textarea
                  rows={2}
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="e.g. Vendor rep just stocked 4 cases. Strict limit 2 at customer service."
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2c2c35]">
                <button
                  type="button"
                  onClick={() => setReportingItem(null)}
                  className="px-4 py-2 rounded-xl bg-[#222227] text-[#92929d] hover:text-white font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#ffd60a] text-black font-black hover:bg-[#ffc107] transition-colors cursor-pointer"
                >
                  Submit Sighting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOM DROP */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#ffd60a]" />
                <h3 className="text-base font-bold text-[#f5f5f7]">Report New Card Drop / Restock</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#92929d] hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomDrop} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Card Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pokémon 151 Ultra-Premium Collection"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Store
                  </label>
                  <select
                    value={newStore}
                    onChange={(e) => setNewStore(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                  >
                    <option value="Walmart">Walmart</option>
                    <option value="Target">Target</option>
                    <option value="Costco">Costco</option>
                    <option value="Best Buy">Best Buy</option>
                    <option value="Dollar General">Dollar General</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Series / Set
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 151 or Prismatic Evolutions"
                    value={newSeries}
                    onChange={(e) => setNewSeries(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    MSRP ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 49.99"
                    value={newMsrp}
                    onChange={(e) => setNewMsrp(e.target.value)}
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
                    placeholder="e.g. 15.00"
                    value={newActualPrice}
                    onChange={(e) => setNewActualPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono font-bold text-[#34c759]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Market Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 85.00"
                    value={newMarketPrice}
                    onChange={(e) => setNewMarketPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono text-[#ffd60a]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                >
                  <option value="VENDOR IN-STORE NOW">VENDOR IN-STORE NOW</option>
                  <option value="RESTOCK DROP TODAY">RESTOCK DROP TODAY</option>
                  <option value="HIDDEN CLEARANCE">HIDDEN CLEARANCE / MISPRICED</option>
                  <option value="STORE RESET WATCH">STORE RESET WATCH</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  In-Store Spot / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Front register card wall lane 4 or Customer service"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Hunter Notes & Limits
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Limit 2 per customer. Rep stocked 10 boxes."
                  value={newTips}
                  onChange={(e) => setNewTips(e.target.value)}
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
                  className="px-4 py-2 rounded-xl bg-[#ffd60a] text-black font-black hover:bg-[#ffc107] transition-colors cursor-pointer"
                >
                  Post Card Drop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
