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
  Truck,
  ShieldCheck,
  Copy,
  Check,
  Navigation,
  Volume2,
  VolumeX,
  Calendar,
  Radio,
  Eye,
  MessageSquare,
  Compass,
} from 'lucide-react';
import { PokemonDropItem, PokemonDropStatus } from '../types';
import {
  DEFAULT_POKEMON_DROPS,
  VENDOR_RESTOCK_SCHEDULES,
  STORE_DELIVERY_PREDICTOR_MATRIX,
  StoreDeliveryPredictor,
} from '../data/defaultPokemonDrops';
import { soundFx } from '../utils/audioFeedback';

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

type RadarSubTab = 'delivery_forecast' | 'live_drops' | 'hidden_clearance' | 'community_dispatch';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const PokemonTcgRadar: React.FC<PokemonTcgRadarProps> = ({
  zipCode,
  onLoadIntoCalculator,
  onAddToCart,
  onNotify,
}) => {
  // Determine current day of week (Monday-Sunday)
  const currentDayName = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    return days[now.getDay()];
  }, []);

  const [activeSubTab, setActiveSubTab] = useState<RadarSubTab>('delivery_forecast');
  const [selectedDay, setSelectedDay] = useState<string>(currentDayName);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('All');
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

  // Local state for delivery predictors & user sightings
  const [deliveryPredictors, setDeliveryPredictors] = useState<StoreDeliveryPredictor[]>(() => {
    try {
      const saved = localStorage.getItem('dealSoldierDeliveryPredictors');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load dealSoldierDeliveryPredictors', e);
    }
    return STORE_DELIVERY_PREDICTOR_MATRIX;
  });

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
  const [showVendorIntelGuide, setShowVendorIntelGuide] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(soundFx.isAudioMuted());

  // Quick report sighting modal for delivery predictor
  const [sightingModalPredictor, setSightingModalPredictor] = useState<StoreDeliveryPredictor | null>(null);
  const [sightingStoreLocation, setSightingStoreLocation] = useState('');
  const [sightingStatus, setSightingStatus] = useState<'In-Store Now' | 'Fresh Stock on Shelf' | 'Staged in Back' | 'Cleared Out'>('In-Store Now');
  const [sightingActivityText, setSightingActivityText] = useState('');

  // Sighting / Restock Report Modal State for Drops
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

  const savePredictors = (updated: StoreDeliveryPredictor[]) => {
    setDeliveryPredictors(updated);
    try {
      localStorage.setItem('dealSoldierDeliveryPredictors', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save dealSoldierDeliveryPredictors', e);
    }
  };

  const handleToggleAudio = () => {
    const muted = soundFx.toggleMute();
    setIsAudioMuted(muted);
    onNotify(muted ? 'Delivery audio alerts muted' : 'Delivery audio alerts enabled', 'info');
  };

  const handleCopyScript = (predictorId: string, scriptText: string) => {
    navigator.clipboard.writeText(scriptText);
    setCopiedScriptId(predictorId);
    soundFx.playStandardScan();
    onNotify('Dialogue script copied to clipboard! Use when asking store associate.', 'success');
    setTimeout(() => {
      setCopiedScriptId(null);
    }, 2500);
  };

  const handleLogPredictorSighting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sightingModalPredictor) return;

    const storeName = sightingStoreLocation.trim() || `${sightingModalPredictor.retailer} near ${zipCode}`;
    const activity = sightingActivityText.trim() || `Reported ${sightingStatus} by local scout`;

    const updated = deliveryPredictors.map((pred) => {
      if (pred.id === sightingModalPredictor.id) {
        return {
          ...pred,
          recentSightings: [
            {
              storeName,
              distanceMiles: 1.8,
              timeAgo: 'Just now',
              status: sightingStatus,
              repActivity: activity,
              verified: true,
            },
            ...pred.recentSightings.slice(0, 4),
          ],
        };
      }
      return pred;
    });

    savePredictors(updated);
    soundFx.playPennyJackpot();
    onNotify(`Sighting logged for ${sightingModalPredictor.retailer}! Restock radar updated.`, 'success');
    setSightingModalPredictor(null);
    setSightingStoreLocation('');
    setSightingActivityText('');
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
    soundFx.playPennyJackpot();
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
    soundFx.playHighProfitChime();
    onNotify(`Added TCG Drop: "${newTitle.substring(0, 24)}..."`, 'success');

    // Reset
    setNewTitle('');
    setNewMsrp('');
    setNewActualPrice('');
    setNewMarketPrice('');
    setNewLocation('');
    setNewTips('');
  };

  // Filtered drops
  const filteredDrops = useMemo(() => {
    return drops.filter((d) => {
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
      const matchesClearance =
        activeSubTab === 'hidden_clearance'
          ? d.isHiddenClearance || d.dropStatus === 'HIDDEN CLEARANCE'
          : !filterClearanceOnly || d.isHiddenClearance || d.dropStatus === 'HIDDEN CLEARANCE';

      return matchesQuery && matchesStore && matchesStatus && matchesClearance;
    });
  }, [drops, searchQuery, selectedStore, selectedStatus, filterClearanceOnly, activeSubTab]);

  // Filtered delivery predictors
  const filteredPredictors = useMemo(() => {
    if (selectedStoreFilter === 'All') return deliveryPredictors;
    return deliveryPredictors.filter((p) => p.retailer.toLowerCase().includes(selectedStoreFilter.toLowerCase()));
  }, [deliveryPredictors, selectedStoreFilter]);

  // Aggregate today's peak delivery activity
  const todayActiveCount = useMemo(() => {
    return deliveryPredictors.filter((p) => {
      const prob = p.todayProbability[selectedDay];
      return prob && (prob.label === 'Very High' || prob.label === 'High');
    }).length;
  }, [deliveryPredictors, selectedDay]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Header */}
      <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#ffd60a]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-[#ffd60a]/20 text-[#ffd60a] text-[11px] font-black tracking-wide uppercase border border-[#ffd60a]/40 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#ffd60a]" /> Spot-On TCG Delivery Radar
              </span>
              <span className="text-xs text-[#92929d] flex items-center gap-1 font-mono">
                <MapPin className="w-3 h-3 text-[#ffd60a]" /> Scout ZIP{' '}
                <strong className="text-[#f5f5f7]">{zipCode}</strong>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#34c759]/20 text-[#34c759] font-extrabold border border-[#34c759]/30 flex items-center gap-1 animate-pulse">
                ● Live DSD Vendor Routes Active
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#f5f5f7] tracking-tight">
              Pokémon In-Store Delivery Predictor & Restock Radar
            </h2>
            <p className="text-xs text-[#92929d] mt-1 max-w-2xl leading-relaxed">
              Never miss a restock. Track exact 3rd-party vendor arrival hours (MJ Holding at Walmart, Excell at Target), dock-to-floor staging times, counter stash spots, and live hunter restock pings.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                isAudioMuted
                  ? 'bg-[#222227] text-[#92929d] border-[#2c2c35]'
                  : 'bg-[#ffd60a]/20 text-[#ffd60a] border-[#ffd60a]/40'
              }`}
              title={isAudioMuted ? 'Unmute delivery arrival chimes' : 'Mute delivery arrival chimes'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setShowVendorIntelGuide(!showVendorIntelGuide)}
              className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#ffd60a]" />
              <span>DSD Secrets</span>
              {showVendorIntelGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-xl bg-[#ffd60a] hover:bg-[#ffc107] text-black font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Report Drop</span>
            </button>
          </div>
        </div>

        {/* Primary Sub-Tab Mode Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-[#2c2c35]/80 text-xs scrollbar-none mt-3">
          <button
            type="button"
            onClick={() => setActiveSubTab('delivery_forecast')}
            className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'delivery_forecast'
                ? 'bg-[#ffd60a] text-black shadow-sm'
                : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>🎯 Spot-On Delivery Forecast ({deliveryPredictors.length} Stores)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('live_drops')}
            className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'live_drops'
                ? 'bg-[#0a84ff] text-white shadow-sm'
                : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>🔥 Live Drops & Sealed Sets ({drops.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('hidden_clearance')}
            className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'hidden_clearance'
                ? 'bg-[#34c759] text-black shadow-sm'
                : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>🚨 Hidden Card Clearance (70% Off / $1.25)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('community_dispatch')}
            className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'community_dispatch'
                ? 'bg-[#ff9800] text-black shadow-sm'
                : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>📡 Hunter Sighting Dispatch</span>
          </button>
        </div>

        {/* Collapsible Vendor Intel Guide */}
        {showVendorIntelGuide && (
          <div className="mt-4 p-3.5 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#ffd60a]" /> How DSD (Direct Store Delivery) Really Works
              </h4>
              <span className="text-[10px] text-[#ffd60a] font-mono font-bold">INSIDER BLUEPRINT</span>
            </div>

            <p className="text-[11px] text-[#92929d] leading-relaxed">
              Pokémon cards are <strong>NOT</strong> delivered on standard Walmart or Target grocery trucks. They are managed by 3rd-party distributors: <strong>MJ Holding</strong> (Walmart, Barnes & Noble, Dollar General) and <strong>Excell Marketing</strong> (Target, Best Buy). Representatives drive personal vehicles or local vans, scan in at the back receiving dock, roll cardboard cartons on carts to the front registers, and merchandise the pegs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {VENDOR_RESTOCK_SCHEDULES.slice(0, 4).map((sched) => (
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
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: SPOT-ON DELIVERY FORECAST & DSD ROUTES                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'delivery_forecast' && (
        <div className="space-y-4">
          {/* Day of Week Selector & Peak Probability Index Bar */}
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] text-[#92929d] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#ffd60a]" /> Select Delivery Day to Forecast:
                </div>
                <div className="text-sm font-black text-[#f5f5f7] mt-0.5 flex items-center gap-2">
                  <span>{selectedDay} Restock Schedule</span>
                  {selectedDay === currentDayName && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/40 font-black">
                      TODAY
                    </span>
                  )}
                </div>
              </div>

              {/* Day Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {DAYS_OF_WEEK.map((day) => {
                  const isToday = day === currentDayName;
                  const isSelected = day === selectedDay;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-[#ffd60a] text-black shadow-xs font-black'
                          : isToday
                          ? 'bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/40'
                          : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
                      }`}
                    >
                      {day.substring(0, 3)}
                      {isToday && ' •'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Delivery Status Ticker for Selected Day */}
            <div className="p-3 bg-[#222227] border border-[#2c2c35] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#34c759] animate-ping" />
                <span className="text-[#f5f5f7] font-bold">
                  {selectedDay === 'Thursday' || selectedDay === 'Friday'
                    ? `🔥 PEAK RESTOCK WAVE: ${todayActiveCount} major retail chains have scheduled DSD vendor routes on ${selectedDay}!`
                    : selectedDay === 'Tuesday'
                    ? `🟡 TUESDAY RESTOCK WAVE: Dollar General weekly Penny/TCG freight & Target Excell midday deliveries active!`
                    : selectedDay === 'Saturday'
                    ? `📦 WEEKEND PALLET WAVE: Costco & Sam’s Club morning pallet drops open at 9:30 AM!`
                    : `ℹ️ ${selectedDay} Status: Secondary freight and shelf restock maintenance across local stores.`}
                </span>
              </div>

              <div className="text-[11px] text-[#92929d] shrink-0 font-mono">
                Optimal Arrival: <strong className="text-[#ffd60a]">10:15 AM – 11:30 AM</strong>
              </div>
            </div>

            {/* Filter Retailer Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs scrollbar-none">
              <span className="text-[#92929d] text-[11px] font-semibold uppercase shrink-0 mr-1">
                Filter Chain:
              </span>
              {['All', 'Walmart', 'Target', 'Dollar General', 'Best Buy', 'Barnes & Noble', 'GameStop', 'Costco'].map((store) => (
                <button
                  key={store}
                  type="button"
                  onClick={() => setSelectedStoreFilter(store)}
                  className={`px-2.5 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedStoreFilter === store
                      ? 'bg-[#ffd60a] text-black font-black'
                      : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
                  }`}
                >
                  {store}
                </button>
              ))}
            </div>
          </div>

          {/* Store Delivery Cards Grid */}
          <div className="space-y-4">
            {filteredPredictors.map((pred) => {
              const prob = pred.todayProbability[selectedDay] || { score: 30, label: 'Moderate', note: 'Standard route check.' };
              const isVeryHigh = prob.label === 'Very High';
              const isHigh = prob.label === 'High';
              const latestSighting = pred.recentSightings[0];

              return (
                <div
                  key={pred.id}
                  className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 sm:p-5 shadow-sm hover:border-[#ffd60a]/40 transition-all space-y-4"
                >
                  {/* Top Store & Vendor Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#2c2c35]">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className="px-2.5 py-0.5 rounded-md font-black text-xs text-white uppercase tracking-wider"
                          style={{ backgroundColor: pred.color }}
                        >
                          {pred.retailer}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-[#222227] text-[#f5f5f7] font-mono border border-[#2c2c35] flex items-center gap-1">
                          <Truck className="w-3 h-3 text-[#ffd60a]" /> {pred.vendor}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#222227] text-[#92929d]">
                          {pred.vendorType}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-[#f5f5f7] mt-1">
                        Delivery Route: {pred.deliveryDays.join(', ')} • Window: {pred.exactWindow}
                      </h3>
                      <p className="text-xs text-[#92929d] mt-0.5">
                        Priority Heat: <strong className="text-[#ffd60a]">{pred.hotProducts}</strong>
                      </p>
                    </div>

                    {/* Today's Probability Score Gauge */}
                    <div className="flex items-center gap-3 bg-[#222227] border border-[#2c2c35] p-2.5 rounded-xl shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] text-[#92929d] uppercase font-bold">
                          {selectedDay} Restock Odds:
                        </div>
                        <div
                          className={`text-base font-black uppercase ${
                            isVeryHigh
                              ? 'text-[#34c759]'
                              : isHigh
                              ? 'text-[#ffd60a]'
                              : prob.label === 'Moderate'
                              ? 'text-[#0a84ff]'
                              : 'text-[#92929d]'
                          }`}
                        >
                          {prob.score}% {prob.label}
                        </div>
                      </div>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-black text-xs text-black shadow-md ${
                          isVeryHigh
                            ? 'bg-[#34c759]'
                            : isHigh
                            ? 'bg-[#ffd60a]'
                            : prob.label === 'Moderate'
                            ? 'bg-[#0a84ff] text-white'
                            : 'bg-[#92929d]'
                        }`}
                      >
                        {prob.score}%
                      </div>
                    </div>
                  </div>

                  {/* Operational Timeline Breakdown: Dock -> Floor -> Counter */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-3 bg-[#222227] border border-[#2c2c35] rounded-xl">
                      <div className="text-[10px] text-[#92929d] uppercase font-bold flex items-center gap-1 mb-1">
                        <Truck className="w-3 h-3 text-[#0a84ff]" /> 1. Dock Receiving Scan
                      </div>
                      <div className="font-bold text-[#f5f5f7] font-mono">{pred.dockCheckInTime}</div>
                      <p className="text-[11px] text-[#92929d] mt-1 leading-snug">
                        Vendor scans credentials at security or receiving roll-up door.
                      </p>
                    </div>

                    <div className="p-3 bg-[#222227] border border-[#2c2c35] rounded-xl">
                      <div className="text-[10px] text-[#ffd60a] uppercase font-bold flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3 text-[#ffd60a]" /> 2. Floor Cart Arrival
                      </div>
                      <div className="font-bold text-[#ffd60a] font-mono">{pred.floorStagingTime}</div>
                      <p className="text-[11px] text-[#92929d] mt-1 leading-snug">
                        Rolling cart arrives at front registers. Best time to scout.
                      </p>
                    </div>

                    <div className="p-3 bg-[#222227] border border-[#2c2c35] rounded-xl">
                      <div className="text-[10px] text-[#34c759] uppercase font-bold flex items-center gap-1 mb-1">
                        <ShieldCheck className="w-3 h-3 text-[#34c759]" /> 3. Store Purchase Rule
                      </div>
                      <div className="font-bold text-[#34c759]">{pred.purchaseLimits}</div>
                      <p className="text-[11px] text-[#92929d] mt-1 leading-snug">
                        Strictly enforced at register; do not trigger supervisor override.
                      </p>
                    </div>
                  </div>

                  {/* Exact Stash Coordinates & Box Spotter Intel */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Shelf & Counter Stash Spots */}
                    <div className="p-3.5 bg-[#222227] border border-[#2c2c35] rounded-xl space-y-2">
                      <div className="text-[11px] text-[#ffd60a] font-bold uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#ffd60a]" /> Exact In-Store Stash Coordinates:
                      </div>
                      <div className="bg-[#18181c] p-2.5 rounded-lg border border-[#2c2c35]">
                        <div className="text-[10px] text-[#34c759] font-bold uppercase">Primary Display:</div>
                        <div className="text-xs text-[#f5f5f7] font-semibold mt-0.5">{pred.primaryStashSpot}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#92929d] font-bold uppercase mb-1">
                          If Empty, Check Counter & Security Staging:
                        </div>
                        <ul className="space-y-1">
                          {pred.backupStashSpots.map((spot, idx) => (
                            <li key={idx} className="text-[11px] text-[#92929d] flex items-start gap-1.5 leading-snug">
                              <span className="text-[#ffd60a] font-mono">•</span>
                              <span>{spot}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Vendor Box & Cart Spotter Guide */}
                    <div className="p-3.5 bg-[#222227] border border-[#2c2c35] rounded-xl space-y-2">
                      <div className="text-[11px] text-[#0a84ff] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-[#0a84ff]" /> Rep & Shipper Box Spotter Guide:
                      </div>
                      <div className="bg-[#18181c] p-2.5 rounded-lg border border-[#2c2c35]">
                        <div className="text-[10px] text-[#ffd60a] font-bold uppercase">Cart Type:</div>
                        <div className="text-xs text-[#f5f5f7] font-semibold mt-0.5">{pred.cartType}</div>
                      </div>
                      <div className="bg-[#18181c] p-2.5 rounded-lg border border-[#2c2c35]">
                        <div className="text-[10px] text-[#0a84ff] font-bold uppercase">Box Identifier Tape:</div>
                        <div className="text-xs text-[#f5f5f7] font-semibold mt-0.5">{pred.vendorBoxIdentifier}</div>
                      </div>
                    </div>
                  </div>

                  {/* Associate Dialogue Script */}
                  <div className="p-3 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-[10px] text-[#ffd60a] uppercase font-bold flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Politely Ask Store Associate / Customer Service:
                      </div>
                      <p className="text-xs text-[#f5f5f7] italic font-medium leading-snug">
                        {pred.dialogueScript}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyScript(pred.id, pred.dialogueScript)}
                      className="px-3 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#2c2c35] text-[#ffd60a] border border-[#2c2c35] text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                    >
                      {copiedScriptId === pred.id ? <Check className="w-3.5 h-3.5 text-[#34c759]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScriptId === pred.id ? 'Copied Script!' : 'Copy Script'}</span>
                    </button>
                  </div>

                  {/* Live Community Sighting & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#2c2c35] text-xs">
                    {latestSighting ? (
                      <div className="flex items-center gap-2 text-[11px] text-[#92929d]">
                        <span className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse" />
                        <span>
                          Latest Report: <strong className="text-[#f5f5f7]">{latestSighting.storeName}</strong> ({latestSighting.timeAgo}) —{' '}
                          <span className="text-[#34c759] font-bold">{latestSighting.status}:</span> {latestSighting.repActivity}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#92929d]">No recent hunter sightings logged yet for this chain today.</span>
                    )}

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSightingModalPredictor(pred);
                          setSightingStoreLocation(`${pred.retailer} near ${zipCode}`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#ffd60a] border border-[#2c2c35] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Log Sighting</span>
                      </button>

                      <a
                        href={`https://www.google.com/maps/search/${encodeURIComponent(pred.retailer + ' near ' + zipCode)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#f5f5f7] border border-[#2c2c35] text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5 text-[#0a84ff]" />
                        <span>Map Stores</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStore(pred.retailer.includes('Walmart') ? 'Walmart' : pred.retailer.includes('Target') ? 'Target' : pred.retailer.includes('Dollar') ? 'Dollar General' : 'All');
                          setActiveSubTab('live_drops');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#ffd60a] hover:bg-[#ffc107] text-black text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>View Hot SKUs</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2 & 3: LIVE DROPS & HIDDEN CLEARANCE LIST                            */}
      {/* ========================================================================= */}
      {(activeSubTab === 'live_drops' || activeSubTab === 'hidden_clearance') && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-3.5 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#92929d]" />
              <input
                type="text"
                placeholder="Search card set (151, Prismatic, Paldean, Crown Zenith), store, or product..."
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

              {(searchQuery || selectedStore !== 'All' || selectedStatus !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStore('All');
                    setSelectedStatus('All');
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
              Showing <strong className="text-[#f5f5f7]">{filteredDrops.length}</strong> card drops & restocks near{' '}
              <strong className="text-[#ffd60a]">{zipCode}</strong>
            </span>
            <span className="text-[11px] text-[#34c759] font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#34c759]" /> TCGPlayer / eBay Market Comps Active
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
                      <div className="flex items-start gap-1.5 text-[#ffd60a]">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#ffd60a]" />
                        <span className="font-semibold leading-snug">
                          <strong>Shelf Coordinates:</strong> {drop.inStoreLocation}
                        </span>
                      </div>

                      <div className="flex items-start gap-1.5 text-[#92929d]">
                        <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#0a84ff]" />
                        <span className="leading-snug">
                          <strong>Delivery Timing:</strong> {drop.restockSchedule}
                        </span>
                      </div>

                      <div className="flex items-start gap-1.5 text-[#92929d] bg-[#222227] p-2 rounded-lg border border-[#2c2c35]/50">
                        <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#ff9800]" />
                        <span className="leading-snug">
                          <strong>Hunter Tip:</strong> {drop.hunterTips}
                        </span>
                      </div>
                    </div>

                    {/* Local Store Stock Info & Action Buttons */}
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#2c2c35]">
                      <div className="text-xs text-[#92929d] flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#f5f5f7]">{drop.closestStoreStock.storeName}</span>
                        <span>({drop.closestStoreStock.distanceMiles} mi)</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            drop.closestStoreStock.stockStatus === 'In Stock'
                              ? 'bg-[#34c759]/20 text-[#34c759]'
                              : drop.closestStoreStock.stockStatus === 'Restock Reported'
                              ? 'bg-[#ffd60a]/20 text-[#ffd60a]'
                              : drop.closestStoreStock.stockStatus === 'Limited Stock'
                              ? 'bg-[#ff9800]/20 text-[#ff9800]'
                              : 'bg-[#ff3b30]/20 text-[#ff3b30]'
                          }`}
                        >
                          {drop.closestStoreStock.stockStatus}
                        </span>
                        <span className="text-[10px] text-[#92929d]">
                          Verified: {drop.closestStoreStock.reportedAt}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setReportingItem(drop);
                            setReportStoreName(drop.closestStoreStock.storeName);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#34c759]" />
                          <span>Report Stock</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onLoadIntoCalculator({
                              name: drop.name,
                              buy: drop.actualPrice.toString(),
                              sell: drop.marketPrice.toString(),
                              store: drop.store,
                            });
                            soundFx.playStandardScan();
                            onNotify(`Loaded "${drop.name.substring(0, 24)}..." into Profit Calculator`, 'info');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#ffd60a] border border-[#2c2c35] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Calc</span>
                        </button>

                        {onAddToCart && (
                          <button
                            type="button"
                            onClick={() => {
                              onAddToCart({
                                title: drop.name,
                                buyPrice: drop.actualPrice,
                                sellPrice: drop.marketPrice,
                                store: drop.store,
                                category: 'Trading Cards',
                                notes: `${drop.series} | ${drop.inStoreLocation}`,
                              });
                              soundFx.playHighProfitChime();
                              onNotify(`Added ${drop.name.substring(0, 24)}... to Sourcing Cart!`, 'success');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#ffd60a] hover:bg-[#ffc107] text-black text-xs font-black flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Bag It</span>
                          </button>
                        )}
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
      {/* VIEW 4: HUNTER SIGHTING DISPATCH                                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'community_dispatch' && (
        <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#ff9800] font-black uppercase">
                <Radio className="w-4 h-4 text-[#ff9800] animate-pulse" /> Live Regional Restock Dispatch
              </div>
              <h3 className="text-base font-black text-[#f5f5f7] mt-0.5">
                Community Hunter Sightings & Peg Activity
              </h3>
              <p className="text-xs text-[#92929d]">
                Crowdsourced live reports from in-store scouts checking trading card walls near {zipCode}.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSightingModalPredictor(deliveryPredictors[0]);
                setSightingStoreLocation(`Walmart Supercenter near ${zipCode}`);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#ff9800] hover:bg-[#f57c00] text-black font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Broadcast Sighting</span>
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {deliveryPredictors.flatMap((p) =>
              p.recentSightings.map((sighting, idx) => (
                <div
                  key={`${p.id}-${idx}`}
                  className="p-3 bg-[#222227] border border-[#2c2c35] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-black text-white uppercase"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.retailer}
                      </span>
                      <span className="text-xs font-black text-[#f5f5f7]">{sighting.storeName}</span>
                      <span className="text-xs text-[#92929d]">({sighting.distanceMiles} mi)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#34c759]/20 text-[#34c759] font-bold border border-[#34c759]/40">
                        {sighting.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#92929d]">{sighting.repActivity}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-[#ffd60a] font-mono font-bold flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" /> {sighting.timeAgo}
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(sighting.storeName)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#0a84ff] hover:underline flex items-center gap-1 justify-end mt-1 font-semibold"
                    >
                      <Navigation className="w-3 h-3" /> Drive There
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LOG SIGHTING ON DELIVERY PREDICTOR                                  */}
      {/* ========================================================================= */}
      {sightingModalPredictor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#ffd60a]" />
                <h3 className="font-black text-sm text-[#f5f5f7]">
                  Log Delivery Sighting for {sightingModalPredictor.retailer}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSightingModalPredictor(null)}
                className="text-[#92929d] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogPredictorSighting} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#92929d] font-bold mb-1">Store Name / Branch Location:</label>
                <input
                  type="text"
                  value={sightingStoreLocation}
                  onChange={(e) => setSightingStoreLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                  placeholder="e.g. Walmart Supercenter #1909 (Main St)"
                />
              </div>

              <div>
                <label className="block text-[#92929d] font-bold mb-1">Vendor & Stock Status:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['In-Store Now', 'Fresh Stock on Shelf', 'Staged in Back', 'Cleared Out'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setSightingStatus(status)}
                      className={`p-2 rounded-xl text-left border text-xs font-bold transition-all cursor-pointer ${
                        sightingStatus === status
                          ? 'bg-[#ffd60a] text-black border-[#ffd60a]'
                          : 'bg-[#222227] text-[#92929d] border-[#2c2c35]'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[#92929d] font-bold mb-1">What did you see? (Rep activity, products, limits):</label>
                <textarea
                  value={sightingActivityText}
                  onChange={(e) => setSightingActivityText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none focus:border-[#ffd60a] resize-none"
                  placeholder="e.g. MJ Holding rep rolling cart to lane 3 with 3 boxes of 151 bundles! Limit 2 enforced."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSightingModalPredictor(null)}
                  className="flex-1 py-2 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#ffd60a] hover:bg-[#ffc107] text-black font-black transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Post Sighting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REPORT STOCK STATUS ON SPECIFIC PRODUCT DROP                        */}
      {/* ========================================================================= */}
      {reportingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#34c759]" />
                <h3 className="font-black text-sm text-[#f5f5f7]">Update Stock for Card Drop</h3>
              </div>
              <button
                type="button"
                onClick={() => setReportingItem(null)}
                className="text-[#92929d] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[#92929d] bg-[#222227] p-3 rounded-xl">
              Updating: <strong className="text-[#f5f5f7]">{reportingItem.name}</strong>
            </div>

            <form onSubmit={handleReportSighting} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#92929d] font-bold mb-1">Store Name / Location:</label>
                <input
                  type="text"
                  value={reportStoreName}
                  onChange={(e) => setReportStoreName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                  placeholder="e.g. Target Store #1104"
                />
              </div>

              <div>
                <label className="block text-[#92929d] font-bold mb-1">Observed Stock Status:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['In Stock', 'Limited Stock', 'Out of Stock', 'Restock Reported'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setReportStatus(status)}
                      className={`p-2 rounded-xl text-left border text-xs font-bold transition-all cursor-pointer ${
                        reportStatus === status
                          ? 'bg-[#ffd60a] text-black border-[#ffd60a]'
                          : 'bg-[#222227] text-[#92929d] border-[#2c2c35]'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[#92929d] font-bold mb-1">Hunter Note (Optional):</label>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none focus:border-[#ffd60a] resize-none"
                  placeholder="e.g. 5 boxes left behind Guest Services counter, clerk had them in drawer."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportingItem(null)}
                  className="flex-1 py-2 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#34c759] hover:bg-[#2fb34f] text-black font-black transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Save Stock Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CUSTOM CARD DROP                                               */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#ffd60a]" />
                <h3 className="font-black text-sm text-[#f5f5f7]">Report New Pokémon / TCG Drop</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#92929d] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomDrop} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#92929d] font-bold mb-1">Product Title:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                  placeholder="e.g. Pokémon TCG: 151 Booster Bundle"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#92929d] font-bold mb-1">Set / Series:</label>
                  <input
                    type="text"
                    value={newSeries}
                    onChange={(e) => setNewSeries(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                    placeholder="e.g. Prismatic Evolutions"
                  />
                </div>

                <div>
                  <label className="block text-[#92929d] font-bold mb-1">Store Chain:</label>
                  <select
                    value={newStore}
                    onChange={(e) => setNewStore(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                  >
                    <option value="Walmart">Walmart</option>
                    <option value="Target">Target</option>
                    <option value="Costco">Costco</option>
                    <option value="Best Buy">Best Buy</option>
                    <option value="Dollar General">Dollar General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#92929d] font-bold mb-1">MSRP ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMsrp}
                    onChange={(e) => setNewMsrp(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                    placeholder="26.94"
                  />
                </div>

                <div>
                  <label className="block text-[#92929d] font-bold mb-1">Scan Price ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newActualPrice}
                    onChange={(e) => setNewActualPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                    placeholder="26.94"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#92929d] font-bold mb-1">Market Resell ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMarketPrice}
                    onChange={(e) => setNewMarketPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                    placeholder="48.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#92929d] font-bold mb-1">Drop Status:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as PokemonDropStatus)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                >
                  <option value="VENDOR IN-STORE NOW">VENDOR IN-STORE NOW</option>
                  <option value="RESTOCK DROP TODAY">RESTOCK DROP TODAY</option>
                  <option value="HIDDEN CLEARANCE">HIDDEN CLEARANCE</option>
                  <option value="STORE RESET WATCH">STORE RESET WATCH</option>
                </select>
              </div>

              <div>
                <label className="block text-[#92929d] font-bold mb-1">In-Store Stash Location:</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                  placeholder="e.g. Front lanes 3 & 4 card wall or Guest Services desk"
                />
              </div>

              <div>
                <label className="block text-[#92929d] font-bold mb-1">Hunter Tip:</label>
                <input
                  type="text"
                  value={newTips}
                  onChange={(e) => setNewTips(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
                  placeholder="e.g. Rep arrived at 10 AM, 4 cases put on pegs."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#ffd60a] hover:bg-[#ffc107] text-black font-black transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Broadcast Drop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
