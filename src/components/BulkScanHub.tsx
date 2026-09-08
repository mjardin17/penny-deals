import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  ArrowRight,
  ShoppingBag,
  Download,
  CheckCircle2,
  Trash2,
  TrendingUp,
  Zap,
  ExternalLink,
  DollarSign,
  ScanLine,
} from 'lucide-react';
import { lookupBarcode } from '../utils/barcodeLookup';
import { generateCrossStoreComparison } from '../utils/crossStoreScanner';
import { CrossStoreComparison } from '../types';
import { soundFx } from '../utils/audioFeedback';

interface BulkScanResultItem {
  upc: string;
  title: string;
  store: string;
  buyPrice: number;
  sellPrice: number;
  estProfit: number;
  roi: number;
  category: string;
  matched: boolean;
  notes?: string;
}

interface BulkScanHubProps {
  zipCode: string;
  onAddToCart?: (deal: any) => void;
  onLoadIntoCalculator?: (deal: any) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenDiagnostic?: (deal: any) => void;
}

export const BulkScanHub: React.FC<BulkScanHubProps> = ({
  zipCode,
  onAddToCart,
  onLoadIntoCalculator,
  onNotify,
  onOpenDiagnostic,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [results, setResults] = useState<BulkScanResultItem[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'profitable' | 'penny'>('all');

  const SAMPLE_BATCHES = [
    {
      name: "Lowe's Power Tools (.02 RTV)",
      codes: "885911478294\n045242598373\n883818512345",
    },
    {
      name: 'Target Toy & Dyson Salvage (.04)',
      codes: "673419376976\n885609028912\n194735123456",
    },
    {
      name: 'Dollar General Penny Items',
      codes: "071234567890\n074123456789\n078901234567",
    },
  ];

  const handleRunBatch = () => {
    const rawLines = inputText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawLines.length === 0) {
      onNotify('Please enter or paste at least one UPC or barcode.', 'error');
      return;
    }

    setIsProcessing(true);
    soundFx.playStandardScan();

    setTimeout(() => {
      const parsedResults: BulkScanResultItem[] = rawLines.map((code) => {
        const lookup = lookupBarcode(code);
        const title = lookup ? lookup.title : `Item ${code}`;
        const buyPrice = lookup ? lookup.actualPrice : 14.99;
        const store = lookup ? lookup.store : 'Store Barcode';
        const category = lookup ? lookup.category : 'General Merchandise';
        const notes = lookup ? (lookup.hunterNotes || lookup.tagIntel) : 'Batch Scanned';
        const isMatched = lookup ? lookup.matched : false;

        const comp = generateCrossStoreComparison(
          title,
          code,
          store,
          buyPrice,
          category,
          store,
          zipCode
        );

        return {
          upc: code,
          title,
          store,
          buyPrice,
          sellPrice: comp.highestSellPrice,
          estProfit: comp.estNetProfit,
          roi: comp.estRoi,
          category,
          matched: isMatched,
          notes,
        };
      });

      setResults(parsedResults);
      setIsProcessing(false);

      const profitableCount = parsedResults.filter((r) => r.estProfit > 10).length;
      if (profitableCount > 0) {
        soundFx.playPennyJackpot();
        onNotify(`Batch completed: ${profitableCount} profitable flips found!`, 'success');
      } else {
        onNotify(`Batch scan completed for ${parsedResults.length} items.`, 'info');
      }
    }, 450);
  };

  const handleClear = () => {
    setInputText('');
    setResults([]);
    onNotify('Batch scanner cleared', 'info');
  };

  const handleAddAllProfitable = () => {
    const profitable = results.filter((r) => r.estProfit > 5);
    if (profitable.length === 0) {
      onNotify('No profitable items found in this batch.', 'error');
      return;
    }

    profitable.forEach((item) => {
      if (onAddToCart) {
        onAddToCart({
          title: item.title,
          buyPrice: item.buyPrice,
          sellPrice: item.sellPrice,
          store: item.store,
          category: item.category,
          notes: `Batch Scanned (UPC: ${item.upc})`,
        });
      }
    });

    soundFx.playHighProfitChime();
    onNotify(`Added ${profitable.length} profitable items to Sourcing Cart!`, 'success');
  };

  const handleExportCsv = () => {
    if (results.length === 0) return;

    const headers = ['UPC', 'Title', 'Store', 'Buy Price', 'Resell Comp', 'Est Net Profit', 'ROI %', 'Category', 'Notes'];
    const rows = results.map((r) => [
      `"${r.upc}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.store}"`,
      r.buyPrice.toFixed(2),
      r.sellPrice.toFixed(2),
      r.estProfit.toFixed(2),
      `${r.roi}%`,
      `"${r.category}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Batch_Scan_Report_${zipCode}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify('Batch CSV exported successfully!', 'success');
  };

  const filteredResults = results.filter((item) => {
    if (filterMode === 'profitable') return item.estProfit >= 10;
    if (filterMode === 'penny') return item.buyPrice <= 0.04;
    return true;
  });

  const totalBatchProfit = results.reduce((acc, r) => acc + (r.estProfit > 0 ? r.estProfit : 0), 0);

  return (
    <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-3.5 sm:p-5 mb-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/30">
              <Layers className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-[#f5f5f7] tracking-tight">
              Batch Barcode & UPC Multi-Scanner
            </h2>
          </div>
          <p className="text-xs text-[#92929d] mt-1">
            Paste manifests, store receipt lists, or multiple UPCs to cross-compare catalogs & price spreads simultaneously.
          </p>
        </div>

        {/* Quick Sample Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SAMPLE_BATCHES.map((batch, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInputText(batch.codes)}
              className="px-2.5 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[11px] font-bold text-[#ffd60a] transition-colors cursor-pointer border border-[#2c2c35]"
            >
              + {batch.name}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste UPCs or barcodes (one per line, comma or space separated)..."
            className="w-full bg-[#121215] border border-[#2c2c35] focus:border-[#ffd60a] rounded-xl p-3 text-xs text-[#f5f5f7] font-mono outline-none placeholder:text-[#92929d]/50 transition-colors"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isProcessing || !inputText.trim()}
              onClick={handleRunBatch}
              className="px-4 py-2 rounded-xl bg-[#ffd60a] hover:bg-[#ffc107] disabled:opacity-40 disabled:pointer-events-none text-black font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isProcessing ? 'Processing Batch...' : 'Run Batch Cross-Scan'}</span>
            </button>

            {results.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-2 rounded-xl bg-[#222227] hover:bg-[#ff453a]/20 hover:text-[#ff453a] text-xs font-bold text-[#92929d] flex items-center gap-1 transition-colors cursor-pointer border border-[#2c2c35]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {results.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAddAllProfitable}
                className="px-3 py-1.5 rounded-xl bg-[#30d158] hover:bg-[#28b84c] text-black font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Bag All Profitable ({results.filter((r) => r.estProfit > 5).length})</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#92929d] hover:text-[#f5f5f7] flex items-center gap-1 transition-colors cursor-pointer border border-[#2c2c35]"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Batch Results Table / Feed */}
      {results.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-[#2c2c35]">
          {/* Summary Strip & Filter Pills */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3 text-xs">
              <span>
                Total Items: <strong className="text-[#f5f5f7] font-mono">{results.length}</strong>
              </span>
              <span>
                Est Net Profit Pool:{' '}
                <strong className="text-[#30d158] font-mono font-bold">+${totalBatchProfit.toFixed(2)}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#121215] border border-[#2c2c35] rounded-xl text-[11px]">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  filterMode === 'all' ? 'bg-[#222227] text-[#f5f5f7]' : 'text-[#92929d] hover:text-[#f5f5f7]'
                }`}
              >
                All ({results.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('profitable')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  filterMode === 'profitable' ? 'bg-[#30d158] text-black' : 'text-[#92929d] hover:text-[#f5f5f7]'
                }`}
              >
                High Profit ({results.filter((r) => r.estProfit >= 10).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('penny')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  filterMode === 'penny' ? 'bg-[#ffd60a] text-black' : 'text-[#92929d] hover:text-[#f5f5f7]'
                }`}
              >
                Penny & Salvage ({results.filter((r) => r.buyPrice <= 0.04).length})
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredResults.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#121215] border border-[#2c2c35] hover:border-[#ffd60a]/40 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] text-[#ffd60a] bg-[#222227] px-1.5 py-0.5 rounded">
                      {item.upc}
                    </span>
                    <span className="text-[11px] text-[#92929d]">{item.store}</span>
                    {item.buyPrice <= 0.04 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ffd60a]/20 text-[#ffd60a] font-black">
                        1¢ / SALVAGE
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-[#f5f5f7] mt-1 truncate">{item.title}</h4>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#92929d] flex-wrap">
                    <span>
                      Buy: <strong className="text-[#ffd60a] font-mono">${item.buyPrice.toFixed(2)}</strong>
                    </span>
                    <span>
                      Resell Comp: <strong className="text-[#0a84ff] font-mono">${item.sellPrice.toFixed(2)}</strong>
                    </span>
                    <span>
                      Net:{' '}
                      <strong
                        className={`font-mono ${item.estProfit > 0 ? 'text-[#30d158] font-bold' : 'text-[#ff453a]'}`}
                      >
                        {item.estProfit > 0 ? `+$${item.estProfit.toFixed(2)}` : `$${item.estProfit.toFixed(2)}`}
                      </strong>
                    </span>
                    {item.roi > 0 && (
                      <span className="text-[#30d158] font-mono font-bold">({item.roi}% ROI)</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {onOpenDiagnostic && (
                    <button
                      type="button"
                      onClick={() => onOpenDiagnostic(item)}
                      className="px-2 py-1 rounded-lg bg-[#222227] hover:bg-[#0a84ff]/20 text-[#0a84ff] font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer border border-[#2c2c35]"
                      title="AI Risk & Velocity Diagnostic"
                    >
                      <Zap className="w-3 h-3" />
                      <span className="hidden sm:inline">AI Check</span>
                    </button>
                  )}

                  {onLoadIntoCalculator && (
                    <button
                      type="button"
                      onClick={() =>
                        onLoadIntoCalculator({
                          title: item.title,
                          buyPrice: item.buyPrice,
                          sellPrice: item.sellPrice,
                          store: item.store,
                        })
                      }
                      className="p-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] transition-colors cursor-pointer border border-[#2c2c35]"
                      title="Load into Calculator"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-[#30d158]" />
                    </button>
                  )}

                  {onAddToCart && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playPennyJackpot();
                        onAddToCart({
                          title: item.title,
                          buyPrice: item.buyPrice,
                          sellPrice: item.sellPrice,
                          store: item.store,
                          category: item.category,
                          notes: `Batch Scanned (${item.upc})`,
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#30d158] hover:bg-[#28b84c] text-black font-black text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Bag</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
