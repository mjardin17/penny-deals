import React, { useState } from 'react';
import {
  Download,
  Trash2,
  Search,
  ExternalLink,
  Share2,
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  X,
  Copy,
  Receipt,
  MapPin,
  Zap,
} from 'lucide-react';
import { SourcingItem } from '../types';

interface CartLogProps {
  items: SourcingItem[];
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onLoadSamples: () => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenReceiptScanner?: () => void;
  onAutoCoupleCart?: () => void;
}

export const CartLog: React.FC<CartLogProps> = ({
  items,
  onDeleteItem,
  onClearAll,
  onLoadSamples,
  onNotify,
  onOpenReceiptScanner,
  onAutoCoupleCart,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmWipe, setShowConfirmWipe] = useState(false);
  const [filterStore, setFilterStore] = useState<string>('all');

  // Aggregated stats
  const totalBuy = items.reduce((sum, item) => sum + (Number(item.buy) || 0), 0);
  const totalSell = items.reduce((sum, item) => sum + (Number(item.sell) || 0), 0);
  const totalProfit = items.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);
  const avgROI = totalBuy > 0 ? ((totalProfit / totalBuy) * 100).toFixed(0) : '0';

  // Filtering
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.store && item.store.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStore = filterStore === 'all' || item.store === filterStore;
    return matchesSearch && matchesStore;
  });

  const exportCSV = () => {
    if (items.length === 0) {
      onNotify('Nothing to export.', 'error');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Item Label,Buy Cost,Est Sell,Shipping Cost,Fee Pct,Net Profit,ROI %\n';

    items.forEach((row) => {
      const cleanLabel = (row.label || '').replace(/,/g, '');
      csvContent += `${row.date},${cleanLabel},${row.buy},${row.sell},${row.ship},${row.feePct},${row.profit},${row.roi}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Sourcing_Log_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onNotify(`Exported ${items.length} items to CSV!`, 'success');
  };

  const handleCopySummary = async () => {
    if (items.length === 0) return;
    const summary = `🛒 Penny Hunter Pro Sourcing Run (${new Date().toLocaleDateString()}):
Total Items: ${items.length}
Invested: $${totalBuy.toFixed(2)}
Est. Revenue: $${totalSell.toFixed(2)}
Est. Net Profit: $${totalProfit.toFixed(2)}
Avg ROI: ${avgROI}%

Items:
${items.map((it) => `- ${it.label}: Buy $${it.buy.toFixed(2)} -> Sell $${it.sell.toFixed(2)} (+$${it.profit} | ${it.roi}% ROI)`).join('\n')}`;

    try {
      await navigator.clipboard.writeText(summary);
      onNotify('Copied sourcing summary to clipboard!', 'success');
    } catch {
      onNotify('Failed to copy summary', 'error');
    }
  };

  const storesInLog = Array.from(
    new Set(items.map((i) => i.store).filter(Boolean) as string[])
  );

  return (
    <div id="sessionLog" className="bg-[#18181c] p-4 sm:p-5 rounded-2xl border border-[#2c2c35] shadow-lg">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-bold text-[#f5f5f7] m-0 flex items-center gap-2">
            <span>📋</span> Cart Log
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#222227] text-[#92929d] border border-[#2c2c35] font-mono">
            {items.length} items
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {items.length > 0 && onAutoCoupleCart && (
            <button
              type="button"
              onClick={onAutoCoupleCart}
              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#ffd60a] to-[#ff9f0a] hover:from-[#ffc107] hover:to-[#ff8800] text-black text-xs font-black flex items-center gap-1 shadow-sm transition-transform active:scale-95 cursor-pointer"
              title="Automatically scan cart items for stackable store coupons, digital manufacturer clips, and rebates"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Auto-Couple Cart</span>
            </button>
          )}

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-2.5 py-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] text-xs font-semibold border border-[#2c2c35] flex items-center gap-1 transition-colors"
              title="Copy text summary"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          {onOpenReceiptScanner && (
            <button
              type="button"
              onClick={onOpenReceiptScanner}
              className="px-2.5 py-1.5 rounded-lg bg-[#ffd60a]/15 hover:bg-[#ffd60a]/25 text-[#ffd60a] hover:text-[#ffc107] text-xs font-bold border border-[#ffd60a]/40 flex items-center gap-1 transition-colors cursor-pointer"
              title="Digitize physical paper receipt or clearance slip"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>OCR Receipt</span>
            </button>
          )}

          <button
            type="button"
            onClick={exportCSV}
            disabled={items.length === 0}
            className="px-3 py-1.5 rounded-lg bg-[#0a84ff] hover:bg-[#0070df] text-white font-bold text-xs flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            title="Download CSV file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>⬇️ CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmWipe(true)}
            disabled={items.length === 0}
            className="px-2.5 py-1.5 rounded-lg bg-[#ff3b30]/15 hover:bg-[#ff3b30]/25 text-[#ff3b30] font-bold text-xs border border-[#ff3b30]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Wipe current log"
          >
            Wipe
          </button>
        </div>
      </div>

      {/* Summary KPI Cards if items exist */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3.5 p-3 rounded-xl bg-[#222227] border border-[#2c2c35]">
          <div>
            <span className="text-[10px] text-[#92929d] uppercase font-semibold block">Total Invested</span>
            <span className="text-sm sm:text-base font-bold text-[#f5f5f7] font-mono">
              ${totalBuy.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#92929d] uppercase font-semibold block">Est. Revenue</span>
            <span className="text-sm sm:text-base font-bold text-[#f5f5f7] font-mono">
              ${totalSell.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#92929d] uppercase font-semibold block">Est. Net Profit</span>
            <span
              className={`text-sm sm:text-base font-extrabold font-mono ${
                totalProfit >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'
              }`}
            >
              ${totalProfit.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#92929d] uppercase font-semibold block">Average ROI</span>
            <span
              className={`text-sm sm:text-base font-extrabold font-mono ${
                Number(avgROI) >= 30 ? 'text-[#34c759]' : 'text-[#ff9800]'
              }`}
            >
              {avgROI}%
            </span>
          </div>
        </div>
      )}

      {/* Search & store filters if multiple items */}
      {items.length > 2 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-3.5 h-3.5 text-[#92929d] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search cart..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#222227] border border-[#2c2c35] rounded-lg text-xs text-[#f5f5f7] focus:border-[#ff9800] outline-none"
            />
          </div>
          {storesInLog.length > 1 && (
            <select
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              className="px-2 py-1.5 bg-[#222227] border border-[#2c2c35] rounded-lg text-xs text-[#92929d] focus:border-[#ff9800] outline-none"
            >
              <option value="all">All Stores</option>
              {storesInLog.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Item List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-6 px-4 rounded-xl bg-[#222227]/50 border border-dashed border-[#2c2c35]">
            <Package className="w-8 h-8 text-[#92929d]/50 mx-auto mb-2" />
            <p className="text-sm text-[#92929d] font-medium mb-2">No items logged yet.</p>
            <p className="text-xs text-[#92929d]/70 max-w-xs mx-auto mb-3">
              Calculate deals above and hit "Log to Sourcing List" to keep a running cart of your haul.
            </p>
            <button
              type="button"
              onClick={onLoadSamples}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#ff9800] font-semibold border border-[#ff9800]/40 transition-colors inline-flex items-center gap-1.5"
            >
              <span>✨ Load Example Sourcing Items</span>
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-4 text-xs text-[#92929d]">
            No items matching "{searchTerm}".
          </div>
        ) : (
          filteredItems.map((item) => {
            const isProfitPos = Number(item.profit) >= 0;
            const roiNum = Number(item.roi);
            const isPenny = Number(item.buy) === 0.01;

            return (
              <div
                key={item.id}
                className="bg-[#222227] p-3 rounded-xl border border-[#2c2c35] hover:border-[#ff9800]/50 transition-all flex items-center justify-between gap-3 group"
              >
                {/* Left side info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-[#f5f5f7] text-sm truncate">
                      {item.label}
                    </span>
                    {isPenny && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ff9800]/20 text-[#ff9800] font-bold border border-[#ff9800]/30 shrink-0">
                        1¢ PENNY
                      </span>
                    )}
                    {item.store && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#18181c] text-[#ffd60a] border border-[#ffd60a]/30 inline-flex items-center gap-1 shrink-0 font-semibold">
                        <MapPin className="w-3 h-3 text-[#ff9800]" />
                        {item.store}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-[#92929d] mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono">
                    <span>
                      Buy: <strong className="text-[#f5f5f7]">${Number(item.buy).toFixed(2)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Sell: <strong className="text-[#f5f5f7]">${Number(item.sell).toFixed(2)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Ship: ${Number(item.ship).toFixed(2)}
                    </span>
                    <span className="text-[10px] opacity-70">
                      ({(Number(item.feePct) * 100).toFixed(0)}% fee)
                    </span>
                  </div>

                  {item.notes && (
                    <div className="text-[11px] text-[#92929d] mt-1.5 pt-1.5 border-t border-[#2c2c35]/50 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[#0a84ff] font-bold inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Location & Notes:
                      </span>
                      <span className="text-[#f5f5f7]">{item.notes}</span>
                    </div>
                  )}
                </div>

                {/* Right side metrics & action */}
                <div className="text-right shrink-0 flex items-center gap-2.5">
                  <div>
                    <div
                      className={`font-extrabold text-sm sm:text-base font-mono ${
                        isProfitPos ? 'text-[#34c759]' : 'text-[#ff3b30]'
                      }`}
                    >
                      ${item.profit}
                    </div>
                    <div
                      className={`text-[11px] font-mono font-medium ${
                        roiNum >= 30 ? 'text-[#34c759]' : roiNum > 0 ? 'text-[#92929d]' : 'text-[#ff3b30]'
                      }`}
                    >
                      {item.roi}% ROI
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 pl-1 border-l border-[#2c2c35]">
                    <a
                      href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(item.label)}&LH_Sold=1&LH_Complete=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-[#92929d] hover:text-[#0a84ff] rounded-md hover:bg-[#18181c] transition-colors"
                      title="View Comps"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 text-[#92929d] hover:text-[#ff3b30] rounded-md hover:bg-[#18181c] transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Wipe Confirmation Modal */}
      {showConfirmWipe && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#18181c] border border-[#ff3b30]/40 rounded-2xl max-w-sm w-full p-5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#ff3b30] mb-2 font-bold text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Wipe Sourcing List?</span>
            </div>
            <p className="text-xs text-[#92929d] mb-4 leading-relaxed">
              This will permanently clear all {items.length} items logged in this cart session. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmWipe(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#222227] text-[#f5f5f7] hover:bg-[#2c2c35]"
              >
                Keep Items
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setShowConfirmWipe(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#ff3b30] text-white hover:bg-[#e03026] transition-colors"
              >
                Yes, Wipe Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
