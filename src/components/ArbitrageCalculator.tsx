import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Barcode,
  Search,
  RotateCcw,
  Sparkles,
  DollarSign,
  TrendingUp,
  Percent,
  PlusCircle,
  ExternalLink,
  Zap,
  Scissors,
  CheckCircle2,
} from 'lucide-react';
import { SourcingItem } from '../types';
import { autoCoupleCustomItem } from '../data/autoCouplerData';
import { soundFx } from '../utils/audioFeedback';

export interface CalcPrefillData {
  name?: string;
  buy?: string;
  sell?: string;
  store?: string;
}

interface ArbitrageCalculatorProps {
  prefillData?: CalcPrefillData | null;
  onClearPrefill: () => void;
  onAddItem: (item: Omit<SourcingItem, 'id' | 'timestamp'>) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const ArbitrageCalculator: React.FC<ArbitrageCalculatorProps> = ({
  prefillData,
  onClearPrefill,
  onAddItem,
  onNotify,
}) => {
  const [itemName, setItemName] = useState('');
  const [buyCost, setBuyCost] = useState('');
  const [estSell, setEstSell] = useState('');
  const [shipping, setShipping] = useState('4.50');
  const [feePct, setFeePct] = useState('0.15');
  const [customFee, setCustomFee] = useState('');
  const [isCustomFee, setIsCustomFee] = useState(false);
  const [store, setStore] = useState('Dollar General');
  const [autoCoupledSavings, setAutoCoupledSavings] = useState<{
    originalPrice: number;
    saved: number;
    layers: string[];
  } | null>(null);

  // Handle pre-fill from watchlist or DG Penny Hub
  useEffect(() => {
    if (prefillData) {
      if (prefillData.name !== undefined) setItemName(prefillData.name);
      if (prefillData.buy !== undefined) setBuyCost(prefillData.buy);
      if (prefillData.sell !== undefined) setEstSell(prefillData.sell);
      if (prefillData.store !== undefined) setStore(prefillData.store);
      onClearPrefill();
    }
  }, [prefillData, onClearPrefill]);

  // Calculations
  const buyNum = parseFloat(buyCost) || 0;
  const sellNum = parseFloat(estSell) || 0;
  const shipNum = parseFloat(shipping) || 0;
  const activeFeePct = isCustomFee ? (parseFloat(customFee) || 0) / 100 : parseFloat(feePct) || 0;

  const feeAmount = sellNum * activeFeePct;
  const netProfit = sellNum - buyNum - shipNum - feeAmount;
  const roi = buyNum > 0 ? (netProfit / buyNum) * 100 : 0;
  const profitMargin = sellNum > 0 ? (netProfit / sellNum) * 100 : 0;
  // Breakeven: sell * (1 - feePct) = buy + ship => sell = (buy + ship) / (1 - feePct)
  const breakevenSell = activeFeePct < 1 ? (buyNum + shipNum) / (1 - activeFeePct) : 0;

  const handleSetPenny = () => {
    setBuyCost('0.01');
    onNotify('Penny deal cost set: $0.01 🪙', 'success');
  };

  const handleReset = () => {
    setItemName('');
    setBuyCost('');
    setEstSell('');
    setShipping('4.50');
    setFeePct('0.15');
    setIsCustomFee(false);
    setAutoCoupledSavings(null);
    onNotify('Calculator reset', 'info');
  };

  const handleAutoCouple = () => {
    if (buyNum <= 0) {
      onNotify('Please enter a Buy Cost to auto-couple coupons against.', 'error');
      return;
    }
    const result = autoCoupleCustomItem(itemName || 'Arbitrage Item', buyNum, store);
    setAutoCoupledSavings({
      originalPrice: buyNum,
      saved: result.totalSaved,
      layers: result.appliedLayers.map((l) => `${l.name} (-$${l.discountValue.toFixed(2)})`),
    });
    setBuyCost(result.finalPrice.toFixed(2));
    if (!estSell && result.coupledDeal.estResalePrice) {
      setEstSell(result.coupledDeal.estResalePrice.toFixed(2));
    }
    soundFx.playCashRegister();
    onNotify(
      `⚡ Auto-coupled $${result.totalSaved.toFixed(2)} in stacked savings! Net buy cost is now $${result.finalPrice.toFixed(2)}`,
      'success'
    );
  };

  const handleRevertCoupons = () => {
    if (autoCoupledSavings) {
      setBuyCost(autoCoupledSavings.originalPrice.toFixed(2));
      setAutoCoupledSavings(null);
      onNotify('Reverted back to pre-coupon price.', 'info');
    }
  };

  const handleLogItem = () => {
    const label = itemName.trim() || 'Unlabeled Item';
    if (buyNum === 0 && sellNum === 0) {
      onNotify('Please enter buy and sell amounts first.', 'error');
      return;
    }

    const todayStr = new Date().toLocaleDateString();
    onAddItem({
      date: todayStr,
      label: label.replace(/,/g, ''),
      buy: buyNum,
      sell: sellNum,
      ship: shipNum,
      feePct: activeFeePct,
      profit: netProfit.toFixed(2),
      roi: roi.toFixed(0),
      store,
    });

    setItemName('');
    setBuyCost('');
    setEstSell('');
    onNotify(`Added "${label}" to sourcing list!`, 'success');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogItem();
    }
  };

