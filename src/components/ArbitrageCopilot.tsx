import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  DollarSign,
  Package,
  Layers,
  Calendar,
  Sparkles,
  Sliders,
  Maximize2,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  ShoppingBag,
  Clock,
  RotateCcw,
  Search,
} from 'lucide-react';
import { soundFx } from '../utils/audioFeedback';

export interface SourcingCriteria {
  minProfit: number;
  minRoi: number;
  maxSalesRank: number; // e.g. 150000
  shippingReserve: number; // e.g. $4.50
  packagingCost: number; // e.g. $0.75
  returnReservePct: number; // e.g. 3%
}

export interface CopilotProduct {
  upc: string;
  asin: string;
  title: string;
  brand: string;
  category: string;
  store: string;
  buyPrice: number;
  currentSellPrice: number;
  avg90DayPrice: number;
  avg30DayPrice: number;
  salesRank: number;
  categoryTotalItems: number;
  estMonthlySales: number;
  activeSellersCount: number;
  soldLast90Days: number;
  amazonOnListing: boolean;
  amazonBuyBoxPct: number;
  isHazmat: boolean;
  isMeltable: boolean;
  ipRisk: 'Low' | 'Medium' | 'High';
  priceHistory: { day: number; price: number; rank: number }[];
}

interface ArbitrageCopilotProps {
  zipCode: string;
  onAddToCart?: (deal: any) => void;
  onLoadIntoCalculator?: (deal: any) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  initialProduct?: Partial<CopilotProduct>;
}

const DEFAULT_CRITERIA: SourcingCriteria = {
  minProfit: 5.0,
  minRoi: 35.0,
  maxSalesRank: 150000,
  shippingReserve: 4.85,
  packagingCost: 0.65,
  returnReservePct: 3.0,
};

