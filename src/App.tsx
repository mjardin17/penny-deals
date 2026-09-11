import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TurnoverWatchlist } from './components/TurnoverWatchlist';
import { ArbitrageCalculator, CalcPrefillData } from './components/ArbitrageCalculator';
import { DGPennyHub } from './components/DGPennyHub';
import { DealSeekHub } from './components/DealSeekHub';
import { DealSoldierHub } from './components/DealSoldierHub';
import { WalmartSecretHub } from './components/WalmartSecretHub';
import { TargetSecretHub } from './components/TargetSecretHub';
import { LowesSecretHub } from './components/LowesSecretHub';
import { CrossStoreScannerHub } from './components/CrossStoreScannerHub';
import { PokemonTcgRadar } from './components/PokemonTcgRadar';
import { InStoreBarcodeScanner } from './components/InStoreBarcodeScanner';
import { SourcingRunPlanner } from './components/SourcingRunPlanner';
import { BulkScanHub } from './components/BulkScanHub';
import { StoreFloorPlanNavigator } from './components/StoreFloorPlanNavigator';
import { PriceDropWatchdog } from './components/PriceDropWatchdog';
import { ArbitrageCopilot } from './components/ArbitrageCopilot';
import { ReceiptDigitizerModal } from './components/ReceiptDigitizerModal';
import { DealDiagnosticModal } from './components/DealDiagnosticModal';
import { StoreLookupDirectory } from './components/StoreLookupDirectory';
import { AutoCouponMaximizer } from './components/AutoCouponMaximizer';
import { CartLog } from './components/CartLog';
import { Toast, ToastMessage } from './components/Toast';
import { SourcingItem, DealSeekItem, DealSoldierItem, WalmartSecretItem, StoreProfile, StoreDealItem, AutoCoupledDeal } from './types';
import { autoCoupleCustomItem } from './data/autoCouplerData';
import {
  Sparkles,
  Calculator,
  ShoppingCart,
  ListFilter,
  Flame,
  ShieldAlert,
  Zap,
  ScanLine,
  Tag,
  Wrench,
  ArrowRightLeft,
  Boxes,
  Navigation,
  Layers,
  Map,
  BellRing,
  Receipt,
  Store,
  Scissors,
} from 'lucide-react';
import { soundFx } from './utils/audioFeedback';

