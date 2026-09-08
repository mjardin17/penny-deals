import React, { useState, useMemo } from 'react';
import {
  StoreProfile,
  StoreChain,
  StoreDealItem,
} from '../types';
import {
  CHAIN_METADATA,
  DEFAULT_STORES_DIRECTORY,
  lookupOrGenerateStoreProfile,
} from '../data/storesDirectory';
import {
  Search,
  MapPin,
  Clock,
  Phone,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Tag,
  CheckCircle2,
  Navigation,
  Calculator,
  Plus,
  Filter,
  X,
  SlidersHorizontal,
  Compass,
  Store,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { soundFx } from '../utils/audioFeedback';

interface StoreLookupDirectoryProps {
  zipCode: string;
  activeStoreId?: string;
  onSetActiveStore: (store: StoreProfile) => void;
  onLoadIntoCalculator: (deal: {
    name: string;
    buy: string;
    sell: string;
    store: string;
    ship?: string;
  }) => void;
  onAddToCart: (deal: StoreDealItem, store: StoreProfile) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const StoreLookupDirectory: React.FC<StoreLookupDirectoryProps> = ({
  zipCode,
  activeStoreId,
  onSetActiveStore,
  onLoadIntoCalculator,
  onAddToCart,
  onNotify,
}) => {
  // State
  const [stores, setStores] = useState<StoreProfile[]>(() => {
    try {
      const saved = localStorage.getItem('storesDirectoryCustom');
      if (saved) {
        const parsed: StoreProfile[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((s) => s.id));
        const missing = DEFAULT_STORES_DIRECTORY.filter((s) => !existingIds.has(s.id));
        return [...parsed, ...missing];
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STORES_DIRECTORY;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [selectedRadius, setSelectedRadius] = useState<number>(25); // Miles: 5, 15, 25, 50, 100, 999
  const [filterPennyOnly, setFilterPennyOnly] = useState(false);
  const [filterSelfCheckoutOnly, setFilterSelfCheckoutOnly] = useState(false);

  // Selected store for Dossier Modal
  const [inspectedStore, setInspectedStore] = useState<StoreProfile | null>(null);

  // Custom Store Lookup Modal
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [lookupChain, setLookupChain] = useState<StoreChain>('Home Depot');
  const [lookupStoreNumber, setLookupStoreNumber] = useState('');

  // Item Search within inspected store
  const [storeInventorySearch, setStoreInventorySearch] = useState('');

  // Available chains list
  const chainsList = useMemo(() => {
    const chains: StoreChain[] = [
      'Home Depot',
      "Lowe's",
      'Walmart',
      'Target',
      'Dollar General',
      'Harbor Freight',
      'Tractor Supply',
      "Ollie's Bargain",
      'Best Buy',
      'Ace Hardware',
      'Costco',
      "Sam's Club",
      'TJ Maxx / Marshalls',
      'CVS / Walgreens',
    ];
    return chains;
  }, []);

  // Filtered stores
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      // Radius filter
      if (selectedRadius !== 999 && store.distanceMiles > selectedRadius) {
        return false;
      }

      // Chain filter
      if (selectedChain !== 'all' && store.chain !== selectedChain) {
        return false;
      }

      // Penny deals only filter
      if (filterPennyOnly && store.activePennyCount === 0) {
        return false;
      }

      // Self-checkout filter
      if (filterSelfCheckoutOnly && !store.selfCheckoutFriendly) {
        return false;
      }

      // Text search: matches store name, store #, city, address, zip, or chain
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = store.storeName.toLowerCase().includes(query);
        const matchesNum = store.storeNumber.toLowerCase().includes(query);
        const matchesCity = store.city.toLowerCase().includes(query);
        const matchesAddress = store.address.toLowerCase().includes(query);
        const matchesZip = store.zipCode.includes(query);
        const matchesChain = store.chain.toLowerCase().includes(query);
        const matchesInventory = store.inventory.some(
          (inv) =>
            inv.title.toLowerCase().includes(query) ||
            inv.sku.includes(query) ||
            inv.category.toLowerCase().includes(query)
        );

        if (
          !matchesName &&
          !matchesNum &&
          !matchesCity &&
          !matchesAddress &&
          !matchesZip &&
          !matchesChain &&
          !matchesInventory
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    stores,
    selectedRadius,
    selectedChain,
    filterPennyOnly,
    filterSelfCheckoutOnly,
    searchQuery,
  ]);

  // Handle Look up Custom Store #
  const handleLookupStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupStoreNumber.trim()) {
      onNotify('Please enter a store number (e.g. 2671)', 'error');
      return;
    }

    const profile = lookupOrGenerateStoreProfile(lookupChain, lookupStoreNumber, zipCode);

    setStores((prev) => {
      const exists = prev.some((s) => s.id === profile.id);
      if (exists) return prev;
      const updated = [profile, ...prev];
      try {
        localStorage.setItem('storesDirectoryCustom', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });

    setIsLookupModalOpen(false);
    setInspectedStore(profile);
    soundFx.playHighProfitChime();
    onNotify(`Located ${profile.storeName}! Ready to inspect clearance inventory.`, 'success');
  };

  // Quick select active store
  const handleSelectActiveStore = (store: StoreProfile) => {
    onSetActiveStore(store);
    soundFx.playStandardScan();
    onNotify(`Active Store set to: ${store.storeName} (${store.address})`, 'success');
  };

  return (
    <div className="space-y-5 mb-8">
      {/* Top Banner / Store Radar Header */}
      <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-md">
        <div className="absolute -right-8 -top-8 w-44 h-44 bg-[#f96302]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-32 -bottom-10 w-36 h-36 bg-[#0a84ff]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-[#ffd60a]/20 text-[#ffd60a] text-[11px] font-black tracking-wide uppercase border border-[#ffd60a]/40 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" /> Store Radar & Scope Directory
              </span>
              <span className="text-xs text-[#92929d] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#f96302]" /> Base Zip:{' '}
                <strong className="text-[#f5f5f7] font-mono">{zipCode}</strong>
              </span>
              <span className="text-xs text-[#34c759] font-semibold bg-[#34c759]/10 px-2 py-0.5 rounded border border-[#34c759]/20">
                {stores.length} Retail Locations Tracked
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#f5f5f7] flex items-center gap-2">
              Individual Store Lookup & Clearance Radar
            </h2>
            <p className="text-xs text-[#92929d] mt-1 max-w-2xl leading-relaxed">
              Look up specific stores by Store #, city, or chain. Widen your geographic search scope from 5 to 100+ miles across Home Depot, Lowe's, Walmart, Target, Dollar General, Harbor Freight, Tractor Supply, Best Buy, Ollie's, and more.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setIsLookupModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#ffd60a] hover:bg-[#ffc107] text-black font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Look Up Any Store #</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Radius Controls */}
        <div className="mt-4 pt-4 border-t border-[#2c2c35] grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Text Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-[#92929d] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Store # (e.g. 2671), City, Address, Chain, or SKU..."
              className="w-full bg-[#101014] border border-[#2c2c35] focus:border-[#ffd60a] rounded-xl pl-9 pr-8 py-2 text-xs text-[#f5f5f7] placeholder-[#92929d]/60 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#92929d] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Radius Selector */}
          <div className="md:col-span-3 flex items-center gap-1.5 bg-[#101014] border border-[#2c2c35] rounded-xl px-2.5 py-1 text-xs">
            <Compass className="w-3.5 h-3.5 text-[#ffd60a] shrink-0" />
            <span className="text-[#92929d] shrink-0 font-medium">Radius:</span>
            <select
              value={selectedRadius}
              onChange={(e) => setSelectedRadius(Number(e.target.value))}
              aria-label="Filter stores by radius in miles"
              className="bg-transparent text-[#f5f5f7] font-bold text-xs outline-none cursor-pointer w-full"
            >
              <option value={5} className="bg-[#18181c]">5 Miles (Local)</option>
              <option value={15} className="bg-[#18181c]">15 Miles (Area)</option>
              <option value={25} className="bg-[#18181c]">25 Miles (Metro)</option>
              <option value={50} className="bg-[#18181c]">50 Miles (Expanded)</option>
              <option value={100} className="bg-[#18181c]">100 Miles (Road Trip)</option>
              <option value={999} className="bg-[#18181c]">All / Nationwide</option>
            </select>
          </div>

          {/* Quick Filter Toggles */}
          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterPennyOnly(!filterPennyOnly)}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                filterPennyOnly
                  ? 'bg-[#ffd60a]/20 text-[#ffd60a] border-[#ffd60a]/50'
                  : 'bg-[#101014] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7]'
              }`}
            >
              <span className="font-mono text-[11px]">1¢</span>
              <span>Pennies Only</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterSelfCheckoutOnly(!filterSelfCheckoutOnly)}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                filterSelfCheckoutOnly
                  ? 'bg-[#34c759]/20 text-[#34c759] border-[#34c759]/50'
                  : 'bg-[#101014] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Self-Checkout</span>
            </button>
          </div>
        </div>

        {/* Chain Filter Badges (Horizontal scroll on mobile) */}
        <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
          <button
            type="button"
            onClick={() => setSelectedChain('all')}
            className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              selectedChain === 'all'
                ? 'bg-[#ffd60a] text-black shadow-xs'
                : 'bg-[#101014] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            All Chains ({stores.length})
          </button>
          {chainsList.map((ch) => {
            const count = stores.filter((s) => s.chain === ch).length;
            const meta = CHAIN_METADATA[ch];
            return (
              <button
                key={ch}
                type="button"
                onClick={() => setSelectedChain(ch)}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  selectedChain === ch
                    ? 'bg-[#f5f5f7] text-black shadow-xs'
                    : 'bg-[#101014] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: meta?.brandColor || '#92929d' }}
                />
                <span>{ch}</span>
                <span className="text-[10px] opacity-70 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Results Summary */}
      <div className="flex items-center justify-between px-1 text-xs text-[#92929d]">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-[#f5f5f7]">{filteredStores.length}</strong> stores
            {selectedRadius !== 999 && ` within ${selectedRadius} miles of ${zipCode}`}
          </span>
          {activeStoreId && (
            <span className="text-[11px] text-[#34c759] font-semibold bg-[#34c759]/10 px-2 py-0.5 rounded border border-[#34c759]/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Active Store Set
            </span>
          )}
        </div>
        <div className="text-[11px] hidden sm:block">
          Tap <strong>"Inspect Store"</strong> to view on-shelf clearance and 1¢ items
        </div>
      </div>

      {/* Stores Grid */}
      {filteredStores.length === 0 ? (
        <div className="p-8 text-center bg-[#18181c] border border-[#2c2c35] rounded-2xl space-y-3">
          <Store className="w-8 h-8 text-[#92929d] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-[#f5f5f7]">No stores found matching your filters</h3>
          <p className="text-xs text-[#92929d] max-w-md mx-auto">
            Try expanding your search radius (e.g. 50 or 100 miles) or use the "Look Up Any Store #" button to add any retail location across the country.
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedRadius(999);
                setSelectedChain('all');
                setSearchQuery('');
                setFilterPennyOnly(false);
                setFilterSelfCheckoutOnly(false);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#ffd60a] border border-[#ffd60a]/30 font-bold text-xs cursor-pointer"
            >
              Reset Filters to Nationwide
            </button>
            <button
              type="button"
              onClick={() => setIsLookupModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#ffd60a] text-black font-bold text-xs cursor-pointer"
            >
              Look Up Store #
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map((store) => {
            const meta = CHAIN_METADATA[store.chain];
            const isActive = activeStoreId === store.id;

            return (
              <div
                key={store.id}
                className={`bg-[#18181c] rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs hover:border-[#ffd60a]/40 ${
                  isActive
                    ? 'border-[#34c759] shadow-[0_0_15px_rgba(52,199,89,0.15)] ring-1 ring-[#34c759]/40'
                    : 'border-[#2c2c35]'
                }`}
              >
                {/* Store Header */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-black tracking-wide uppercase border"
                          style={{
                            color: meta?.brandColor || '#ffd60a',
                            borderColor: `${meta?.brandColor || '#ffd60a'}40`,
                            backgroundColor: `${meta?.brandColor || '#ffd60a'}15`,
                          }}
                        >
                          {store.chain}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#f5f5f7]">
                          #{store.storeNumber}
                        </span>
                        {isActive && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#34c759] text-black font-black uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-black text-[#f5f5f7] mt-1 leading-snug">
                        {store.storeName}
                      </h3>
                    </div>

                    {/* Distance Badge */}
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-lg bg-[#222227] border border-[#2c2c35] text-xs font-black text-[#ffd60a]">
                        {store.distanceMiles} mi
                      </span>
                      <div className="text-[10px] text-[#92929d] mt-0.5">
                        ~{store.driveTimeMinutes} min drive
                      </div>
                    </div>
                  </div>

                  {/* Physical Address */}
                  <div className="text-xs text-[#92929d] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#f96302] shrink-0" />
                    <span className="truncate">
                      {store.address}, {store.city}, {store.state} {store.zipCode}
                    </span>
                  </div>

                  {/* Key Stats Bar */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded-xl bg-[#101014] border border-[#2c2c35]">
                      <span className="text-[#92929d] block text-[10px] uppercase font-semibold">
                        Reset Schedule
                      </span>
                      <span className="text-[#f5f5f7] font-bold truncate block">
                        {store.primaryMarkdownDays.join(' & ')}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#101014] border border-[#2c2c35]">
                      <span className="text-[#92929d] block text-[10px] uppercase font-semibold">
                        Clearance & 1¢
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[#34c759] font-black">
                          {store.activeClearanceCount} deals
                        </span>
                        {store.activePennyCount > 0 && (
                          <span className="px-1.5 py-0.2 bg-[#ffd60a]/20 text-[#ffd60a] rounded text-[10px] font-mono font-bold">
                            {store.activePennyCount} 1¢
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hotspots Preview */}
                  {store.secretHotspots.length > 0 && (
                    <div className="text-[11px] text-[#92929d] bg-[#101014]/60 p-2 rounded-xl border border-[#2c2c35]/60">
                      <span className="text-[#ffd60a] font-bold block mb-0.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Secret Hotspot:
                      </span>
                      <span className="line-clamp-1 text-[#d5d5dc]">
                        {store.secretHotspots[0]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-[#131317] border-t border-[#2c2c35] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectedStore(store)}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#f5f5f7] border border-[#2c2c35] hover:border-[#ffd60a]/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Inspect Dossier</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#ffd60a]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectActiveStore(store)}
                    className={`py-1.5 px-3 rounded-xl font-black text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#34c759] text-black'
                        : 'bg-[#ffd60a]/15 text-[#ffd60a] hover:bg-[#ffd60a] hover:text-black border border-[#ffd60a]/30'
                    }`}
                    title={isActive ? 'Store is currently active' : 'Set as primary sourcing store'}
                  >
                    {isActive ? 'Active' : 'Set Active'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STORE DOSSIER & INVENTORY MODAL */}
      {inspectedStore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
          onClick={() => setInspectedStore(null)}
        >
          <div
            className="bg-[#18181c] border border-[#2c2c35] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#2c2c35] bg-[#121215] flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="px-2.5 py-0.5 rounded text-[11px] font-black tracking-wide uppercase border"
                    style={{
                      color: CHAIN_METADATA[inspectedStore.chain]?.brandColor || '#ffd60a',
                      borderColor: `${CHAIN_METADATA[inspectedStore.chain]?.brandColor || '#ffd60a'}40`,
                      backgroundColor: `${CHAIN_METADATA[inspectedStore.chain]?.brandColor || '#ffd60a'}15`,
                    }}
                  >
                    {inspectedStore.chain}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#f5f5f7]">
                    Store #{inspectedStore.storeNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#222227] text-xs font-bold text-[#ffd60a] border border-[#2c2c35]">
                    {inspectedStore.distanceMiles} mi away (~{inspectedStore.driveTimeMinutes} min)
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-[#f5f5f7] mt-1.5">
                  {inspectedStore.storeName}
                </h2>
                <div className="flex items-center gap-3 text-xs text-[#92929d] mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#f96302]" />
                    {inspectedStore.address}, {inspectedStore.city}, {inspectedStore.state}{' '}
                    {inspectedStore.zipCode}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#34c759]" /> {inspectedStore.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#0a84ff]" /> {inspectedStore.hours}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectActiveStore(inspectedStore)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    activeStoreId === inspectedStore.id
                      ? 'bg-[#34c759] text-black'
                      : 'bg-[#ffd60a] text-black hover:bg-[#ffc107]'
                  }`}
                >
                  {activeStoreId === inspectedStore.id ? 'Active Store' : 'Set as Active'}
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedStore(null)}
                  className="p-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
              {/* Insider Recon Intelligence Panel */}
              <div className="bg-[#121215] border border-[#2c2c35] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-[#ffd60a] tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Hunter Field Intelligence & Markdown Secrets
                  </h3>
                  <span className="text-[11px] text-[#92929d]">
                    Reset Schedule:{' '}
                    <strong className="text-[#f5f5f7]">
                      {inspectedStore.clearanceResetSchedule}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Hotspots */}
                  <div className="bg-[#18181c] p-3 rounded-xl border border-[#2c2c35] space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#92929d] block">
                      📍 Secret In-Store Stash Locations:
                    </span>
                    <ul className="space-y-1 text-[#f5f5f7]">
                      {inspectedStore.secretHotspots.map((hot, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-[#f96302] font-mono font-bold">•</span>
                          <span>{hot}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Policy & Rules */}
                  <div className="bg-[#18181c] p-3 rounded-xl border border-[#2c2c35] space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#92929d] block">
                      🛡️ Store Policy & Checkout Protocol:
                    </span>
                    <ul className="space-y-1 text-[#f5f5f7]">
                      {inspectedStore.clearancePolicyTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-[#34c759] font-mono font-bold">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* In-Store Live Clearance & Penny Inventory */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-black text-[#f5f5f7] flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#34c759]" />
                      Clearance & 1¢ Penny Items In Stock at This Store
                    </h3>
                    <p className="text-xs text-[#92929d]">
                      Specific items verified on shelf at #{inspectedStore.storeNumber} with exact aisle/bay coordinates
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-[#92929d] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={storeInventorySearch}
                      onChange={(e) => setStoreInventorySearch(e.target.value)}
                      placeholder="Filter items in this store..."
                      className="w-full bg-[#101014] border border-[#2c2c35] focus:border-[#ffd60a] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#f5f5f7] outline-none"
                    />
                  </div>
                </div>

                {inspectedStore.inventory.length === 0 ? (
                  <div className="p-6 text-center bg-[#121215] border border-[#2c2c35] rounded-2xl text-xs text-[#92929d] space-y-2">
                    <p>No verified penny items currently cached for this specific store number.</p>
                    <p className="text-[#f5f5f7]">
                      Use the In-Store Barcode Scanner when on site to scan barcodes and log new items to this store!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inspectedStore.inventory
                      .filter((inv) =>
                        storeInventorySearch.trim()
                          ? inv.title.toLowerCase().includes(storeInventorySearch.toLowerCase()) ||
                            inv.category.toLowerCase().includes(storeInventorySearch.toLowerCase()) ||
                            inv.sku.includes(storeInventorySearch)
                          : true
                      )
                      .map((item) => {
                        const estProfit = (
                          item.estResellPrice -
                          item.clearancePrice -
                          item.estResellPrice * 0.15 -
                          4.5
                        ).toFixed(2);
                        const roi = Math.round(
                          ((parseFloat(estProfit) || 0) / (item.clearancePrice || 0.01)) * 100
                        );

                        return (
                          <div
                            key={item.id}
                            className="bg-[#121215] border border-[#2c2c35] hover:border-[#ffd60a]/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.isPenny && (
                                  <span className="px-2 py-0.5 rounded bg-black text-[#ffd60a] font-mono font-black text-[11px] border border-[#ffd60a]/40">
                                    1¢ Penny Drop
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded bg-[#222227] text-[#92929d] text-[10px] font-bold">
                                  {item.category}
                                </span>
                                <span className="text-[11px] font-mono text-[#92929d]">
                                  SKU: {item.sku}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#34c759]/15 text-[#34c759] font-bold">
                                  {item.stockQty} on shelf ({item.stockStatus})
                                </span>
                              </div>

                              <h4 className="text-xs sm:text-sm font-bold text-[#f5f5f7]">
                                {item.title}
                              </h4>

                              <div className="text-xs text-[#92929d] flex items-center gap-2 flex-wrap">
                                <span>
                                  📍 Shelf/Bay:{' '}
                                  <strong className="text-[#ffd60a]">{item.aisleBay}</strong>
                                </span>
                                <span>•</span>
                                <span>{item.notes}</span>
                              </div>
                            </div>

                            {/* Price & Actions */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#2c2c35]">
                              <div className="text-left sm:text-right">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-sm sm:text-base font-mono font-black text-[#34c759]">
                                    ${item.clearancePrice.toFixed(2)}
                                  </span>
                                  <span className="text-xs line-through text-[#92929d]">
                                    ${item.origPrice.toFixed(2)}
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#ffd60a] font-bold">
                                  Est Flip: ${item.estResellPrice.toFixed(2)} (+${estProfit} profit)
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onLoadIntoCalculator({
                                      name: `${inspectedStore.chain}: ${item.title}`,
                                      buy: item.clearancePrice.toFixed(2),
                                      sell: item.estResellPrice.toFixed(2),
                                      store: `${inspectedStore.storeName} (${inspectedStore.address}) • ${inspectedStore.distanceMiles} mi away`,
                                    });
                                    soundFx.playStandardScan();
                                    onNotify(
                                      `Loaded "${item.title}" into Arbitrage Calculator`,
                                      'info'
                                    );
                                  }}
                                  className="p-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35] cursor-pointer"
                                  title="Send to Calculator"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onAddToCart(item, inspectedStore);
                                    soundFx.playCashRegister();
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#ffd60a] hover:bg-[#ffc107] text-black font-black text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add to Cart</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOOK UP ANY STORE NUMBER MODAL */}
      {isLookupModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setIsLookupModalOpen(false)}
        >
          <div
            className="bg-[#18181c] border border-[#2c2c35] rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#ffd60a]/10 border border-[#ffd60a]/30 text-[#ffd60a]">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#f5f5f7]">Look Up Individual Store</h3>
                  <p className="text-[11px] text-[#92929d]">
                    Pull up any store # across the United States
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLookupModalOpen(false)}
                className="p-1 rounded-lg text-[#92929d] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLookupStore} className="space-y-3.5">
              {/* Chain selector */}
              <div>
                <label className="text-[11px] uppercase font-bold text-[#92929d] block mb-1">
                  Retail Chain:
                </label>
                <select
                  value={lookupChain}
                  onChange={(e) => setLookupChain(e.target.value as StoreChain)}
                  className="w-full bg-[#101014] border border-[#2c2c35] focus:border-[#ffd60a] rounded-xl px-3 py-2 text-xs text-[#f5f5f7] outline-none"
                >
                  {chainsList.map((ch) => (
                    <option key={ch} value={ch} className="bg-[#18181c]">
                      {ch}
                    </option>
                  ))}
                </select>
              </div>

              {/* Store number input */}
              <div>
                <label className="text-[11px] uppercase font-bold text-[#92929d] block mb-1">
                  Store Number (#):
                </label>
                <input
                  type="text"
                  value={lookupStoreNumber}
                  onChange={(e) => setLookupStoreNumber(e.target.value)}
                  placeholder="e.g. 2671, 1842, 1459, 14892..."
                  autoFocus
                  className="w-full bg-[#101014] border border-[#2c2c35] focus:border-[#ffd60a] rounded-xl px-3 py-2 text-xs text-[#f5f5f7] font-mono outline-none"
                />
                <p className="text-[10px] text-[#92929d] mt-1">
                  Enter the numeric branch ID found on receipts, shelf tags, or store locator.
                </p>
              </div>

              {/* Submit */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLookupModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#ffd60a] hover:bg-[#ffc107] text-black text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Inspect Store Dossier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