const SAMPLE_DATABASE: CopilotProduct[] = [
  {
    upc: '885911478294',
    asin: 'B08FBNW2G9',
    title: 'DeWalt 20V MAX XR Brushless 2-Tool Hammerdrill & Impact Combo Kit',
    brand: 'DeWalt',
    category: 'Tools & Home Improvement',
    store: "Lowe's",
    buyPrice: 89.02,
    currentSellPrice: 289.0,
    avg90DayPrice: 279.0,
    avg30DayPrice: 284.0,
    salesRank: 1420,
    categoryTotalItems: 450000,
    estMonthlySales: 410,
    activeSellersCount: 14,
    soldLast90Days: 1180,
    amazonOnListing: false,
    amazonBuyBoxPct: 0,
    isHazmat: true, // Lithium ion battery
    isMeltable: false,
    ipRisk: 'Medium',
    priceHistory: [
      { day: 90, price: 279, rank: 1650 },
      { day: 75, price: 279, rank: 1540 },
      { day: 60, price: 289, rank: 1400 },
      { day: 45, price: 284, rank: 1380 },
      { day: 30, price: 289, rank: 1450 },
      { day: 15, price: 289, rank: 1410 },
      { day: 1, price: 289, rank: 1420 },
    ],
  },
  {
    upc: '673419376976',
    asin: 'B0C7B8F9M1',
    title: 'LEGO Star Wars Ghost & Phantom II (75357) Starship Model Kit',
    brand: 'LEGO',
    category: 'Toys & Games',
    store: 'Target',
    buyPrice: 47.98,
    currentSellPrice: 179.99,
    avg90DayPrice: 169.99,
    avg30DayPrice: 174.99,
    salesRank: 3820,
    categoryTotalItems: 800000,
    estMonthlySales: 290,
    activeSellersCount: 22,
    soldLast90Days: 840,
    amazonOnListing: false,
    amazonBuyBoxPct: 0,
    isHazmat: false,
    isMeltable: false,
    ipRisk: 'Low',
    priceHistory: [
      { day: 90, price: 159.99, rank: 4500 },
      { day: 75, price: 164.99, rank: 4100 },
      { day: 60, price: 169.99, rank: 3950 },
      { day: 45, price: 174.99, rank: 3750 },
      { day: 30, price: 179.99, rank: 3800 },
      { day: 15, price: 179.99, rank: 3850 },
      { day: 1, price: 179.99, rank: 3820 },
    ],
  },
  {
    upc: '071234567890',
    asin: 'B09XY7811K',
    title: 'Holiday Ceramic Handcrafted LED Pumpkin Lantern Decor (1¢ DG Penny)',
    brand: 'DG Seasonal',
    category: 'Home & Kitchen',
    store: 'Dollar General',
    buyPrice: 0.01,
    currentSellPrice: 18.99,
    avg90DayPrice: 18.5,
    avg30DayPrice: 18.99,
    salesRank: 42100,
    categoryTotalItems: 1200000,
    estMonthlySales: 75,
    activeSellersCount: 4,
    soldLast90Days: 195,
    amazonOnListing: false,
    amazonBuyBoxPct: 0,
    isHazmat: false,
    isMeltable: false,
    ipRisk: 'Low',
    priceHistory: [
      { day: 90, price: 17.5, rank: 62000 },
      { day: 75, price: 17.99, rank: 54000 },
      { day: 60, price: 18.5, rank: 49000 },
      { day: 45, price: 18.5, rank: 45000 },
      { day: 30, price: 18.99, rank: 43000 },
      { day: 15, price: 18.99, rank: 42500 },
      { day: 1, price: 18.99, rank: 42100 },
    ],
  },
  {
    upc: '885609028912',
    asin: 'B0798FVV34',
    title: 'Dyson V8 Cordless Vacuum Slim (.04 Target Salvage Tag)',
    brand: 'Dyson',
    category: 'Home & Kitchen',
    store: 'Target',
    buyPrice: 125.04,
    currentSellPrice: 389.0,
    avg90DayPrice: 379.0,
    avg30DayPrice: 384.0,
    salesRank: 1150,
    categoryTotalItems: 1200000,
    estMonthlySales: 520,
    activeSellersCount: 9,
    soldLast90Days: 1480,
    amazonOnListing: true,
    amazonBuyBoxPct: 78,
    isHazmat: true,
    isMeltable: false,
    ipRisk: 'High', // Dyson brand protection
    priceHistory: [
      { day: 90, price: 379, rank: 1200 },
      { day: 75, price: 379, rank: 1180 },
      { day: 60, price: 389, rank: 1140 },
      { day: 45, price: 384, rank: 1160 },
      { day: 30, price: 389, rank: 1150 },
      { day: 15, price: 389, rank: 1130 },
      { day: 1, price: 389, rank: 1150 },
    ],
  },
];

