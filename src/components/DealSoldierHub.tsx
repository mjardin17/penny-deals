import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  ExternalLink,
  Calculator,
  ShoppingBag,
  Filter,
  Flame,
  ArrowRight,
  Boxes,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  RefreshCw,
  Plus,
  Trash2,
  DollarSign,
  Package,
  Layers,
  X,
  Check,
  Zap,
} from 'lucide-react';
import { DealSoldierItem, ClosetInventoryItem, StoreLocationInventory } from '../types';
import {
  DEFAULT_DEALSOLDIER_DEALS,
  DEFAULT_CLOSET_INVENTORY,
  HD_CLEARANCE_RULES,
} from '../data/defaultDealSoldierDeals';
import { PokemonTcgRadar } from './PokemonTcgRadar';

interface DealSoldierHubProps {
  zipCode: string;
  onLoadIntoCalculator: (item: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => void;
  onAddToCart?: (deal: DealSoldierItem) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const DealSoldierHub: React.FC<DealSoldierHubProps> = ({
  zipCode,
  onLoadIntoCalculator,
  onAddToCart,
  onNotify,
}) => {
  // Deals State
  const [deals, setDeals] = useState<DealSoldierItem[]>(() => {
    try {
      const saved = localStorage.getItem('dealSoldierDealsList');
      if (saved) {
        const parsed: DealSoldierItem[] = JSON.parse(saved);
        if (parsed.length >= DEFAULT_DEALSOLDIER_DEALS.length) {
          return parsed;
        }
        // Merge missing default deals so new Home Depot penny items are immediately visible
        const existingIds = new Set(parsed.map((d) => d.id));
        const missing = DEFAULT_DEALSOLDIER_DEALS.filter((d) => !existingIds.has(d.id));
        return [...parsed, ...missing];
      }
    } catch (e) {
      console.error('Failed to load dealSoldierDealsList', e);
    }
    return DEFAULT_DEALSOLDIER_DEALS;
  });

  // User's Inventory Closet State
  const [closetItems, setClosetItems] = useState<ClosetInventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('userClosetInventory');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load userClosetInventory', e);
    }
    return DEFAULT_CLOSET_INVENTORY;
  });

  // Active view sub-mode: 'live-deals', 'pokemon-radar', or 'my-closet'
  const [activeSubMode, setActiveSubMode] = useState<'live-deals' | 'pokemon-radar' | 'my-closet'>('live-deals');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterPennyOnly, setFilterPennyOnly] = useState(false);
  const [filterClosetOnly, setFilterClosetOnly] = useState(false);
  const [filterInStockClosest, setFilterInStockClosest] = useState(false);
  const [showHdRules, setShowHdRules] = useState(false);
  const [expandedStoreDealId, setExpandedStoreDealId] = useState<string | null>(null);

  // Correction Modal State
  const [correctingDeal, setCorrectingDeal] = useState<DealSoldierItem | null>(null);
  const [correctedCount, setCorrectedCount] = useState<number>(0);
  const [correctedStatus, setCorrectedStatus] = useState<
    'In Stock' | 'Limited Stock' | 'Out of Stock' | 'Phantom Stock'
  >('In Stock');
  const [correctedAisleBay, setCorrectedAisleBay] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');

  // Closet Item Modal State (Add/Edit)
  const [showClosetModal, setShowClosetModal] = useState(false);
  const [editingClosetItem, setEditingClosetItem] = useState<ClosetInventoryItem | null>(null);
  const [closetName, setClosetName] = useState('');
  const [closetSku, setClosetSku] = useState('');
  const [closetStore, setClosetStore] = useState('Home Depot');
  const [closetQty, setClosetQty] = useState(1);
  const [closetBuyPrice, setClosetBuyPrice] = useState('0.01');
  const [closetTargetPrice, setClosetTargetPrice] = useState('45.00');
  const [closetLocation, setClosetLocation] = useState('Top Closet Shelf Bin A');
  const [closetStatus, setClosetStatus] = useState<ClosetInventoryItem['status']>('In Closet');
  const [closetNotes, setClosetNotes] = useState('');

  // Save deals to localStorage
  const saveDeals = (updated: DealSoldierItem[]) => {
    setDeals(updated);
    try {
      localStorage.setItem('dealSoldierDealsList', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save dealSoldierDealsList', e);
    }
  };

  // Save closet items to localStorage
  const saveClosetItems = (updated: ClosetInventoryItem[]) => {
    setClosetItems(updated);
    try {
      localStorage.setItem('userClosetInventory', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save userClosetInventory', e);
    }
  };

  // Handle opening correction modal
  const handleOpenCorrection = (deal: DealSoldierItem) => {
    setCorrectingDeal(deal);
    setCorrectedCount(
      deal.userCorrection ? deal.userCorrection.realCount : deal.closestStore.stockQuantity
    );
    setCorrectedStatus(
      deal.userCorrection ? deal.userCorrection.stockStatus : deal.closestStore.stockStatus
    );
    setCorrectedAisleBay(
      deal.userCorrection
        ? deal.userCorrection.realAisleBay
        : deal.closestStore.aisleBay || deal.aisleBayHint
    );
    setCorrectionNote(deal.userCorrection ? deal.userCorrection.note : '');
  };

  // Submit Correction
  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingDeal) return;

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = deals.map((d) => {
      if (d.id !== correctingDeal.id) return d;
      return {
        ...d,
        userCorrection: {
          realCount: correctedCount,
          realAisleBay: correctedAisleBay.trim() || d.aisleBayHint,
          stockStatus: correctedStatus,
          note: correctionNote.trim(),
          correctedAt: `Corrected at ${nowStr} by You`,
        },
        closestStore: {
          ...d.closestStore,
          stockQuantity: correctedCount,
          stockStatus: correctedStatus,
          aisleBay: correctedAisleBay.trim() || d.closestStore.aisleBay,
          lastVerifiedByHunter: `Hunter report: ${correctedStatus} (${correctedCount} units) at ${nowStr}`,
        },
      };
    });

    saveDeals(updated);
    setCorrectingDeal(null);
    onNotify(
      `Corrected store stock for "${correctingDeal.title.substring(0, 24)}...": ${correctedStatus} (${correctedCount} units)`,
      'success'
    );
  };

  // Reset Correction back to default feed
  const handleResetCorrection = (dealId: string) => {
    const updated = deals.map((d) => {
      if (d.id !== dealId) return d;
      const { userCorrection, ...rest } = d;
      return {
        ...rest,
        closestStore: {
          ...rest.closestStore,
          stockStatus: 'In Stock',
          lastVerifiedByHunter: 'Reset to default feed',
        },
      };
    });
    saveDeals(updated);
    setCorrectingDeal(null);
    onNotify('Reset item to default Deal Soldier feed.', 'info');
  };

  // Add deal straight into My Closet
  const handleTransferToCloset = (deal: DealSoldierItem) => {
    const newItem: ClosetInventoryItem = {
      id: `closet-${Date.now()}`,
      name: deal.title,
      sku: deal.sku,
      store: deal.store,
      quantity: 1,
      purchasePrice: deal.price,
      targetListPrice: deal.estResellPrice,
      closetLocation: deal.isClosetItem ? 'Master Closet Top Shelf' : 'Inventory Storage Bin 1',
      status: 'In Closet',
      dateAdded: new Date().toISOString().split('T')[0],
      notes: `Sourced from ${deal.store} closest store. ${deal.markdownCode}.`,
    };
    const updated = [newItem, ...closetItems];
    saveClosetItems(updated);
    onNotify(`Saved "${deal.title.substring(0, 30)}..." directly to My Sourcing Closet!`, 'success');
  };

  // Save / Update Closet Item
  const handleSaveClosetItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closetName.trim()) return;

    if (editingClosetItem) {
      // Edit existing
      const updated = closetItems.map((item) => {
        if (item.id !== editingClosetItem.id) return item;
        return {
          ...item,
          name: closetName.trim(),
          sku: closetSku.trim() || undefined,
          store: closetStore,
          quantity: Math.max(1, closetQty),
          purchasePrice: parseFloat(closetBuyPrice) || 0,
          targetListPrice: parseFloat(closetTargetPrice) || 0,
          closetLocation: closetLocation.trim() || 'Closet Shelf',
          status: closetStatus,
          notes: closetNotes.trim() || undefined,
        };
      });
      saveClosetItems(updated);
      onNotify(`Updated closet record: "${closetName}"`, 'success');
    } else {
      // Create new
      const newItem: ClosetInventoryItem = {
        id: `closet-${Date.now()}`,
        name: closetName.trim(),
        sku: closetSku.trim() || undefined,
        store: closetStore,
        quantity: Math.max(1, closetQty),
        purchasePrice: parseFloat(closetBuyPrice) || 0,
        targetListPrice: parseFloat(closetTargetPrice) || 0,
        closetLocation: closetLocation.trim() || 'Closet Shelf',
        status: closetStatus,
        dateAdded: new Date().toISOString().split('T')[0],
        notes: closetNotes.trim() || undefined,
      };
      saveClosetItems([newItem, ...closetItems]);
      onNotify(`Added "${closetName}" to your Sourcing Closet!`, 'success');
    }

    setShowClosetModal(false);
    setEditingClosetItem(null);
  };

  // Delete Closet Item
  const handleDeleteClosetItem = (id: string, name: string) => {
    const updated = closetItems.filter((item) => item.id !== id);
    saveClosetItems(updated);
    onNotify(`Removed "${name}" from closet.`, 'info');
  };

  // Open Edit Closet Item
  const handleEditClosetItem = (item: ClosetInventoryItem) => {
    setEditingClosetItem(item);
    setClosetName(item.name);
    setClosetSku(item.sku || '');
    setClosetStore(item.store);
    setClosetQty(item.quantity);
    setClosetBuyPrice(item.purchasePrice.toString());
    setClosetTargetPrice(item.targetListPrice.toString());
    setClosetLocation(item.closetLocation);
    setClosetStatus(item.status);
    setClosetNotes(item.notes || '');
    setShowClosetModal(true);
  };

  // Filtered Deals
  const filteredDeals = deals.filter((deal) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      deal.title.toLowerCase().includes(q) ||
      deal.sku.includes(q) ||
      (deal.upc && deal.upc.includes(q)) ||
      (deal.internetNumber && deal.internetNumber.includes(q)) ||
      deal.category.toLowerCase().includes(q) ||
      deal.closestStore.storeName.toLowerCase().includes(q) ||
      deal.aisleBayHint.toLowerCase().includes(q);

    const matchesStore = selectedStore === 'All' || deal.store === selectedStore;
    const matchesCategory = selectedCategory === 'All' || deal.category === selectedCategory;
    const matchesPenny = !filterPennyOnly || deal.isPenny;
    const matchesCloset = !filterClosetOnly || deal.isClosetItem;
    const matchesInStock =
      !filterInStockClosest ||
      deal.closestStore.stockStatus === 'In Stock' ||
      deal.closestStore.stockStatus === 'Limited Stock';

    return (
      matchesQuery && matchesStore && matchesCategory && matchesPenny && matchesCloset && matchesInStock
    );
  });

  // Calculate Closet Stats
  const totalClosetItems = closetItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalClosetCost = closetItems.reduce(
    (acc, item) => acc + item.purchasePrice * item.quantity,
    0
  );
  const totalClosetPotential = closetItems.reduce(
    (acc, item) => acc + item.targetListPrice * item.quantity,
    0
  );
  const totalClosetProjectedProfit = totalClosetPotential - totalClosetCost;

  return (
    <div id="dealSoldierHub" className="space-y-4 mb-6">
      {/* Top Banner & Mode Selector */}
      <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#ff9800]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-[#f96302]/20 text-[#f96302] text-[11px] font-extrabold tracking-wide uppercase border border-[#f96302]/40 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Home Depot 1¢ Penny Radar
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#34c759]/20 text-[#34c759] text-[11px] font-black tracking-wide uppercase border border-[#34c759]/40">
                1¢ Verified Drops
              </span>
              <span className="text-xs text-[#92929d] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#f96302]" /> Nearest Stores for ZIP{' '}
                <strong className="text-[#f5f5f7]">{zipCode}</strong>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#f5f5f7] tracking-tight">
              Home Depot Penny Deals & Live Store Inventory
            </h2>
            <p className="text-xs text-[#92929d] mt-1 max-w-xl leading-relaxed">
              Track 1¢ pennies, .03 final markdown clearance, yellow tags, and verify what the closest store has in stock. Scan at self-checkout to ring 1¢.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowHdRules(!showHdRules)}
              className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#ff9800]" />
              <span>.01 / .03 Rules</span>
              {showHdRules ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingClosetItem(null);
                setClosetName('');
                setClosetSku('');
                setClosetQty(1);
                setClosetBuyPrice('0.01');
                setClosetTargetPrice('35.00');
                setClosetLocation('Closet Top Shelf');
                setClosetStatus('In Closet');
                setClosetNotes('');
                setShowClosetModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#ff9800] hover:bg-[#e08600] text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add to Closet</span>
            </button>
          </div>
        </div>

        {/* Mode Switch Tabs: Live Clearance Feeds vs Pokemon Drops vs My Sourcing Closet */}
        <div className="mt-4 pt-3 border-t border-[#2c2c35]/60 flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            type="button"
            onClick={() => setActiveSubMode('live-deals')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubMode === 'live-deals'
                ? 'bg-[#ff9800] text-black shadow-xs font-extrabold'
                : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Penny Live & Closest Store Feed ({deals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubMode('pokemon-radar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubMode === 'pokemon-radar'
                ? 'bg-[#ffd60a] text-black shadow-xs font-black'
                : 'bg-[#222227] text-[#ffd60a] hover:bg-[#ffd60a]/10 border border-[#ffd60a]/30'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Pokémon & TCG Drop Radar (Live Drops)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubMode('my-closet')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubMode === 'my-closet'
                ? 'bg-[#ff9800] text-black shadow-xs font-extrabold'
                : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>My Sourcing Closet ({closetItems.length} items)</span>
          </button>
        </div>

        {/* Collapsible Home Depot Clearance Tag Guide */}
        {showHdRules && (
          <div className="mt-4 p-3.5 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs space-y-2.5">
            <h4 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#ff9800]" /> Home Depot Markdown Secret Decoder
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HD_CLEARANCE_RULES.map((rule) => (
                <div key={rule.code} className="bg-[#18181c] p-2.5 rounded-lg border border-[#2c2c35]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-extrabold text-xs" style={{ color: rule.color }}>
                      {rule.code}
                    </span>
                    <span className="text-[10px] text-[#92929d] font-semibold">{rule.meaning}</span>
                  </div>
                  <p className="text-[11px] text-[#92929d] leading-snug">{rule.timeline}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#92929d] italic pt-1 border-t border-[#2c2c35]/50">
              💡 <strong>Deal Soldier Pro Tip:</strong> Look at the top right corner of the yellow clearance tag for the date printed. If it ended in .03 and the date was over 3 weeks ago, the SKU has likely dropped to $0.01!
            </p>
          </div>
        )}
      </div>

      {/* SUB-VIEW 1: LIVE CLEARANCE & CLOSEST STORE FEED */}
      {activeSubMode === 'live-deals' && (
        <>
          {/* Search and Filters */}
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-3.5 sm:p-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#92929d]" />
              <input
                type="text"
                placeholder="Search by SKU, Internet #, title, aisle bay, or store..."
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

            {/* Store & Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              <span className="text-[#92929d] text-[11px] font-semibold uppercase shrink-0 mr-1">
                Store:
              </span>
              {['All', 'Home Depot', "Lowe's", 'Walmart', 'Target'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStore(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedStore === st
                      ? st === 'Home Depot'
                        ? 'bg-[#f96302] text-white font-black shadow-xs'
                        : 'bg-[#ff9800] text-black font-bold shadow-xs'
                      : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
                  }`}
                >
                  {st === 'Home Depot' ? '🟠 Home Depot' : st}
                </button>
              ))}
            </div>

            {/* Quick Toggle Buttons: Closest In Stock & The Closet Highlight */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#2c2c35]/50 text-xs">
              <button
                type="button"
                onClick={() => setFilterPennyOnly(!filterPennyOnly)}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  filterPennyOnly
                    ? 'bg-[#34c759] text-black'
                    : 'bg-[#222227] text-[#92929d] hover:text-white border border-[#2c2c35]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>1¢ Pennies Only</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterClosetOnly(!filterClosetOnly)}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  filterClosetOnly
                    ? 'bg-[#0a84ff] text-white'
                    : 'bg-[#222227] text-[#92929d] hover:text-white border border-[#2c2c35]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>The Closet & Storage Items</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterInStockClosest(!filterInStockClosest)}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  filterInStockClosest
                    ? 'bg-[#ff9800] text-black'
                    : 'bg-[#222227] text-[#92929d] hover:text-white border border-[#2c2c35]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>In Stock at Closest Store</span>
              </button>

              {(filterPennyOnly || filterClosetOnly || filterInStockClosest || selectedStore !== 'All' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterPennyOnly(false);
                    setFilterClosetOnly(false);
                    setFilterInStockClosest(false);
                    setSelectedStore('All');
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                  className="text-xs text-[#ff9800] hover:underline ml-auto font-semibold cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>

          {/* Deals Feed Count */}
          <div className="flex items-center justify-between text-xs px-1 text-[#92929d]">
            <span>
              Showing <strong className="text-[#f5f5f7]">{filteredDeals.length}</strong> items near{' '}
              <strong className="text-[#ff9800]">{zipCode}</strong>
            </span>
            <span className="text-[11px]">
              Tap <strong className="text-[#0a84ff]">"Correct Store Stock"</strong> to update shelf counts
            </span>
          </div>

          {/* Deals List */}
          <div className="space-y-3">
            {filteredDeals.length === 0 ? (
              <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-8 text-center">
                <Tag className="w-8 h-8 text-[#92929d] mx-auto mb-2 opacity-50" />
                <h3 className="text-sm font-bold text-[#f5f5f7] mb-1">No clearance items matched your filters</h3>
                <p className="text-xs text-[#92929d] max-w-sm mx-auto mb-3">
                  Try clearing the filters or check another zip code to see more Home Depot & retail clearance finds.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilterPennyOnly(false);
                    setFilterClosetOnly(false);
                    setFilterInStockClosest(false);
                    setSelectedStore('All');
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#222227] text-[#ff9800] border border-[#2c2c35] text-xs font-bold"
                >
                  View All Deals
                </button>
              </div>
            ) : (
              filteredDeals.map((deal) => {
                const isPenny = deal.price <= 0.01;
                const estFlip = deal.estResellPrice - deal.price - deal.estResellPrice * 0.15 - 4.5;
                const hasUserCorrection = !!deal.userCorrection;
                const closest = deal.closestStore;

                return (
                  <div
                    key={deal.id}
                    className="bg-[#18181c] border border-[#2c2c35] hover:border-[#ff9800]/50 rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all relative overflow-hidden group"
                  >
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-[#222227] text-[#f5f5f7] font-bold border border-[#2c2c35]">
                          {deal.store}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-extrabold ${
                            isPenny
                              ? 'bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/30'
                              : 'bg-[#ff9800]/20 text-[#ff9800] border border-[#ff9800]/30'
                          }`}
                        >
                          {deal.markdownCode}
                        </span>
                        {deal.isClosetItem && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/30 font-bold flex items-center gap-1">
                            <Package className="w-2.5 h-2.5" /> The Closet Deal
                          </span>
                        )}
                        {hasUserCorrection && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#34c759]/20 text-[#34c759] font-bold border border-[#34c759]/30 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Corrected by Hunter
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-[#92929d] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{deal.verifiedDate}</span>
                      </div>
                    </div>

                    {/* Title and SKU */}
                    <h3 className="text-sm sm:text-base font-bold text-[#f5f5f7] group-hover:text-[#ff9800] transition-colors leading-snug">
                      {deal.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-[#92929d] mt-1 font-mono flex-wrap">
                      <span>SKU: <strong className="text-[#f5f5f7]">{deal.sku}</strong></span>
                      {deal.internetNumber && (
                        <span>• Internet #: <strong className="text-[#f5f5f7]">{deal.internetNumber}</strong></span>
                      )}
                      {deal.yellowTagDate && (
                        <span>• Tag Date: <strong className="text-[#ff9800]">{deal.yellowTagDate}</strong></span>
                      )}
                    </div>

                    {/* Price & Flip Math Row */}
                    <div className="flex items-baseline gap-2.5 mt-2 flex-wrap">
                      <span
                        className={`text-xl sm:text-2xl font-black font-mono ${
                          isPenny ? 'text-[#34c759]' : 'text-[#ff9800]'
                        }`}
                      >
                        ${deal.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-[#92929d] line-through font-mono">
                        ${deal.origPrice.toFixed(2)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#ff3b30]/20 text-[#ff453a] font-extrabold text-xs border border-[#ff3b30]/30">
                        {deal.discountPct}% OFF
                      </span>
                      <span className="text-xs text-[#34c759] font-bold">
                        Flip: ~${estFlip > 0 ? estFlip.toFixed(2) : '0.00'} profit (Est Resell: ${deal.estResellPrice.toFixed(2)})
                      </span>
                    </div>

                    {/* CLOSEST STORE INVENTORY PANEL (The Closet / Closest Store Feature) */}
                    <div className="mt-3 p-3 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-[#92929d]">Available At:</span>
                          <span className="text-xs font-black text-[#f5f5f7] inline-flex items-center gap-1 bg-[#18181c] px-2 py-0.5 rounded-md border border-[#2c2c35]">
                            <MapPin className="w-3 h-3 text-[#f96302]" />
                            {closest.storeName} ({closest.address})
                          </span>
                          <span className="text-xs font-black text-[#ffd60a] bg-[#ffd60a]/10 px-2 py-0.5 rounded-md border border-[#ffd60a]/30">
                            {closest.distanceMiles} mi away {closest.driveTimeMinutes ? `(${closest.driveTimeMinutes} min drive)` : ''}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            closest.stockStatus === 'In Stock'
                              ? 'bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/30'
                              : closest.stockStatus === 'Limited Stock'
                              ? 'bg-[#ff9800]/20 text-[#ff9800] border border-[#ff9800]/30'
                              : closest.stockStatus === 'Phantom Stock'
                              ? 'bg-[#ff3b30]/20 text-[#ff3b30] border border-[#ff3b30]/30'
                              : 'bg-[#92929d]/20 text-[#92929d]'
                          }`}
                        >
                          {closest.stockStatus} ({closest.stockQuantity} on shelf)
                        </span>
                      </div>

                      <div className="text-[11px] text-[#92929d]">
                        🔍 Shelf / Bay: <span className="text-[#ff9800] font-medium">{closest.aisleBay || deal.aisleBayHint}</span>
                      </div>

                      {/* Hunter Notes */}
                      <p className="text-[11px] text-[#92929d] italic pt-1 border-t border-[#2c2c35]/50">
                        💬 <strong>Deal Soldier Hunter Note:</strong> {deal.hunterNotes}
                      </p>

                      {/* User Correction Notice */}
                      {deal.userCorrection && (
                        <div className="bg-[#18181c] p-2 rounded-lg border border-[#34c759]/40 mt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#34c759] font-bold">
                              ✓ Your Shelf Correction: {deal.userCorrection.stockStatus} ({deal.userCorrection.realCount} units)
                            </span>
                            <span className="text-[10px] text-[#92929d]">{deal.userCorrection.correctedAt}</span>
                          </div>
                          {deal.userCorrection.note && (
                            <p className="text-[10px] text-[#92929d] mt-0.5">"{deal.userCorrection.note}"</p>
                          )}
                        </div>
                      )}

                      {/* Other Nearby Stores Toggle */}
                      {deal.otherNearbyStores && deal.otherNearbyStores.length > 0 && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedStoreDealId(
                                expandedStoreDealId === deal.id ? null : deal.id
                              )
                            }
                            className="text-[11px] text-[#0a84ff] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <span>
                              {expandedStoreDealId === deal.id ? 'Hide' : 'Check'} {deal.otherNearbyStores.length} other nearby store{deal.otherNearbyStores.length > 1 ? 's' : ''}
                            </span>
                            {expandedStoreDealId === deal.id ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>

                          {expandedStoreDealId === deal.id && (
                            <div className="mt-2 space-y-1.5 pt-1.5 border-t border-[#2c2c35]/50">
                              {deal.otherNearbyStores.map((st, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-[11px] bg-[#18181c] p-1.5 rounded-lg border border-[#2c2c35]"
                                >
                                  <div>
                                    <span className="text-[#f5f5f7] font-medium">{st.storeName}</span>{' '}
                                    <span className="text-[#92929d]">({st.distanceMiles} mi)</span>
                                  </div>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      st.stockStatus === 'In Stock'
                                        ? 'text-[#34c759]'
                                        : st.stockStatus === 'Limited Stock'
                                        ? 'text-[#ff9800]'
                                        : 'text-[#ff3b30]'
                                    }`}
                                  >
                                    {st.stockStatus} ({st.stockQuantity})
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Row */}
                    <div className="mt-3 pt-2.5 border-t border-[#2c2c35] flex items-center justify-between gap-2 flex-wrap">
                      {/* Left: Correct Inventory Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenCorrection(deal)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#0a84ff] hover:text-white border border-[#0a84ff]/30 hover:border-[#0a84ff] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Correct stock count, phantom inventory, or aisle location"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Correct Store Stock</span>
                      </button>

                      {/* Right: Transfer to Closet / Calc / Cart */}
                      <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                        <button
                          type="button"
                          onClick={() => handleTransferToCloset(deal)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#f5f5f7] border border-[#2c2c35] hover:border-[#ff9800] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Save to My Sourcing Closet inventory"
                        >
                          <Boxes className="w-3.5 h-3.5 text-[#ff9800]" />
                          <span>Save to Closet</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const storeDescription = closest
                              ? `${closest.storeName} (${closest.address || 'Dartmouth'}) • ${closest.distanceMiles} mi away`
                              : deal.store;
                            onLoadIntoCalculator({
                              name: `${deal.store}: ${deal.title}`,
                              buy: deal.price.toFixed(2),
                              sell: deal.estResellPrice.toFixed(2),
                              store: storeDescription,
                            });
                            onNotify(`Loaded "${deal.title}" into Arbitrage Calculator`, 'info');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#f5f5f7] border border-[#2c2c35] hover:border-[#ff9800] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Load into 1¢ & Arbitrage Calculator"
                        >
                          <Calculator className="w-3.5 h-3.5 text-[#ff9800]" />
                          <span>Flip Calc</span>
                        </button>

                        {onAddToCart && (
                          <button
                            type="button"
                            onClick={() => onAddToCart(deal)}
                            className="px-3 py-1.5 rounded-xl bg-[#ff9800] hover:bg-[#e08600] text-black text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
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
        </>
      )}

      {/* SUB-VIEW 2: MY SOURCING CLOSET (TRACK INVENTORY STASH & FLIPS) */}
      {activeSubMode === 'my-closet' && (
        <div className="space-y-4">
          {/* Closet Stats Metric Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#18181c] border border-[#2c2c35] rounded-xl p-3 text-center">
              <span className="text-[10px] text-[#92929d] uppercase font-bold block">Total In Closet</span>
              <span className="text-xl font-black text-[#f5f5f7] font-mono">{totalClosetItems} units</span>
            </div>
            <div className="bg-[#18181c] border border-[#2c2c35] rounded-xl p-3 text-center">
              <span className="text-[10px] text-[#92929d] uppercase font-bold block">Total Cost Basis</span>
              <span className="text-xl font-black text-[#34c759] font-mono">${totalClosetCost.toFixed(2)}</span>
            </div>
            <div className="bg-[#18181c] border border-[#2c2c35] rounded-xl p-3 text-center">
              <span className="text-[10px] text-[#92929d] uppercase font-bold block">Target Resale Value</span>
              <span className="text-xl font-black text-[#0a84ff] font-mono">${totalClosetPotential.toFixed(2)}</span>
            </div>
            <div className="bg-[#18181c] border border-[#2c2c35] rounded-xl p-3 text-center">
              <span className="text-[10px] text-[#92929d] uppercase font-bold block">Projected Profit</span>
              <span className="text-xl font-black text-[#ff9800] font-mono">${totalClosetProjectedProfit.toFixed(2)}</span>
            </div>
          </div>

          {/* Closet Table / List */}
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-[#ff9800]" />
                <h3 className="text-base font-bold text-[#f5f5f7]">My Reseller Closet & Stash Manager</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingClosetItem(null);
                  setClosetName('');
                  setClosetSku('');
                  setClosetQty(1);
                  setClosetBuyPrice('0.01');
                  setClosetTargetPrice('35.00');
                  setClosetLocation('Closet Shelf A');
                  setClosetStatus('In Closet');
                  setClosetNotes('');
                  setShowClosetModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#ff9800] hover:bg-[#e08600] text-black font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item to Closet</span>
              </button>
            </div>
            <p className="text-xs text-[#92929d] mb-4">
              Keep track of penny items, clearance organizers, and tools stored in your home closet, bins, or garage shelves before listing them on eBay or Facebook Marketplace.
            </p>

            {closetItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#92929d] border border-dashed border-[#2c2c35] rounded-xl">
                Your inventory closet is currently empty. Tap "Save to Closet" on any penny deal or tap "Add Item to Closet" above to record what you have in storage.
              </div>
            ) : (
              <div className="space-y-2.5">
                {closetItems.map((item) => {
                  const estProfit = (item.targetListPrice - item.purchasePrice) * item.quantity;

                  return (
                    <div
                      key={item.id}
                      className="bg-[#222227] border border-[#2c2c35] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18181c] text-[#f5f5f7] font-bold border border-[#2c2c35]">
                            {item.store}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff9800]/20 text-[#ff9800] font-semibold">
                            📍 {item.closetLocation}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              item.status === 'Sold'
                                ? 'bg-[#34c759]/20 text-[#34c759]'
                                : item.status === 'In Closet'
                                ? 'bg-[#92929d]/20 text-[#92929d]'
                                : 'bg-[#0a84ff]/20 text-[#0a84ff]'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-[#f5f5f7] truncate">{item.name}</h4>

                        <div className="flex items-center gap-3 text-xs mt-1 text-[#92929d] font-mono flex-wrap">
                          <span>Qty: <strong className="text-[#f5f5f7]">{item.quantity}</strong></span>
                          <span>Cost: <strong className="text-[#34c759]">${item.purchasePrice.toFixed(2)}</strong></span>
                          <span>Target: <strong className="text-[#0a84ff]">${item.targetListPrice.toFixed(2)}</strong></span>
                          <span>Profit: <strong className="text-[#ff9800]">+${estProfit.toFixed(2)}</strong></span>
                        </div>

                        {item.notes && (
                          <p className="text-[11px] text-[#92929d] mt-1 italic">"{item.notes}"</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() =>
                            onLoadIntoCalculator({
                              name: `${item.store}: ${item.name}`,
                              buy: item.purchasePrice.toFixed(2),
                              sell: item.targetListPrice.toFixed(2),
                              store: item.store,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#2c2c35] text-[#f5f5f7] border border-[#2c2c35] text-xs font-semibold flex items-center gap-1"
                          title="Recalculate margin"
                        >
                          <Calculator className="w-3.5 h-3.5 text-[#ff9800]" />
                          <span>Calc</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditClosetItem(item)}
                          className="p-1.5 rounded-lg bg-[#18181c] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]"
                          title="Edit closet item"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteClosetItem(item.id, item.name)}
                          className="p-1.5 rounded-lg bg-[#18181c] hover:bg-[#ff3b30]/20 text-[#92929d] hover:text-[#ff3b30] border border-[#2c2c35]"
                          title="Delete from closet"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: POKÉMON & TCG DROP RADAR */}
      {activeSubMode === 'pokemon-radar' && (
        <PokemonTcgRadar
          zipCode={zipCode}
          onLoadIntoCalculator={onLoadIntoCalculator}
          onAddToCart={
            onAddToCart
              ? (deal) => {
                  onAddToCart({
                    id: `tcg-${Date.now()}`,
                    title: deal.title,
                    sku: 'TCG-' + Date.now().toString().slice(-6),
                    store: (deal.store as any) || 'Walmart',
                    category: 'Trading Cards',
                    price: deal.buyPrice,
                    origPrice: deal.sellPrice,
                    discountPct: Math.round(((deal.sellPrice - deal.buyPrice) / deal.sellPrice) * 100),
                    markdownCode: 'Yellow Tag Clearance',
                    estResellPrice: deal.sellPrice,
                    closestStore: {
                      storeName: `${deal.store} Store`,
                      storeNumber: 'Local',
                      address: `Near ZIP ${zipCode}`,
                      distanceMiles: 2.1,
                      stockQuantity: 2,
                      stockStatus: 'In Stock',
                      aisleBay: 'Front Register TCG Wall',
                      lastVerifiedByHunter: 'Radar Scout',
                    },
                    otherNearbyStores: [],
                    aisleBayHint: 'Front Register Card Wall / Customer Service',
                    verifiedDate: 'Verified today',
                    isPenny: false,
                    hunterNotes: deal.notes || 'Pokémon / TCG Drop Radar deal.',
                  });
                }
              : undefined
          }
          onNotify={onNotify}
        />
      )}

      {/* MODAL 1: STORE INVENTORY CORRECTION ("Make sure I correct them") */}
      {correctingDeal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#0a84ff]" />
                <h3 className="text-base font-bold text-[#f5f5f7]">Correct Store Stock & Shelf Info</h3>
              </div>
              <button
                type="button"
                onClick={() => setCorrectingDeal(null)}
                className="text-[#92929d] hover:text-[#f5f5f7] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2.5 bg-[#222227] rounded-xl border border-[#2c2c35] text-xs">
              <span className="text-[#92929d] block text-[10px] uppercase font-bold">Item Being Corrected:</span>
              <strong className="text-[#f5f5f7] line-clamp-1">{correctingDeal.title}</strong>
              <div className="text-[#92929d] mt-1 font-mono text-[11px]">
                {correctingDeal.closestStore.storeName} ({correctingDeal.closestStore.address})
              </div>
            </div>

            <form onSubmit={handleSaveCorrection} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Actual Shelf Status *
                </label>
                <select
                  value={correctedStatus}
                  onChange={(e) => setCorrectedStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                >
                  <option value="In Stock">In Stock (Verified on Shelf)</option>
                  <option value="Limited Stock">Limited Stock (1 or 2 Left)</option>
                  <option value="Phantom Stock">Phantom Stock (System says in-stock, shelf is empty)</option>
                  <option value="Out of Stock">Out of Stock (Zero Units Left)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Real Quantity Found *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={correctedCount}
                    onChange={(e) => setCorrectedCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Aisle / Bay / Overhead
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Aisle 14 Bay 8"
                    value={correctedAisleBay}
                    onChange={(e) => setCorrectedAisleBay(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Hunter Notes / Location Tip
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Look behind the fixed shelving or ask associate to check the overhead pallet."
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#2c2c35]">
                {correctingDeal.userCorrection ? (
                  <button
                    type="button"
                    onClick={() => handleResetCorrection(correctingDeal.id)}
                    className="text-xs text-[#ff3b30] hover:underline"
                  >
                    Reset to Default
                  </button>
                ) : <span />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrectingDeal(null)}
                    className="px-3 py-1.5 rounded-xl bg-[#222227] text-[#92929d] hover:text-white font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-[#0a84ff] text-white font-bold hover:bg-[#0070e0] transition-colors cursor-pointer"
                  >
                    Save Correction
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT CLOSET INVENTORY ITEM */}
      {showClosetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-[#ff9800]" />
                <h3 className="text-base font-bold text-[#f5f5f7]">
                  {editingClosetItem ? 'Edit Closet Item' : 'Add Item to Inventory Closet'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClosetModal(false)}
                className="text-[#92929d] hover:text-[#f5f5f7] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClosetItem} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Item Title / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ClosetMaid 6ft Shelving Kit"
                  value={closetName}
                  onChange={(e) => setClosetName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Store Sourced
                  </label>
                  <select
                    value={closetStore}
                    onChange={(e) => setClosetStore(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                  >
                    <option value="Home Depot">Home Depot</option>
                    <option value="Lowe's">Lowe's</option>
                    <option value="Walmart">Walmart</option>
                    <option value="Target">Target</option>
                    <option value="Dollar General">Dollar General</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    SKU / UPC (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1004892134"
                    value={closetSku}
                    onChange={(e) => setClosetSku(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={closetQty}
                    onChange={(e) => setClosetQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Buy Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={closetBuyPrice}
                    onChange={(e) => setClosetBuyPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Target List ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={closetTargetPrice}
                    onChange={(e) => setClosetTargetPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Closet / Storage Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Master Closet Shelf 2"
                    value={closetLocation}
                    onChange={(e) => setClosetLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Flip Status
                  </label>
                  <select
                    value={closetStatus}
                    onChange={(e) => setClosetStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none"
                  >
                    <option value="In Closet">In Closet (Unlisted)</option>
                    <option value="Listed on eBay">Listed on eBay</option>
                    <option value="Listed on FB Marketplace">Listed on FB Marketplace</option>
                    <option value="Listed on Mercari">Listed on Mercari</option>
                    <option value="Sold">Sold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sourced at Home Depot. Cash only local pickup."
                  value={closetNotes}
                  onChange={(e) => setClosetNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2c2c35]">
                <button
                  type="button"
                  onClick={() => setShowClosetModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222227] text-[#92929d] hover:text-white font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#ff9800] text-black font-bold hover:bg-[#e08600] transition-colors cursor-pointer"
                >
                  {editingClosetItem ? 'Update Item' : 'Save to Closet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