  // Color logic matching original:
  // netProfit >= 0 ? var(--success) : var(--danger)
  // roi >= 30 ? var(--success) : roi > 0 ? var(--text-main) : var(--danger)
  const profitColorClass = netProfit >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]';
  const roiColorClass =
    roi >= 30 ? 'text-[#34c759]' : roi > 0 ? 'text-[#f5f5f7]' : 'text-[#ff3b30]';

  return (
    <div
      id="calculator"
      className="bg-[#18181c] p-4 sm:p-5 rounded-2xl mb-4 border-2 border-[#ff9800] shadow-xl relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base sm:text-lg font-bold text-[#ff9800] flex items-center gap-2 m-0">
          <span>🧮</span> Arbitrage Calculator
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] transition-colors border border-[#2c2c35] text-xs flex items-center gap-1"
            title="Reset fields"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Item Name / UPC Input */}
      <div className="relative mb-3">
        <input
          type="text"
          id="calcItemName"
          placeholder="Item Name / UPC Code"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-3.5 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] text-sm sm:text-base focus:border-[#ff9800] outline-none transition-colors pr-20"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {itemName.trim() && (
            <a
              href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(itemName)}&LH_Sold=1&LH_Complete=1`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-[#92929d] hover:text-[#ff9800] rounded-lg hover:bg-[#18181c] transition-colors"
              title="Look up eBay Sold Comps"
            >
              <Search className="w-4 h-4" />
            </a>
          )}
          <span className="text-[#92929d]/60">
            <Barcode className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Buy Cost & Est Sell */}
      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="calcBuy"
              className="text-[11px] font-semibold text-[#92929d] uppercase tracking-wider"
            >
              BUY COST ($)
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAutoCouple}
                className="text-[10px] text-black font-black flex items-center gap-0.5 bg-gradient-to-r from-[#ffd60a] to-[#ff9f0a] hover:from-[#ffc107] hover:to-[#ff8800] px-2 py-0.5 rounded shadow-sm cursor-pointer transition-transform active:scale-95"
                title="Automatically stack digital coupons, store perks, and cash back rebates"
              >
                <Zap className="w-2.5 h-2.5 fill-current" /> Auto-Couple
              </button>
              <button
                type="button"
                onClick={handleSetPenny}
                className="text-[10px] text-[#ff9800] font-bold hover:underline flex items-center gap-0.5 bg-[#ff9800]/10 px-1.5 py-0.5 rounded border border-[#ff9800]/30"
                title="Set Buy Cost to 1 Cent"
              >
                <Sparkles className="w-2.5 h-2.5" /> 1¢ Penny
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type="number"
              id="calcBuy"
              step="any"
              min="0"
              placeholder="0.00"
              value={buyCost}
              onChange={(e) => {
                setBuyCost(e.target.value);
                if (autoCoupledSavings) setAutoCoupledSavings(null);
              }}
              onKeyDown={handleKeyDown}
              className="w-full px-3.5 py-3 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] text-base font-semibold focus:border-[#ff9800] outline-none"
            />
          </div>
          {/* Auto-Coupled Savings Banner */}
          {autoCoupledSavings && (
            <div className="mt-1.5 p-2 bg-[#30d158]/10 border border-[#30d158]/30 rounded-lg text-[11px] text-[#30d158] flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 truncate">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="font-bold">
                  Coupled -${autoCoupledSavings.saved.toFixed(2)} savings!
                </span>
                <span className="text-[10px] text-[#92929d] truncate">
                  ({autoCoupledSavings.layers.length} layers)
                </span>
              </div>
              <button
                type="button"
                onClick={handleRevertCoupons}
                className="text-[10px] underline hover:text-white shrink-0 cursor-pointer"
              >
                Revert
              </button>
            </div>
          )}
          {/* Quick presets */}
          <div className="flex gap-1 mt-1.5">
            {['0.01', '1.00', '5.00', '10.00'].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setBuyCost(amt)}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono border transition-colors ${
                  buyCost === amt
                    ? 'bg-[#ff9800] text-black border-[#ff9800] font-bold'
                    : 'bg-[#222227] text-[#92929d] border-[#2c2c35] hover:text-white'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="calcSell"
            className="text-[11px] font-semibold text-[#92929d] uppercase tracking-wider block mb-1"
          >
            EST SELL ($)
          </label>
          <input
            type="number"
            id="calcSell"
            step="any"
            min="0"
            placeholder="0.00"
            value={estSell}
            onChange={(e) => setEstSell(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3.5 py-3 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] text-base font-semibold focus:border-[#ff9800] outline-none"
          />
          {/* Quick presets */}
          <div className="flex gap-1 mt-1.5">
            {['15.00', '25.00', '40.00', '60.00'].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setEstSell(amt)}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono border transition-colors ${
                  estSell === amt
                    ? 'bg-[#ff9800] text-black border-[#ff9800] font-bold'
                    : 'bg-[#222227] text-[#92929d] border-[#2c2c35] hover:text-white'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Shipping & Platform Fee */}
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div>
          <label
            htmlFor="calcShip"
            className="text-[11px] font-semibold text-[#92929d] uppercase tracking-wider block mb-1"
          >
            SHIPPING ($)
          </label>
          <input
            type="number"
            id="calcShip"
            step="any"
            min="0"
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3.5 py-3 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] text-base focus:border-[#ff9800] outline-none font-mono"
          />
          <div className="flex gap-1 mt-1.5">
            {[
              { label: '$0 Free/Local', val: '0' },
              { label: '$4.50 Grd', val: '4.50' },
              { label: '$8.50 Flat', val: '8.50' },
            ].map((s) => (
              <button
                key={s.val}
                type="button"
                onClick={() => setShipping(s.val)}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                  shipping === s.val
                    ? 'bg-[#0a84ff] text-white border-[#0a84ff]'
                    : 'bg-[#222227] text-[#92929d] border-[#2c2c35] hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="calcFee"
            className="text-[11px] font-semibold text-[#92929d] uppercase tracking-wider block mb-1"
          >
            FEE
          </label>
          <select
            id="calcFee"
            value={isCustomFee ? 'custom' : feePct}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setIsCustomFee(true);
              } else {
                setIsCustomFee(false);
                setFeePct(e.target.value);
              }
            }}
            className="w-full px-3 py-3 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] text-sm focus:border-[#ff9800] outline-none"
          >
            <option value="0.15">15% (Standard eBay/Mercari)</option>
            <option value="0.13">13% (eBay Base)</option>
            <option value="0.10">10% (Low Fee)</option>
            <option value="0.00">0% (Local/Cash)</option>
            <option value="custom">Custom %...</option>
          </select>

          {isCustomFee && (
            <div className="mt-1.5 flex items-center gap-1">
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                placeholder="Fee %"
                value={customFee}
                onChange={(e) => setCustomFee(e.target.value)}
                className="w-full px-2.5 py-1 bg-[#222227] border border-[#2c2c35] rounded-lg text-xs text-[#f5f5f7] focus:border-[#ff9800] outline-none font-mono"
              />
              <span className="text-xs text-[#92929d]">%</span>
            </div>
          )}

          <div className="mt-1.5 text-[10px] text-[#92929d]">
            Fee Cost: ${(sellNum * activeFeePct).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Store tag selection */}
      <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] text-[#92929d] whitespace-nowrap font-medium">Store:</span>
        {['Dollar General', 'Target', 'Walmart', 'Home Depot', "Lowe's", 'TJ Maxx', 'Thrift'].map(
          (s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStore(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap border transition-all ${
                store === s
                  ? 'bg-[#ff9800]/20 text-[#ff9800] border-[#ff9800] font-semibold'
                  : 'bg-[#222227] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7]'
              }`}
            >
              {s}
            </button>
          )
        )}
      </div>

      {/* Results Box */}
      <div
        id="calcResults"
        className="bg-[#222227] p-3.5 rounded-xl mb-3 border border-[#2c2c35] flex flex-col gap-2"
      >
        <div className="flex items-center justify-between text-sm sm:text-base">
          <div className="flex items-center gap-1.5">
            <span className="text-[#92929d] font-medium">Net Profit:</span>
            <span
              id="resProfit"
              className={`font-extrabold text-lg sm:text-xl font-mono ${profitColorClass}`}
            >
              ${netProfit.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#92929d] font-medium">ROI:</span>
            <span
              id="resROI"
              className={`font-extrabold text-lg sm:text-xl font-mono ${roiColorClass}`}
            >
              {roi.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-2 pt-2 border-t border-[#2c2c35] text-[11px] text-[#92929d]">
          <div>
            <span>Margin: </span>
            <span className="font-semibold text-[#f5f5f7]">
              {sellNum > 0 ? `${profitMargin.toFixed(1)}%` : '0%'}
            </span>
          </div>
          <div className="text-right">
            <span>Breakeven Sell: </span>
            <span className="font-semibold font-mono text-[#f5f5f7]">
              ${breakevenSell > 0 ? breakevenSell.toFixed(2) : '0.00'}
            </span>
          </div>
        </div>
      </div>

      {/* Log Button */}
      <button
        type="button"
        onClick={handleLogItem}
        className="w-full py-3.5 bg-[#34c759] hover:bg-[#2fb34f] text-black font-extrabold text-base rounded-xl transition-transform active:scale-[0.97] cursor-pointer shadow-lg flex items-center justify-center gap-2"
      >
        <PlusCircle className="w-5 h-5 text-black" />
        <span>📥 Log to Sourcing List</span>
      </button>
    </div>
  );
};