export const ArbitrageCopilot: React.FC<ArbitrageCopilotProps> = ({
  zipCode,
  onAddToCart,
  onLoadIntoCalculator,
  onNotify,
  initialProduct,
}) => {
  const [criteria, setCriteria] = useState<SourcingCriteria>(() => {
    try {
      const saved = localStorage.getItem('pennyHunterSourcingCriteria');
      return saved ? JSON.parse(saved) : DEFAULT_CRITERIA;
    } catch {
      return DEFAULT_CRITERIA;
    }
  });

  const [selectedProductIdx, setSelectedProductIdx] = useState<number>(0);
  const [packQuantity, setPackQuantity] = useState<number>(1); // Multi-pack bundle selector
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentProduct = SAMPLE_DATABASE[selectedProductIdx];

  // Save criteria to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pennyHunterSourcingCriteria', JSON.stringify(criteria));
    } catch {
      // Ignore
    }
  }, [criteria]);

  // Current Date Check for Amazon Meltable Season (April 15 to October 15)
  const isSummerMeltablePeriod = useMemo(() => {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed: April is 3, Oct is 9
    const day = now.getDate();
    if (month > 3 && month < 9) return true; // May to Sept
    if (month === 3 && day >= 15) return true; // April 15+
    if (month === 9 && day <= 15) return true; // Oct 1-15
    return false;
  }, []);

  // Multi-Pack Adjusted Financial Engine (Fixes SellerAmp phantom profit defect by calculating REAL bank payouts)
  const financialAnalysis = useMemo(() => {
    const effectiveBuyCost = currentProduct.buyPrice * packQuantity;
    const effectiveSellPrice = currentProduct.currentSellPrice * (packQuantity === 1 ? 1 : packQuantity * 0.92); // multi-packs usually discounted slightly

    // Realistic Fee breakdown
    const marketplaceFee = effectiveSellPrice * 0.15; // 15% referral fee
    const shipping = criteria.shippingReserve + (packQuantity > 1 ? (packQuantity - 1) * 1.5 : 0);
    const packaging = criteria.packagingCost * (packQuantity > 1 ? 1.4 : 1.0);
    const returnReserve = (effectiveSellPrice * criteria.returnReservePct) / 100;

    // Total expenses
    const totalExpenses = effectiveBuyCost + marketplaceFee + shipping + packaging + returnReserve;
    const netProfit = effectiveSellPrice - totalExpenses;
    const roi = effectiveBuyCost > 0 ? (netProfit / effectiveBuyCost) * 100 : 0;

    // Maximum Purchase Price Ceiling (Reverse Calculator from Scoutify)
    // Formula: To achieve target minRoi, MaxBuy = (SellPrice - Fees - Ship - Pack - Returns) / (1 + minRoi/100)
    const netProceedsBeforeCOGS = effectiveSellPrice - marketplaceFee - shipping - packaging - returnReserve;
    const maxAllowableBuyPrice = Math.max(0, netProceedsBeforeCOGS / (1 + criteria.minRoi / 100));

    // Best Seller Rank (BSR) Percentile (from SellerAmp)
    const rankPercentile = (
      (currentProduct.salesRank / currentProduct.categoryTotalItems) *
      100
    ).toFixed(2);

    // eBay Terapeak Sell-Through Rate (STR)
    const sellThroughRate = Math.round(
      (currentProduct.soldLast90Days / Math.max(1, currentProduct.activeSellersCount * 8)) * 100
    );

    // Keepa Price Stability Check: Alert if today's price is >20% higher than 90-day average (price spike trap)
    const isPriceInflated = currentProduct.currentSellPrice > currentProduct.avg90DayPrice * 1.2;

    // Strict Decision Gate Evaluation
    const passedProfit = netProfit >= criteria.minProfit;
    const passedRoi = roi >= criteria.minRoi;
    const passedRank = currentProduct.salesRank <= criteria.maxSalesRank;
    const passedIP = currentProduct.ipRisk !== 'High';
    const passedMeltable = !currentProduct.isMeltable || !isSummerMeltablePeriod;
    const passedAmazon = !currentProduct.amazonOnListing || currentProduct.amazonBuyBoxPct < 70;

    const isBuy = passedProfit && passedRoi && passedRank && passedIP && passedMeltable && passedAmazon;

    return {
      effectiveBuyCost,
      effectiveSellPrice,
      marketplaceFee,
      shipping,
      packaging,
      returnReserve,
      netProfit,
      roi,
      maxAllowableBuyPrice,
      rankPercentile,
      sellThroughRate,
      isPriceInflated,
      isBuy,
      passedProfit,
      passedRoi,
      passedRank,
      passedIP,
      passedMeltable,
      passedAmazon,
    };
  }, [currentProduct, packQuantity, criteria, isSummerMeltablePeriod]);

  const handleBagCopilotDeal = () => {
    soundFx.playPennyJackpot();
    if (onAddToCart) {
      onAddToCart({
        title: `${currentProduct.title} ${packQuantity > 1 ? `(${packQuantity}-Pack Bundle)` : ''}`,
        buyPrice: financialAnalysis.effectiveBuyCost,
        sellPrice: financialAnalysis.effectiveSellPrice,
        store: currentProduct.store,
        category: currentProduct.category,
        notes: `Copilot Gate: ${financialAnalysis.isBuy ? 'BUY' : 'CAUTION'} • Top ${financialAnalysis.rankPercentile}% • STR: ${financialAnalysis.sellThroughRate}%`,
      });
    }
    onNotify(`Bagged "${currentProduct.title}" to Sourcing Cart!`, 'success');
  };

  return (
    <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-3.5 sm:p-5 mb-5 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/30">
              <Zap className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-[#f5f5f7] tracking-tight">
              Arbitrage Copilot & Keepa Intelligence Suite
            </h2>
          </div>
          <p className="text-xs text-[#92929d] mt-1">
            Combines SellerAmp BSR velocity, Keepa 90-day price stability, Scoutify BUY/PASS gates, and true bank-deposit profit accounting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Multi-Pack Bundle Switcher */}
          <div className="flex items-center bg-[#121215] border border-[#2c2c35] rounded-xl p-0.5 text-xs font-bold">
            {[1, 2, 3, 4].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => {
                  setPackQuantity(qty);
                  soundFx.playStandardScan();
                }}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  packQuantity === qty
                    ? 'bg-[#ffd60a] text-black font-black shadow-sm'
                    : 'text-[#92929d] hover:text-[#f5f5f7]'
                }`}
              >
                {qty}x Pack
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#ffd60a] border border-[#2c2c35] transition-colors cursor-pointer"
            title="Adjust Custom Sourcing Thresholds"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Customizable Thresholds Settings Panel */}
      {showSettings && (
        <div className="p-3.5 bg-[#121215] border border-[#ffd60a]/30 rounded-xl space-y-3 text-xs animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#ffd60a] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Custom Sourcing Gates (Scoutify & SellerAmp Standards)
            </span>
            <button
              type="button"
              onClick={() => setCriteria(DEFAULT_CRITERIA)}
              className="text-[10px] text-[#92929d] hover:text-[#ffd60a] flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Defaults
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <div>
              <label className="text-[10px] text-[#92929d] font-bold block mb-1">Min Profit ($)</label>
              <input
                type="number"
                step="0.5"
                value={criteria.minProfit}
                onChange={(e) => setCriteria({ ...criteria, minProfit: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#18181c] border border-[#2c2c35] rounded-lg p-1.5 text-xs text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#92929d] font-bold block mb-1">Min ROI (%)</label>
              <input
                type="number"
                step="5"
                value={criteria.minRoi}
                onChange={(e) => setCriteria({ ...criteria, minRoi: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#18181c] border border-[#2c2c35] rounded-lg p-1.5 text-xs text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#92929d] font-bold block mb-1">Max Sales Rank</label>
              <input
                type="number"
                step="10000"
                value={criteria.maxSalesRank}
                onChange={(e) => setCriteria({ ...criteria, maxSalesRank: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-[#18181c] border border-[#2c2c35] rounded-lg p-1.5 text-xs text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#92929d] font-bold block mb-1">Outbound Shipping</label>
              <input
                type="number"
                step="0.25"
                value={criteria.shippingReserve}
                onChange={(e) => setCriteria({ ...criteria, shippingReserve: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#18181c] border border-[#2c2c35] rounded-lg p-1.5 text-xs text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#92929d] font-bold block mb-1">Packaging Box/Poly</label>
              <input
                type="number"
                step="0.1"
                value={criteria.packagingCost}
                onChange={(e) => setCriteria({ ...criteria, packagingCost: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#18181c] border border-[#2c2c35] rounded-lg p-1.5 text-xs text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#92929d] font-bold block mb-1">Return Reserve %</label>
              <input
                type="number"
                step="1"
                value={criteria.returnReservePct}
                onChange={(e) => setCriteria({ ...criteria, returnReservePct: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#18181c] border border-[#2c2c35] rounded-lg p-1.5 text-xs text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Product Switcher Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {SAMPLE_DATABASE.map((item, idx) => {
          const isSelected = idx === selectedProductIdx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedProductIdx(idx);
                soundFx.playStandardScan();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-[#222227] text-[#ffd60a] border-[#ffd60a] shadow-sm font-black'
                  : 'bg-[#121215] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7]'
              }`}
            >
              {item.brand} ({item.store})
            </button>
          );
        })}
      </div>

      {/* MAIN COPILOT CARD */}
      <div className="bg-[#121215] border border-[#2c2c35] rounded-xl p-4 space-y-4">
        {/* Top Product Identity & Instant Buy/Pass Gate */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#222227] text-[#0a84ff] font-mono font-bold">
                {currentProduct.asin}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#222227] text-[#ffd60a] font-mono">
                UPC: {currentProduct.upc}
              </span>
              <span className="text-xs text-[#92929d]">{currentProduct.category}</span>
            </div>
            <h3 className="text-base font-black text-[#f5f5f7] mt-1.5">
              {currentProduct.title}
            </h3>
            {packQuantity > 1 && (
              <span className="inline-block mt-1 text-[11px] font-bold text-[#30d158] bg-[#30d158]/15 px-2 py-0.5 rounded-md border border-[#30d158]/30">
                📦 Multi-Pack Active: Selling as a {packQuantity}-Pack Bundle
              </span>
            )}
          </div>

          {/* Instant Scoutify-Style Decision Gate Banner */}
          <div className="shrink-0">
            {financialAnalysis.isBuy ? (
              <div className="px-3.5 py-2 rounded-xl bg-[#30d158]/20 border-2 border-[#30d158] text-[#30d158] flex items-center gap-2 shadow-lg shadow-[#30d158]/10">
                <CheckCircle2 className="w-5 h-5 fill-current text-black" />
                <div>
                  <span className="text-xs font-black tracking-wide block uppercase">
                    STRONG BUY
                  </span>
                  <span className="text-[10px] text-[#30d158]/90 font-bold block">
                    Meets all profit & velocity criteria
                  </span>
                </div>
              </div>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-[#ff453a]/20 border-2 border-[#ff453a] text-[#ff453a] flex items-center gap-2 shadow-lg shadow-[#ff453a]/10">
                <XCircle className="w-5 h-5 fill-current text-black" />
                <div>
                  <span className="text-xs font-black tracking-wide block uppercase">
                    CAUTION / PASS
                  </span>
                  <span className="text-[10px] text-[#ff453a]/90 font-bold block">
                    Failed threshold checklist
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4-COLUMN KPI RADAR (SellerAmp + Keepa + Terapeak Metrics) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* BSR & Velocity (SellerAmp metric) */}
          <div className="p-3 bg-[#18181c] rounded-xl border border-[#2c2c35]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#92929d] uppercase font-bold">BSR Percentile</span>
              <Flame className="w-3 h-3 text-[#ff9f0a]" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-black text-[#ffd60a] font-mono">
                Top {financialAnalysis.rankPercentile}%
              </span>
            </div>
            <span className="text-[10px] text-[#92929d] block mt-0.5">
              Rank #{currentProduct.salesRank.toLocaleString()} (~{currentProduct.estMonthlySales} sales/mo)
            </span>
          </div>

          {/* Sell-Through Rate (eBay Terapeak metric) */}
          <div className="p-3 bg-[#18181c] rounded-xl border border-[#2c2c35]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#92929d] uppercase font-bold">Sell-Through (STR)</span>
              <TrendingUp className="w-3 h-3 text-[#30d158]" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-black text-[#30d158] font-mono">
                {financialAnalysis.sellThroughRate}%
              </span>
            </div>
            <span className="text-[10px] text-[#92929d] block mt-0.5">
              {currentProduct.soldLast90Days} solds / {currentProduct.activeSellersCount} sellers
            </span>
          </div>

          {/* Real Net Bank Deposit Profit (SellerAmp True Net) */}
          <div className="p-3 bg-[#18181c] rounded-xl border border-[#2c2c35]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#92929d] uppercase font-bold">True Net Payout</span>
              <DollarSign className="w-3 h-3 text-[#30d158]" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-black text-[#30d158] font-mono">
                +${financialAnalysis.netProfit.toFixed(2)}
              </span>
              <span className="text-[10px] text-[#30d158] font-bold">
                ({financialAnalysis.roi.toFixed(0)}% ROI)
              </span>
            </div>
            <span className="text-[10px] text-[#92929d] block mt-0.5">
              Buy: ${financialAnalysis.effectiveBuyCost.toFixed(2)} • Sell: ${financialAnalysis.effectiveSellPrice.toFixed(2)}
            </span>
          </div>

          {/* Max Buy Price Ceiling (Scoutify target ceiling) */}
          <div className="p-3 bg-[#18181c] rounded-xl border border-[#2c2c35]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#92929d] uppercase font-bold">Max Buy Price</span>
              <Sparkles className="w-3 h-3 text-[#0a84ff]" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-base font-black text-[#0a84ff] font-mono">
                ${financialAnalysis.maxAllowableBuyPrice.toFixed(2)}
              </span>
            </div>
            <span className="text-[10px] text-[#92929d] block mt-0.5">
              Ceiling to keep ≥{criteria.minRoi}% ROI
            </span>
          </div>
        </div>

        {/* INTERACTIVE KEEPA PRICE & RANK SPARKLINE GRAPH */}
        <div className="p-3.5 bg-[#18181c] rounded-xl border border-[#2c2c35] space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-bold text-[#92929d] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0a84ff]" />
              Keepa 90-Day Price Stability & Rank Trend
            </span>

            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1 bg-[#0a84ff] rounded" /> Sale Price
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-1 bg-[#ffd60a] rounded" /> In-Store Clearance Cost
              </span>
              <span className="text-[#92929d]">
                90d Avg: <strong className="text-[#f5f5f7] font-mono">${currentProduct.avg90DayPrice}</strong>
              </span>
            </div>
          </div>

          {/* SVG Price Stability Curve */}
          <div className="relative w-full h-24 bg-[#121215] rounded-lg border border-[#222227] p-2 flex items-center justify-center">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
              {/* Horizontal Reference Line for 90d Average */}
              <line x1="0" y1="20" x2="100" y2="20" stroke="#2c2c35" strokeDasharray="2" strokeWidth="0.8" />

              {/* Price Line Curve */}
              <polyline
                fill="none"
                stroke="#0a84ff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,24 16,23 33,18 50,19 66,16 83,16 100,16"
              />

              {/* In-Store Buy Price Flat Baseline */}
              <line x1="0" y1="36" x2="100" y2="36" stroke="#ffd60a" strokeWidth="2" strokeDasharray="3" />
            </svg>

            {/* Sparkline Points Overlay */}
            <div className="absolute inset-x-3 bottom-1 flex justify-between text-[9px] font-mono text-[#92929d]">
              <span>90d Ago (${currentProduct.priceHistory[0].price})</span>
              <span>60d Ago</span>
              <span>30d Ago</span>
              <span className="text-[#0a84ff] font-bold">Today (${currentProduct.currentSellPrice})</span>
            </div>
          </div>

          {/* Price Inflation Alert if applicable */}
          {financialAnalysis.isPriceInflated && (
            <div className="p-2 bg-[#ff9f0a]/15 border border-[#ff9f0a]/30 rounded-lg flex items-center gap-2 text-xs text-[#ff9f0a]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>Warning:</strong> Current price (${currentProduct.currentSellPrice}) is over 20% higher than the 90-day average (${currentProduct.avg90DayPrice}). Price may tank when other sellers restock!
              </span>
            </div>
          )}
        </div>

        {/* RISK & RESTRICTIONS RADAR BANNERS (Meltable, Hazmat, IP, Amazon Buy Box) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {/* IP Claim Risk */}
          <div className="p-2.5 bg-[#18181c] rounded-xl border border-[#2c2c35] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#92929d] uppercase font-bold block">Brand IP Claim Risk</span>
              <span
                className={`font-bold ${
                  currentProduct.ipRisk === 'High'
                    ? 'text-[#ff453a]'
                    : currentProduct.ipRisk === 'Medium'
                    ? 'text-[#ff9f0a]'
                    : 'text-[#30d158]'
                }`}
              >
                {currentProduct.ipRisk} Risk ({currentProduct.brand})
              </span>
            </div>
            <ShieldAlert
              className={`w-4 h-4 ${
                currentProduct.ipRisk === 'High' ? 'text-[#ff453a]' : 'text-[#30d158]'
              }`}
            />
          </div>

          {/* Amazon Buy Box Dominance */}
          <div className="p-2.5 bg-[#18181c] rounded-xl border border-[#2c2c35] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#92929d] uppercase font-bold block">Amazon On Listing</span>
              <span className={`font-bold ${currentProduct.amazonOnListing ? 'text-[#ff9f0a]' : 'text-[#30d158]'}`}>
                {currentProduct.amazonOnListing
                  ? `Yes (${currentProduct.amazonBuyBoxPct}% BuyBox)`
                  : 'No (3rd Party Sellers Only)'}
              </span>
            </div>
            <Package className="w-4 h-4 text-[#92929d]" />
          </div>

          {/* Hazmat & Meltable Seasonal Status */}
          <div className="p-2.5 bg-[#18181c] rounded-xl border border-[#2c2c35] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#92929d] uppercase font-bold block">Hazmat & Meltable</span>
              <span
                className={`font-bold ${
                  currentProduct.isHazmat || currentProduct.isMeltable ? 'text-[#ff9f0a]' : 'text-[#30d158]'
                }`}
              >
                {currentProduct.isHazmat
                  ? 'Hazmat (Lithium Battery)'
                  : currentProduct.isMeltable
                  ? 'Meltable (Summer Rule)'
                  : 'Standard FBA Ready'}
              </span>
            </div>
            <Calendar className="w-4 h-4 text-[#92929d]" />
          </div>
        </div>

        {/* Action Footer Bar */}
        <div className="pt-2 border-t border-[#2c2c35] flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11px] text-[#92929d]">
            <span>Break-even Price: </span>
            <strong className="text-[#ffd60a] font-mono">
              ${(
                financialAnalysis.effectiveBuyCost +
                financialAnalysis.marketplaceFee +
                financialAnalysis.shipping +
                financialAnalysis.packaging
              ).toFixed(2)}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            {onLoadIntoCalculator && (
              <button
                type="button"
                onClick={() =>
                  onLoadIntoCalculator({
                    title: currentProduct.title,
                    buyPrice: financialAnalysis.effectiveBuyCost,
                    sellPrice: financialAnalysis.effectiveSellPrice,
                    store: currentProduct.store,
                  })
                }
                className="px-3 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#92929d] hover:text-[#f5f5f7] flex items-center gap-1 transition-colors cursor-pointer border border-[#2c2c35]"
              >
                <DollarSign className="w-3.5 h-3.5 text-[#30d158]" />
                <span>Calculator</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleBagCopilotDeal}
              className="px-4 py-1.5 rounded-xl bg-[#30d158] hover:bg-[#28b84c] text-black font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Bag Item {packQuantity > 1 ? `(${packQuantity}x)` : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