export default function App() {
  const [zipCode, setZipCode] = useState<string>(() => {
    return localStorage.getItem('pennyHunterZip') || '02745';
  });

  const [items, setItems] = useState<SourcingItem[]>(() => {
    try {
      const saved = localStorage.getItem('sourcingLog');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item, idx) => ({
            ...item,
            id: item.id || `item-${Date.now()}-${idx}`,
            timestamp: item.timestamp || Date.now() - idx * 1000,
          }));
        }
      }
    } catch (e) {
      console.error('Failed to parse sourcingLog from localStorage', e);
    }
    return [];
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [calcPrefillData, setCalcPrefillData] = useState<CalcPrefillData | null>(null);
  const [activeTab, setActiveTab] = useState<
    | 'all'
    | 'autocouple'
    | 'stores'
    | 'copilot'
    | 'route'
    | 'batch'
    | 'floorplan'
    | 'watchdog'
    | 'crossscan'
    | 'walmart'
    | 'target'
    | 'lowes'
    | 'dealsoldier'
    | 'pokemon'
    | 'dealseek'
    | 'dg'
    | 'calc'
    | 'watchlist'
  >('all');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedDealForDiagnostic, setSelectedDealForDiagnostic] = useState<any | null>(null);

  // Active Store Profile
  const [activeStore, setActiveStore] = useState<StoreProfile | null>(() => {
    try {
      const saved = localStorage.getItem('activeStoreProfile');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const handleSetActiveStore = (store: StoreProfile) => {
    setActiveStore(store);
    try {
      localStorage.setItem('activeStoreProfile', JSON.stringify(store));
    } catch (e) {
      console.error(e);
    }
  };

  // Persist items to localStorage using the exact key 'sourcingLog'
  useEffect(() => {
    try {
      localStorage.setItem('sourcingLog', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save sourcingLog to localStorage', e);
    }
  }, [items]);

  // Persist zipCode
  const handleUpdateZip = (newZip: string) => {
    setZipCode(newZip);
    localStorage.setItem('pennyHunterZip', newZip);
  };

  const addToast = (
    message: string,
    type: 'success' | 'info' | 'error' = 'info'
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddItem = (newItemData: Omit<SourcingItem, 'id' | 'timestamp'>) => {
    const newItem: SourcingItem = {
      ...newItemData,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    setItems((prev) => [newItem, ...prev]);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    addToast('Item removed from cart', 'info');
  };

  const handleClearAll = () => {
    setItems([]);
    localStorage.removeItem('sourcingLog');
    addToast('Sourcing log wiped clean', 'info');
  };

  const handleLoadSamples = () => {
    const sampleItems: SourcingItem[] = [
      {
        id: `sample-1`,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now() - 3600000,
        label: 'DG Fall Ceramic Pumpkin Set (1¢ Mark)',
        buy: 0.01,
        sell: 18.5,
        ship: 4.5,
        feePct: 0.15,
        profit: '11.21',
        roi: '112100',
        store: 'Dollar General',
      },
      {
        id: `sample-2`,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now() - 7200000,
        label: 'Licensed 10ft Giant Reaper Inflatable',
        buy: 15.0,
        sell: 75.0,
        ship: 0.0, // Local FB flip
        feePct: 0.0,
        profit: '60.00',
        roi: '400',
        store: 'Home Depot',
      },
      {
        id: `sample-3`,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now() - 10800000,
        label: "Men's Weatherproof Down Winter Parka",
        buy: 12.0,
        sell: 55.0,
        ship: 8.5,
        feePct: 0.15,
        profit: '26.25',
        roi: '219',
        store: 'TJ Maxx',
      },
    ];
    setItems(sampleItems);
    addToast('Loaded 3 sample sourcing deals!', 'success');
  };

  const handleLoadFromDG = (prefill: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => {
    setCalcPrefillData(prefill);
    if (activeTab === 'dg') {
      setActiveTab('all');
    }
    // Smooth scroll to calculator
    setTimeout(() => {
      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleLoadFromDealSeek = (prefill: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => {
    setCalcPrefillData(prefill);
    if (activeTab === 'dealseek') {
      setActiveTab('all');
    }
    // Smooth scroll to calculator
    setTimeout(() => {
      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleLoadFromDealSoldier = (prefill: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => {
    setCalcPrefillData(prefill);
    if (activeTab === 'dealsoldier') {
      setActiveTab('all');
    }
    setTimeout(() => {
      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleAddToCartFromDealSeek = (deal: DealSeekItem) => {
    const estProfit = (deal.estResellPrice - deal.dealPrice - deal.estResellPrice * 0.15 - 4.5).toFixed(2);
    const roi = Math.round(((parseFloat(estProfit) || 0) / (deal.dealPrice || 1)) * 100).toString();
    handleAddItem({
      date: new Date().toLocaleDateString(),
      label: `${deal.store}: ${deal.title}`,
      buy: deal.dealPrice,
      sell: deal.estResellPrice,
      ship: 4.5,
      feePct: 0.15,
      profit: estProfit,
      roi: roi,
      store: deal.store,
      category: deal.category,
      notes: deal.promoCode ? `Promo code: ${deal.promoCode}` : deal.clippableCouponText,
    });
    addToast(`Added "${deal.title}" to sourcing cart!`, 'success');
  };

  const handleAddToCartFromDealSoldier = (deal: DealSoldierItem) => {
    const estProfit = (deal.estResellPrice - deal.price - deal.estResellPrice * 0.15 - 4.5).toFixed(2);
    const roi = Math.round(((parseFloat(estProfit) || 0) / (deal.price || 0.01)) * 100).toString();
    const closest = deal.closestStore;
    const storeLabel = closest
      ? `${closest.storeName} (${closest.address || 'Dartmouth'}) • ${closest.distanceMiles} mi away`
      : deal.store;
    handleAddItem({
      date: new Date().toLocaleDateString(),
      label: `${deal.store}: ${deal.title}`,
      buy: deal.price,
      sell: deal.estResellPrice,
      ship: 4.5,
      feePct: 0.15,
      profit: estProfit,
      roi: roi,
      store: storeLabel,
      category: deal.category,
      notes: `SKU: ${deal.sku} • ${deal.markdownCode} • Shelf: ${closest?.aisleBay || deal.aisleBayHint} • Store: ${storeLabel}`,
    });
    addToast(`Added "${deal.title}" to sourcing cart!`, 'success');
  };

  const handleLoadFromWalmart = (prefill: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => {
    setCalcPrefillData(prefill);
    if (activeTab === 'walmart') {
      setActiveTab('all');
    }
    setTimeout(() => {
      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleLoadFromTarget = (prefill: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => {
    setCalcPrefillData(prefill);
    if (activeTab === 'target') {
      setActiveTab('all');
    }
    setTimeout(() => {
      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleLoadFromLowes = (prefill: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => {
    setCalcPrefillData(prefill);
    if (activeTab === 'lowes') {
      setActiveTab('all');
    }
    setTimeout(() => {
      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleLoadFromCrossScan = (prefill: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => {
    setCalcPrefillData(prefill);
    if (activeTab === 'crossscan') {
      setActiveTab('all');
    }
    setTimeout(() => {
      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleAddToCartFromCrossScan = (deal: {
    title: string;
    buyPrice: number;
    sellPrice: number;
    store: string;
    category: string;
    notes?: string;
  }) => {
    const estProfit = (deal.sellPrice - deal.buyPrice - deal.sellPrice * 0.15 - 5.0).toFixed(2);
    const roi = Math.round(((parseFloat(estProfit) || 0) / (deal.buyPrice || 1.0)) * 100).toString();
    handleAddItem({
      date: new Date().toLocaleDateString(),
      label: `Cross-Scan: ${deal.title}`,
      buy: deal.buyPrice,
      sell: deal.sellPrice,
      ship: 5.0,
      feePct: 0.15,
      profit: estProfit,
      roi: roi,
      store: deal.store,
      category: deal.category,
      notes: deal.notes,
    });
    addToast(`Added "${deal.title}" to sourcing cart from Cross-Store Scan!`, 'success');
  };

  const handleLoadFromStoreLookup = (prefill: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => {
    setCalcPrefillData(prefill);
    if (activeTab === 'stores') {
      setActiveTab('all');
    }
    setTimeout(() => {
      document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleAddToCartFromStoreDirectory = (deal: StoreDealItem, store: StoreProfile) => {
    const estProfit = (
      deal.estResellPrice -
      deal.clearancePrice -
      deal.estResellPrice * 0.15 -
      4.5
    ).toFixed(2);
    const roi = Math.round(
      ((parseFloat(estProfit) || 0) / (deal.clearancePrice || 0.01)) * 100
    ).toString();
    const storeLabel = `${store.storeName} (${store.address}) • ${store.distanceMiles} mi`;

    handleAddItem({
      date: new Date().toLocaleDateString(),
      label: `${store.chain}: ${deal.title}`,
      buy: deal.clearancePrice,
      sell: deal.estResellPrice,
      ship: 4.5,
      feePct: 0.15,
      profit: estProfit,
      roi: roi,
      store: storeLabel,
      category: deal.category,
      notes: `SKU: ${deal.sku} • Markdown: ${deal.markdownType} • Shelf/Bay: ${deal.aisleBay} • Store: ${storeLabel}`,
    });
    addToast(`Added "${deal.title}" to sourcing cart!`, 'success');
  };

  const handleAddToCartFromWalmart = (deal: WalmartSecretItem) => {
    const estProfit = (deal.estResellPrice - deal.actualScanPrice - deal.estResellPrice * 0.15 - 5.0).toFixed(2);
    const roi = Math.round(((parseFloat(estProfit) || 0) / (deal.actualScanPrice || 1.0)) * 100).toString();
    const storeObj = deal.closestStore || (deal.inStockStoresNearZip && deal.inStockStoresNearZip[0]);
    const storeLabel = storeObj
      ? `${storeObj.storeName} (${storeObj.distanceMiles} mi away)`
      : 'Walmart Supercenter #1909 (2.1 mi away)';
    const storeAddress = storeObj?.address ? ` • ${storeObj.address}` : '';

    handleAddItem({
      date: new Date().toLocaleDateString(),
      label: `Walmart: ${deal.title}`,
      buy: deal.actualScanPrice,
      sell: deal.estResellPrice,
      ship: 5.0,
      feePct: 0.15,
      profit: estProfit,
      roi: roi,
      store: storeLabel,
      category: deal.category,
      notes: `Store: ${storeLabel}${storeAddress} • SKU: ${deal.sku} • Stage: ${deal.markdownStage} • Tag: $${deal.shelfTagPrice.toFixed(2)} -> Scan: $${deal.actualScanPrice.toFixed(2)} • Spot: ${deal.hiddenLocationType}`,
    });
    addToast(`Added "${deal.title}" to sourcing cart!`, 'success');
  };

  const handleAddToCartFromTarget = (deal: {
    title: string;
    buyPrice: number;
    sellPrice: number;
    store: string;
    category: string;
    notes?: string;
  }) => {
    const estProfit = (deal.sellPrice - deal.buyPrice - deal.sellPrice * 0.13 - 4.5).toFixed(2);
    const roi = Math.round(((parseFloat(estProfit) || 0) / (deal.buyPrice || 1.0)) * 100).toString();
    handleAddItem({
      date: new Date().toLocaleDateString(),
      label: `Target: ${deal.title}`,
      buy: deal.buyPrice,
      sell: deal.sellPrice,
      ship: 4.5,
      feePct: 0.13,
      profit: estProfit,
      roi: roi,
      store: deal.store || 'Target',
      category: deal.category,
      notes: deal.notes,
    });
    addToast(`Added "${deal.title}" to sourcing cart!`, 'success');
  };

  const handleAddToCartFromLowes = (deal: {
    title: string;
    buyPrice: number;
    sellPrice: number;
    store: string;
    category: string;
    notes?: string;
  }) => {
    const estProfit = (deal.sellPrice - deal.buyPrice - deal.sellPrice * 0.13 - 6.5).toFixed(2);
    const roi = Math.round(((parseFloat(estProfit) || 0) / (deal.buyPrice || 1.0)) * 100).toString();
    handleAddItem({
      date: new Date().toLocaleDateString(),
      label: `Lowe's: ${deal.title}`,
      buy: deal.buyPrice,
      sell: deal.sellPrice,
      ship: 6.5,
      feePct: 0.13,
      profit: estProfit,
      roi: roi,
      store: deal.store || "Lowe's",
      category: deal.category,
      notes: deal.notes,
    });
    addToast(`Added "${deal.title}" to sourcing cart!`, 'success');
  };

  const handleAddToCartFromPokemon = (deal: {
    title: string;
    buyPrice: number;
    sellPrice: number;
    store: string;
    category: string;
    notes?: string;
  }) => {
    const estProfit = (deal.sellPrice - deal.buyPrice - deal.sellPrice * 0.13 - 4.5).toFixed(2);
    const roi = Math.round(((parseFloat(estProfit) || 0) / (deal.buyPrice || 1.0)) * 100).toString();
    handleAddItem({
      date: new Date().toLocaleDateString(),
      label: deal.title,
      buy: deal.buyPrice,
      sell: deal.sellPrice,
      ship: 4.5,
      feePct: 0.13,
      profit: estProfit,
      roi: roi,
      store: deal.store,
      category: deal.category,
      notes: deal.notes,
    });
    addToast(`Added "${deal.title}" to sourcing cart!`, 'success');
  };

  const handleImportBatchToCart = (batchItems: any[]) => {
    let count = 0;
    batchItems.forEach((it) => {
      const buy = Number(it.buyPrice) || 0.01;
      const sell = Number(it.sellPrice) || 14.99;
      const estProfit = (sell - buy - sell * 0.15 - 4.5).toFixed(2);
      const roi = Math.round(((parseFloat(estProfit) || 0) / (buy || 0.01)) * 100).toString();
      handleAddItem({
        date: new Date().toLocaleDateString(),
        label: `${it.store || 'Receipt'}: ${it.title}`,
        buy,
        sell,
        ship: 4.5,
        feePct: 0.15,
        profit: estProfit,
        roi,
        store: it.store || 'Retail Store',
        category: it.category || 'Arbitrage Haul',
        notes: it.notes || 'Receipt OCR Log',
      });
      count++;
    });
    addToast(`Imported ${count} items from receipt to Sourcing Cart!`, 'success');
  };

  const handleAddToCartFromAutoCoupler = (deal: AutoCoupledDeal) => {
    const layersSummary = deal.coupledCoupons
      .map((c) => `${c.name} (-$${c.discountValue.toFixed(2)})`)
      .join(', ');
    handleAddItem({
      date: new Date().toLocaleDateString(),
      label: `${deal.store}: ${deal.title} (Coupled)`,
      buy: deal.finalNetBuyCost,
      sell: deal.estResalePrice,
      ship: 4.5,
      feePct: 0.15,
      profit: deal.estNetProfit.toFixed(2),
      roi: deal.roiPct.toString(),
      store: deal.store,
      category: deal.category,
      notes: `Coupled Savings: -$${deal.totalCouponSavings.toFixed(2)} | Layers: ${layersSummary}${
        deal.hackDetails ? ' | Hack: ' + deal.hackDetails.stepByStepInstructions[0] : ''
      }`,
    });
    addToast(
      `Added auto-coupled "${deal.title}" to cart ($${deal.finalNetBuyCost.toFixed(2)} buy cost)!`,
      'success'
    );
  };

  const handleAutoCoupleEntireCart = () => {
    if (items.length === 0) {
      addToast('Cart is currently empty.', 'info');
      return;
    }

    let updatedCount = 0;
    let totalSavingsAcrossCart = 0;

    const newItems = items.map((item) => {
      const currentBuy = Number(item.buy) || 0;
      if (currentBuy <= 0.05) return item;

      const result = autoCoupleCustomItem(
        item.label,
        currentBuy,
        item.store || 'Dollar General',
        item.category
      );

      if (result.finalPrice < currentBuy) {
        updatedCount++;
        const saved = currentBuy - result.finalPrice;
        totalSavingsAcrossCart += saved;

        const currentSell = Number(item.sell) || 0;
        const fee = currentSell * (item.feePct || 0.15);
        const ship = Number(item.ship) || 0;
        const newProfit = (currentSell - result.finalPrice - fee - ship).toFixed(2);
        const newRoi =
          result.finalPrice > 0
            ? Math.round(((parseFloat(newProfit) || 0) / result.finalPrice) * 100).toString()
            : '999';

        const layersNote = result.appliedLayers
          .map((l) => `${l.name} (-$${l.discountValue.toFixed(2)})`)
          .join(', ');
        return {
          ...item,
          buy: result.finalPrice,
          profit: newProfit,
          roi: newRoi,
          notes: item.notes
            ? `${item.notes} | Auto-Coupled: ${layersNote}`
            : `Auto-Coupled: ${layersNote}`,
        };
      }
      return item;
    });

    if (updatedCount > 0) {
      setItems(newItems);
      soundFx.playCashRegister();
      addToast(
        `⚡ Auto-coupled ${updatedCount} cart items, saving an extra $${totalSavingsAcrossCart.toFixed(2)}!`,
        'success'
      );
    } else {
      addToast('All cart items are already at maximum discount or coupon depth!', 'info');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f12] text-[#f5f5f7] flex flex-col items-center">
      <main className="w-full max-w-[740px] px-3 sm:px-4 py-4 sm:py-6">
        {/* Header with Title & Location Badge */}
        <Header
          zipCode={zipCode}
          onUpdateZip={handleUpdateZip}
          onNotify={addToast}
          cartCount={items.length}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenReceiptScanner={() => setIsReceiptModalOpen(true)}
          activeStoreName={activeStore ? `${activeStore.chain} #${activeStore.storeNumber} (${activeStore.city})` : 'Home Depot #2671'}
          activeStoreDistance={activeStore ? `${activeStore.distanceMiles} mi` : '1.8 mi'}
          onOpenStoreLookup={() => setActiveTab('stores')}
        />

        {/* View Mode Navigation Pills */}
        <div className="flex items-center justify-center gap-1 mb-4 bg-[#18181c] p-1.5 rounded-xl border border-[#2c2c35] text-[11px] sm:text-xs overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#222227] text-[#f5f5f7] shadow-sm border border-[#2c2c35]'
                : 'text-[#92929d] hover:text-[#f5f5f7]'
            }`}
          >
            All Views
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('autocouple')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'autocouple'
                ? 'bg-gradient-to-r from-[#ffd60a] to-[#ff9f0a] text-black shadow-sm font-black'
                : 'text-[#ffd60a] hover:bg-[#ffd60a]/10 border border-[#ffd60a]/30'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Auto-Coupler & Stacks</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-[#ffd60a] font-mono font-bold">
              STACK
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stores')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'stores'
                ? 'bg-[#ffd60a] text-black shadow-sm font-black'
                : 'text-[#ffd60a] hover:bg-[#ffd60a]/10'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Store Lookup & Scope</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('copilot')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'copilot'
                ? 'bg-gradient-to-r from-[#ffd60a] to-[#ff9f0a] text-black shadow-sm font-black'
                : 'text-[#ffd60a] hover:bg-[#ffd60a]/10'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Copilot & Keepa Matrix</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('floorplan')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'floorplan'
                ? 'bg-[#0a84ff] text-white shadow-sm font-black'
                : 'text-[#0a84ff] hover:bg-[#0a84ff]/10'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Store Blueprint</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('watchdog')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'watchdog'
                ? 'bg-[#ff453a] text-white shadow-sm font-black'
                : 'text-[#ff453a] hover:bg-[#ff453a]/10'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Drop Watchdog</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('route')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'route'
                ? 'bg-[#30d158] text-black shadow-sm font-black'
                : 'text-[#30d158] hover:bg-[#30d158]/10'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Route Planner</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'batch'
                ? 'bg-[#ffd60a] text-black shadow-sm font-black'
                : 'text-[#ffd60a] hover:bg-[#ffd60a]/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Batch Scanner</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('crossscan')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'crossscan'
                ? 'bg-gradient-to-r from-[#30d158] to-[#0a84ff] text-black shadow-sm font-black'
                : 'text-[#0a84ff] hover:bg-[#0a84ff]/10'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Store Catalogs & Radar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('walmart')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'walmart'
                ? 'bg-[#0a84ff] text-white shadow-sm font-extrabold'
                : 'text-[#0a84ff] hover:bg-[#0a84ff]/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Walmart Secrets</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('target')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'target'
                ? 'bg-[#ff3b30] text-white shadow-sm font-extrabold'
                : 'text-[#ff3b30] hover:bg-[#ff3b30]/10'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Target Matrix</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lowes')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'lowes'
                ? 'bg-[#004990] text-[#ffd60a] shadow-sm font-extrabold border border-[#ffd60a]/40'
                : 'text-[#ffd60a] hover:bg-[#004990]/20'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Lowe's Yellow Tag</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dealsoldier')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'dealsoldier'
                ? 'bg-[#f96302] text-white shadow-sm font-black'
                : 'text-[#f96302] hover:bg-[#f96302]/10'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>DealSoldier Loot & HD 1¢</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-[#ffd60a] font-mono font-black border border-[#ffd60a]/30">
              BOT
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pokemon')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'pokemon'
                ? 'bg-[#ffd60a] text-black shadow-sm font-black'
                : 'text-[#ffd60a] hover:bg-[#ffd60a]/10'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Pokémon TCG Drops</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dealseek')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'dealseek'
                ? 'bg-[#ff3b30] text-white shadow-sm font-extrabold'
                : 'text-[#ff453a] hover:bg-[#ff3b30]/10'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>DealSeek Hub</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dg')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'dg'
                ? 'bg-[#ff9800] text-black shadow-sm font-extrabold'
                : 'text-[#ff9800] hover:bg-[#ff9800]/10'
            }`}
          >
            <span>🟡 DG Pennies</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calc')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'calc'
                ? 'bg-[#222227] text-[#f5f5f7] shadow-sm border border-[#2c2c35]'
                : 'text-[#92929d] hover:text-[#f5f5f7]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Calculator</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('watchlist')}
            className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
              activeTab === 'watchlist'
                ? 'bg-[#222227] text-[#f5f5f7] shadow-sm border border-[#2c2c35]'
                : 'text-[#92929d] hover:text-[#f5f5f7]'
            }`}
          >
            <span>🍁 Watchlist</span>
          </button>
        </div>

        {/* Auto-Coupon & Multi-Layer Stack Maximizer */}
        {(activeTab === 'all' || activeTab === 'autocouple') && (
          <AutoCouponMaximizer
            zipCode={zipCode}
            onLoadIntoCalculator={handleLoadFromCrossScan}
            onAddToCart={handleAddToCartFromAutoCoupler}
            onNotify={addToast}
          />
        )}

        {/* Individual Store Lookup & Scope Radar */}
        {(activeTab === 'all' || activeTab === 'stores') && (
          <StoreLookupDirectory
            zipCode={zipCode}
            activeStoreId={activeStore?.id}
            onSetActiveStore={handleSetActiveStore}
            onLoadIntoCalculator={handleLoadFromStoreLookup}
            onAddToCart={handleAddToCartFromStoreDirectory}
            onNotify={addToast}
          />
        )}

        {/* In-Store Sourcing Run & Route Optimizer */}
        {(activeTab === 'all' || activeTab === 'route') && (
          <SourcingRunPlanner
            zipCode={zipCode}
            onAddToCart={handleAddToCartFromPokemon}
            onLoadIntoCalculator={handleLoadFromDealSoldier}
            onNotify={addToast}
          />
        )}

        {/* Store Layout & In-Store Clearance Blueprint Navigator */}
        {(activeTab === 'all' || activeTab === 'floorplan') && (
          <StoreFloorPlanNavigator
            zipCode={zipCode}
            onAddToCart={handleAddToCartFromPokemon}
            onLoadIntoCalculator={handleLoadFromDealSoldier}
            onNotify={addToast}
            onOpenDiagnostic={(deal) => setSelectedDealForDiagnostic(deal)}
          />
        )}

        {/* Arbitrage Copilot: Keepa Price Stability & Scoutify Decision Suite */}
        {(activeTab === 'all' || activeTab === 'copilot') && (
          <ArbitrageCopilot
            zipCode={zipCode}
            onAddToCart={handleAddToCartFromPokemon}
            onLoadIntoCalculator={handleLoadFromDealSoldier}
            onNotify={addToast}
          />
        )}

        {/* Price Drop Watchdog & Flash Markdown Alert Center */}
        {(activeTab === 'all' || activeTab === 'watchdog') && (
          <PriceDropWatchdog
            zipCode={zipCode}
            onAddToCart={handleAddToCartFromPokemon}
            onLoadIntoCalculator={handleLoadFromDealSoldier}
            onNotify={addToast}
            onOpenDiagnostic={(deal) => setSelectedDealForDiagnostic(deal)}
          />
        )}

        {/* Batch Barcode & UPC Multi-Scanner */}
        {(activeTab === 'all' || activeTab === 'batch') && (
          <BulkScanHub
            zipCode={zipCode}
            onAddToCart={handleAddToCartFromPokemon}
            onLoadIntoCalculator={handleLoadFromDealSoldier}
            onNotify={addToast}
            onOpenDiagnostic={(deal) => setSelectedDealForDiagnostic(deal)}
          />
        )}

        {/* Cross-Store Multi-Store Scanning Radar & Store Catalog Reader */}
        {(activeTab === 'all' || activeTab === 'crossscan') && (
          <CrossStoreScannerHub
            zipCode={zipCode}
            onLoadIntoCalculator={handleLoadFromCrossScan}
            onAddToCart={handleAddToCartFromCrossScan}
            onNotify={addToast}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenDiagnostic={(deal) => setSelectedDealForDiagnostic(deal)}
          />
        )}

        {/* Walmart Secret Markdowns Hub */}
        {(activeTab === 'all' || activeTab === 'walmart') && (
          <WalmartSecretHub
            zipCode={zipCode}
            onLoadIntoCalculator={handleLoadFromWalmart}
            onAddToCart={handleAddToCartFromWalmart}
            onNotify={addToast}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {/* Target Secret Clearance & Markdown Matrix Hub */}
        {(activeTab === 'all' || activeTab === 'target') && (
          <TargetSecretHub
            zipCode={zipCode}
            onLoadIntoCalculator={handleLoadFromTarget}
            onAddToCart={handleAddToCartFromTarget}
            onNotify={addToast}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {/* Lowe's Secret Yellow Tag & Markdown Radar */}
        {(activeTab === 'all' || activeTab === 'lowes') && (
          <LowesSecretHub
            zipCode={zipCode}
            onLoadIntoCalculator={handleLoadFromLowes}
            onAddToCart={handleAddToCartFromLowes}
            onNotify={addToast}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {/* Deal Soldier Hub (Home Depot Penny Live, Closest Store Inventory & The Closet) */}
        {(activeTab === 'all' || activeTab === 'dealsoldier') && (
          <DealSoldierHub
            zipCode={zipCode}
            onLoadIntoCalculator={handleLoadFromDealSoldier}
            onAddToCart={handleAddToCartFromDealSoldier}
            onNotify={addToast}
          />
        )}

        {/* Pokémon & TCG Drop Radar (Deal Soldier high-demand drops & hidden clearance) */}
        {(activeTab === 'all' || activeTab === 'pokemon') && (
          <div className="mb-6">
            <PokemonTcgRadar
              zipCode={zipCode}
              onLoadIntoCalculator={handleLoadFromDealSoldier}
              onAddToCart={handleAddToCartFromPokemon}
              onNotify={addToast}
            />
          </div>
        )}

        {/* DealSeek Hub (Prominently featured when in 'all' or 'dealseek') */}
        {(activeTab === 'all' || activeTab === 'dealseek') && (
          <DealSeekHub
            onLoadIntoCalculator={handleLoadFromDealSeek}
            onAddToCart={handleAddToCartFromDealSeek}
            onNotify={addToast}
          />
        )}

        {/* DG Penny Hub (Prominently featured when in 'all' or 'dg') */}
        {(activeTab === 'all' || activeTab === 'dg') && (
          <DGPennyHub
            onLoadIntoCalculator={handleLoadFromDG}
            onNotify={addToast}
          />
        )}

        {/* Turnover Watchlist (when in 'all' or 'watchlist') */}
        {(activeTab === 'all' || activeTab === 'watchlist') && (
          <TurnoverWatchlist
            onSelectItemForCalc={(name) => {
              setCalcPrefillData({ name, buy: '', sell: '', store: '' });
              if (activeTab === 'watchlist') setActiveTab('all');
              setTimeout(() => {
                document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }}
            onNotify={addToast}
          />
        )}

        {/* Arbitrage Calculator (when in 'all' or 'calc') */}
        {(activeTab === 'all' || activeTab === 'calc') && (
          <ArbitrageCalculator
            prefillData={calcPrefillData}
            onClearPrefill={() => setCalcPrefillData(null)}
            onAddItem={handleAddItem}
            onNotify={addToast}
          />
        )}

        {/* Cart Log / Sourcing List */}
        {(activeTab === 'all' || activeTab === 'calc') && (
          <CartLog
            items={items}
            onDeleteItem={handleDeleteItem}
            onClearAll={handleClearAll}
            onLoadSamples={handleLoadSamples}
            onNotify={addToast}
            onOpenReceiptScanner={() => setIsReceiptModalOpen(true)}
            onAutoCoupleCart={handleAutoCoupleEntireCart}
          />
        )}

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-[#92929d]/60 pb-16 sm:pb-6">
          <p>Penny Deals Hunter Pro V5 • Dollar General & Retail Arbitrage Sourcing</p>
        </footer>
      </main>

      {/* Floating In-Store Barcode Scanner Trigger Button */}
      <button
        type="button"
        onClick={() => setIsScannerOpen(true)}
        className="fixed bottom-5 right-5 z-40 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#ffd60a] hover:bg-[#ffc107] text-black font-black text-xs sm:text-sm rounded-full shadow-[0_8px_25px_rgba(255,214,10,0.45)] border-2 border-black/30 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        title="Open In-Store Barcode & Price Scanner"
      >
        <ScanLine className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="hidden xs:inline">Scan In-Store Barcode</span>
        <span className="xs:hidden">Scan</span>
      </button>

      {/* In-Store Barcode & Price Scanner Modal */}
      <InStoreBarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onLoadIntoCalculator={handleLoadFromDealSoldier}
        onAddToCart={handleAddToCartFromPokemon}
        onNotify={addToast}
        onOpenDiagnostic={(deal) => setSelectedDealForDiagnostic(deal)}
      />

      {/* OCR Receipt Scanner & Proof-of-Purchase COGS Digitizer Modal */}
      <ReceiptDigitizerModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onImportToCart={handleImportBatchToCart}
        onNotify={addToast}
      />

      {/* AI Deal Diagnostic & Risk Assessment Modal */}
      {selectedDealForDiagnostic && (
        <DealDiagnosticModal
          deal={selectedDealForDiagnostic}
          onClose={() => setSelectedDealForDiagnostic(null)}
          onAddToCart={(deal) => {
            handleAddToCartFromPokemon(deal);
            setSelectedDealForDiagnostic(null);
          }}
          onLoadIntoCalculator={(prefill) => {
            setCalcPrefillData(prefill);
            setSelectedDealForDiagnostic(null);
            setTimeout(() => {
              document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }}
        />
      )}

      {/* Floating Notifications */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}

