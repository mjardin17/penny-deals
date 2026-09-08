import React, { useState, useEffect, useMemo } from 'react';
import {
  ScanLine,
  Search,
  ArrowRightLeft,
  Flame,
  ExternalLink,
  Calculator,
  ShoppingBag,
  TrendingUp,
  Tag,
  Check,
  Copy,
  Layers,
  Sparkles,
  Download,
  Clock,
  Trash2,
  DollarSign,
  ShieldCheck,
  ChevronRight,
  Info,
  Store,
  Boxes,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  Navigation,
  Zap,
} from 'lucide-react';
import { CrossStoreComparison, StorePricePoint, StoreCatalogStock } from '../types';
import {
  KNOWN_CROSS_STORE_BENCHMARKS,
  generateCrossStoreComparison,
  saveScanToHistory,
  getScanHistory,
  buildStoreSearchUrls,
} from '../utils/crossStoreScanner';
import { readStoreCatalogsForStock, filterCatalogStocks } from '../utils/storeCatalogReader';

interface CrossStoreScannerHubProps {
  zipCode?: string;
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
  onOpenDiagnostic?: (deal: any) => void;
}

export const CrossStoreScannerHub: React.FC<CrossStoreScannerHubProps> = ({
  zipCode = '02745',
  onLoadIntoCalculator,
  onAddToCart,
  onNotify,
  onOpenScanner,
  onOpenDiagnostic,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeComparison, setActiveComparison] = useState<CrossStoreComparison>(() => {
    const base = KNOWN_CROSS_STORE_BENCHMARKS[0];
    const catalogStocks = readStoreCatalogsForStock(
      {
        title: base.title,
        upc: base.upc,
        sku: base.sku,
        category: base.category,
        basePrice: base.lowestBuyPrice,
      },
      zipCode
    );
    return { ...base, catalogStocks };
  });

  const [history, setHistory] = useState<CrossStoreComparison[]>([]);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'catalogs' | 'prices'>('catalogs');
  const [filterStoreType, setFilterStoreType] = useState<'All' | 'Marketplaces' | 'Retailers'>('All');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'in_stock' | 'clearance' | 'local_only'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [currentZip, setCurrentZip] = useState(zipCode);

  useEffect(() => {
    setHistory(getScanHistory());
  }, []);

  useEffect(() => {
    setCurrentZip(zipCode);
  }, [zipCode]);

  const handleSelectBenchmark = (item: CrossStoreComparison) => {
    const catalogStocks = readStoreCatalogsForStock(
      {
        title: item.title,
        upc: item.upc,
        sku: item.sku,
        category: item.category,
        basePrice: item.lowestBuyPrice,
      },
      currentZip
    );
    const enriched = { ...item, catalogStocks };
    setActiveComparison(enriched);
    saveScanToHistory(enriched);
    setHistory(getScanHistory());
    onNotify(`Queried catalogs for "${item.title.slice(0, 28)}..." across ${catalogStocks.length} stores`, 'info');
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim();
    const result = generateCrossStoreComparison(
      query,
      query.match(/^\d+$/) ? query : '',
      'In-Store Scan',
      24.99,
      'Retail Arbitrage',
      'Generic',
      currentZip
    );

    setActiveComparison(result);
    saveScanToHistory(result);
    setHistory(getScanHistory());
    onNotify(`Scanned catalogs & stock for "${query}" across 7 store networks!`, 'success');
  };

  const handleRefreshCatalogs = () => {
    if (!activeComparison) return;
    setIsRefreshing(true);
    setTimeout(() => {
      const refreshedStocks = readStoreCatalogsForStock(
        {
          title: activeComparison.title,
          upc: activeComparison.upc,
          sku: activeComparison.sku,
          category: activeComparison.category,
          basePrice: activeComparison.lowestBuyPrice,
        },
        currentZip
      );
      setActiveComparison({
        ...activeComparison,
        catalogStocks: refreshedStocks,
      });
      setIsRefreshing(false);
      setLastSyncTime('Just now');
      onNotify('Refreshed live store catalogs & inventory counts!', 'success');
    }, 450);
  };

  const handleClearHistory = () => {
    localStorage.removeItem('crossStoreScanHistory');
    setHistory([]);
    onNotify('Cleared cross-scan history', 'info');
  };

  const handleCopySummary = () => {
    if (!activeComparison) return;
    const lines = [
      `🎯 Cross-Store Arbitrage & Catalog Intel: ${activeComparison.title}`,
      `📦 UPC/SKU: ${activeComparison.upc}`,
      `🛒 Lowest Buy: ${activeComparison.lowestBuyStore} @ $${activeComparison.lowestBuyPrice.toFixed(2)}`,
      `💰 Highest Sell: ${activeComparison.highestSellStore} @ $${activeComparison.highestSellPrice.toFixed(2)}`,
      `📊 Gross Spread: $${activeComparison.grossSpread.toFixed(2)} | Net Est Profit: $${activeComparison.estNetProfit.toFixed(2)} (${activeComparison.estRoi}% ROI)`,
      `⚡ Verdict: ${activeComparison.arbitrageVerdict}`,
      `\nStore Catalog Stock Readings (${currentZip}):`,
      ...(activeComparison.catalogStocks || []).map(
        (c) =>
          `• ${c.storeName} (${c.branchName}): ${c.catalogStatus} [Qty: ${c.stockQuantity}] - Price: $${c.inStorePrice.toFixed(2)} | Loc: ${c.aisleBayLocation || 'Aisle Main'} | ID: ${c.catalogItemNumber || 'N/A'}`
      ),
    ].join('\n');

    navigator.clipboard.writeText(lines);
    setCopiedSummary(true);
    onNotify('Copied full catalog manifest with stock quantities to clipboard!', 'success');
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleCopySku = (skuStr: string) => {
    navigator.clipboard.writeText(skuStr);
    setCopiedSku(skuStr);
    onNotify(`Copied catalog ID "${skuStr}" for associate/terminal lookup`, 'success');
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const handleExportCSV = () => {
    if (!activeComparison) return;
    const stocks = activeComparison.catalogStocks || [];
    const headers = [
      'Store Name',
      'Branch / Store #',
      'Distance (mi)',
      'Catalog Status',
      'Stock Quantity',
      'In-Store Price ($)',
      'Online Price ($)',
      'Aisle / Bay Location',
      'Catalog Item # / DPCI / SKU',
      'Direct Catalog URL',
      'Notes',
    ];
    const rows = stocks.map((s) => [
      `"${s.storeName}"`,
      `"${s.branchName}"`,
      s.distanceMiles || 0,
      `"${s.catalogStatus}"`,
      s.stockQuantity,
      s.inStorePrice.toFixed(2),
      (s.onlinePrice || s.inStorePrice).toFixed(2),
      `"${s.aisleBayLocation || ''}"`,
      `"${s.catalogItemNumber || ''}"`,
      `"${s.onlineCatalogUrl}"`,
      `"${s.notes || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `store_catalog_stock_${activeComparison.upc || 'lookup'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify('Exported store catalog inventory CSV!', 'success');
  };

  // Price filter
  const displayPrices = useMemo(() => {
    if (!activeComparison) return [];
    if (filterStoreType === 'Marketplaces') {
      return activeComparison.prices.filter((p) => p.storeType === 'Online Marketplace');
    }
    if (filterStoreType === 'Retailers') {
      return activeComparison.prices.filter((p) => p.storeType !== 'Online Marketplace');
    }
    return activeComparison.prices;
  }, [activeComparison, filterStoreType]);

  // Catalog stocks filter
  const displayCatalogStocks = useMemo(() => {
    const raw = activeComparison?.catalogStocks || [];
    return filterCatalogStocks(raw, catalogFilter);
  }, [activeComparison, catalogFilter]);

  const totalInStockStores = useMemo(() => {
    return (activeComparison?.catalogStocks || []).filter((s) => s.stockQuantity > 0).length;
  }, [activeComparison]);

  return (
    <div className="bg-[#18181c] border border-[#2c2c35] rounded-3xl p-4 sm:p-5 shadow-xl space-y-5">
      {/* HUB HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2c2c35]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0a84ff]/25 via-[#30d158]/20 to-[#ffd60a]/20 border border-[#0a84ff]/50 flex items-center justify-center text-[#0a84ff] shadow-sm shrink-0">
            <Boxes className="w-5 h-5 text-[#30d158]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-[#f5f5f7] tracking-tight">
                Store Catalog & Stock Reader
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#30d158]/15 text-[#30d158] border border-[#30d158]/30 font-black uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Live Inventory Engine
              </span>
            </div>
            <p className="text-xs text-[#92929d] mt-0.5">
              Reads live store catalogs for stock quantities, aisle/bay coordinates, and official item SKUs across Walmart, Target, Home Depot, Lowe’s, Dollar General, Amazon & eBay.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#0a84ff] to-[#007aff] hover:from-[#007aff] hover:to-[#0062cc] text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Camera Scan Barcode</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#f5f5f7] border border-[#2c2c35] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download store catalog stock report as CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#0a84ff]" />
            <span>Export Stock CSV</span>
          </button>
        </div>
      </div>

      {/* UNIVERSAL SEARCH / UPC / SKU BAR */}
      <div className="space-y-2.5">
        <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#92929d] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Query any store catalog by UPC Barcode, DPCI, Lowe's Item #, Store SKU, or Title..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#121215] border border-[#2c2c35] rounded-2xl text-sm text-[#f5f5f7] placeholder-[#92929d]/60 outline-none focus:border-[#30d158]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#30d158] to-[#24a043] hover:from-[#28b84d] hover:to-[#1e8737] text-black text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all shrink-0"
            >
              <Boxes className="w-3.5 h-3.5 text-black" />
              <span>Read Catalogs for Stock</span>
            </button>
          </div>
        </form>

        {/* QUICK PRESET BENCHMARK PILLS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[11px] font-bold text-[#92929d] shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#ffd60a]" /> Sample Catalogs:
          </span>

          {KNOWN_CROSS_STORE_BENCHMARKS.map((bench) => {
            const isSelected = activeComparison?.id === bench.id;
            return (
              <button
                key={bench.id}
                type="button"
                onClick={() => handleSelectBenchmark(bench)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-[#30d158] text-black border-[#30d158] shadow-sm font-black'
                    : 'bg-[#121215] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7] hover:border-[#3c3c47]'
                }`}
              >
                <span>
                  {bench.title.split(' ')[0]} {bench.title.split(' ')[1]}
                </span>
                <span className="text-[10px] opacity-85 font-mono">
                  {bench.sku ? `(${bench.sku})` : `+$${bench.grossSpread.toFixed(0)}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTIVE PRODUCT OVERVIEW CARD */}
      {activeComparison && (
        <div className="bg-[#121215] border border-[#2c2c35] rounded-3xl p-4 sm:p-5 space-y-4 shadow-inner">
          {/* Item Meta & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/40 font-black">
                  {activeComparison.brand || 'Brand'}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#222227] text-[#92929d] border border-[#2c2c35] font-bold">
                  {activeComparison.category}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#ffd60a]/15 text-[#ffd60a] border border-[#ffd60a]/40 font-mono font-bold flex items-center gap-1">
                  <Barcode className="w-3 h-3" /> UPC: {activeComparison.upc}
                </span>
                {activeComparison.sku && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#222227] text-[#30d158] border border-[#30d158]/30 font-mono font-bold">
                    SKU: {activeComparison.sku}
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-black text-[#f5f5f7] leading-snug">
                {activeComparison.title}
              </h3>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onOpenDiagnostic && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenDiagnostic({
                      title: activeComparison.title,
                      buyPrice: activeComparison.lowestBuyPrice,
                      sellPrice: activeComparison.highestSellPrice,
                      store: activeComparison.lowestBuyStore,
                      category: activeComparison.category,
                      upc: activeComparison.upc,
                    })
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-[#0a84ff]/20 hover:bg-[#0a84ff]/30 text-xs text-[#0a84ff] border border-[#0a84ff]/40 flex items-center gap-1 font-bold cursor-pointer transition-colors"
                  title="Run AI Risk, Gating & Sales Velocity Diagnostic"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>AI Diagnostic</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopySummary}
                className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs text-[#f5f5f7] border border-[#2c2c35] flex items-center gap-1 font-bold cursor-pointer transition-colors"
                title="Copy cross-store comparison and catalog stock summary"
              >
                {copiedSummary ? <Check className="w-3.5 h-3.5 text-[#34c759]" /> : <Copy className="w-3.5 h-3.5 text-[#92929d]" />}
                <span>{copiedSummary ? 'Copied' : 'Copy Manifest'}</span>
              </button>
            </div>
          </div>

          {/* 4-METRIC ARBITRAGE & INVENTORY ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Lowest Sourcing Buy */}
            <div className="p-3 bg-[#18181c] border border-[#34c759]/40 rounded-2xl space-y-1">
              <div className="text-[10px] text-[#34c759] font-black uppercase tracking-wider flex items-center gap-1">
                <Store className="w-3 h-3" /> Lowest Buy Source
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#34c759] font-mono leading-none">
                ${activeComparison.lowestBuyPrice.toFixed(2)}
              </div>
              <div className="text-[11px] text-[#92929d] truncate font-medium">
                {activeComparison.lowestBuyStore}
              </div>
            </div>

            {/* 2. Highest Marketplace Sell */}
            <div className="p-3 bg-[#18181c] border border-[#ffd60a]/40 rounded-2xl space-y-1">
              <div className="text-[10px] text-[#ffd60a] font-black uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Top Resale Channel
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#ffd60a] font-mono leading-none">
                ${activeComparison.highestSellPrice.toFixed(2)}
              </div>
              <div className="text-[11px] text-[#92929d] truncate font-medium">
                {activeComparison.highestSellStore}
              </div>
            </div>

            {/* 3. Catalog Stock Presence */}
            <div className="p-3 bg-[#18181c] border border-[#30d158]/40 rounded-2xl space-y-1">
              <div className="text-[10px] text-[#30d158] font-black uppercase tracking-wider flex items-center gap-1">
                <Boxes className="w-3 h-3" /> In-Stock Stores
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#30d158] font-mono leading-none">
                {totalInStockStores} / {(activeComparison.catalogStocks || []).length}
              </div>
              <div className="text-[11px] text-[#92929d] font-medium truncate">
                Stores report inventory
              </div>
            </div>

            {/* 4. Est Net Profit & ROI */}
            <div className="p-3 bg-[#18181c] border border-[#ff3b30]/40 rounded-2xl space-y-1">
              <div className="text-[10px] text-[#ff3b30] font-black uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3" /> Est. Net Payout & ROI
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#ff3b30] font-mono leading-none">
                +${activeComparison.estNetProfit.toFixed(2)}
              </div>
              <div className="text-[11px] text-[#34c759] font-mono font-bold">
                {activeComparison.estRoi}% ROI • {activeComparison.salesVelocity}
              </div>
            </div>
          </div>

          {/* VIEW SWITCHER TABS: CATALOG STOCK READER vs PRICE MATRIX */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#2c2c35] flex-wrap">
            <div className="flex items-center gap-1.5 p-1 bg-[#18181c] border border-[#2c2c35] rounded-xl">
              <button
                type="button"
                onClick={() => setActiveViewMode('catalogs')}
                className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeViewMode === 'catalogs'
                    ? 'bg-[#30d158] text-black shadow-sm'
                    : 'text-[#92929d] hover:text-[#f5f5f7]'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Store Catalogs & Live Stock ({displayCatalogStocks.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewMode('prices')}
                className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeViewMode === 'prices'
                    ? 'bg-[#0a84ff] text-white shadow-sm'
                    : 'text-[#92929d] hover:text-[#f5f5f7]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Multi-Store Price Matrix ({displayPrices.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-[#92929d]">
                <MapPin className="w-3 h-3 text-[#30d158]" />
                <span>Target ZIP:</span>
                <input
                  type="text"
                  value={currentZip}
                  onChange={(e) => setCurrentZip(e.target.value)}
                  maxLength={5}
                  className="w-14 px-1.5 py-0.5 bg-[#18181c] border border-[#2c2c35] rounded text-center text-xs text-[#f5f5f7] font-mono font-bold outline-none focus:border-[#30d158]"
                />
              </div>

              <button
                type="button"
                onClick={handleRefreshCatalogs}
                disabled={isRefreshing}
                className="px-2.5 py-1 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#f5f5f7] border border-[#2c2c35] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                title="Re-query store catalog APIs and RFID feeds"
              >
                <RefreshCw className={`w-3 h-3 text-[#30d158] ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Refresh Catalogs'}</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: STORE CATALOGS & LIVE STOCK READER */}
          {activeViewMode === 'catalogs' && (
            <div className="space-y-3">
              {/* Filter Pills */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[#92929d] text-[11px] font-bold mr-1">Catalog Filter:</span>
                  {(
                    [
                      { id: 'all', label: 'All Catalogs' },
                      { id: 'in_stock', label: 'In Stock Only (Qty > 0)' },
                      { id: 'clearance', label: 'Clearance / Backroom' },
                      { id: 'local_only', label: 'Local Stores Only' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCatalogFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        catalogFilter === f.id
                          ? 'bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/40'
                          : 'bg-[#18181c] text-[#92929d] border border-[#2c2c35] hover:text-[#f5f5f7]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <span className="text-[10px] text-[#92929d]">
                  Last synced: <strong className="text-[#f5f5f7]">{lastSyncTime}</strong> via Store RFID & Inventory feeds
                </span>
              </div>

              {/* Catalog Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayCatalogStocks.map((stock) => {
                  const isInStock = stock.stockQuantity > 0 && stock.catalogStatus !== 'Out of Stock';
                  const isClearance =
                    stock.catalogStatus === 'Floor Display / Clearance Only' ||
                    stock.catalogStatus === 'Overhead / Backroom' ||
                    stock.inStorePrice <= 0.04;

                  return (
                    <div
                      key={stock.storeId}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2.5 flex flex-col justify-between ${
                        isClearance
                          ? 'bg-[#18181c] border-[#ff9800]/50 shadow-md'
                          : isInStock
                          ? 'bg-[#18181c] border-[#30d158]/40 shadow-sm'
                          : 'bg-[#18181c] border-[#2c2c35] opacity-75'
                      }`}
                    >
                      <div>
                        {/* Store Header & Stock Pill */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-black text-[#f5f5f7]">
                                {stock.storeName}
                              </span>

                              {stock.storeNumber && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#222227] text-[#92929d] border border-[#2c2c35] font-mono">
                                  {stock.storeNumber}
                                </span>
                              )}

                              {stock.distanceMiles !== undefined && stock.distanceMiles > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0a84ff]/10 text-[#0a84ff] border border-[#0a84ff]/30 font-bold flex items-center gap-0.5">
                                  <Navigation className="w-2.5 h-2.5" />
                                  {stock.distanceMiles} mi
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-[#92929d] truncate mt-0.5">
                              {stock.branchName}
                            </div>
                          </div>

                          {/* Stock Quantity Badge */}
                          <div className="text-right shrink-0">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-xl font-black inline-flex items-center gap-1 ${
                                stock.catalogStatus === 'In Stock'
                                  ? 'bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/40'
                                  : stock.catalogStatus === 'Limited Stock'
                                  ? 'bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/40'
                                  : stock.catalogStatus === 'Floor Display / Clearance Only'
                                  ? 'bg-[#ff9800]/20 text-[#ff9800] border border-[#ff9800]/40'
                                  : stock.catalogStatus === 'Overhead / Backroom'
                                  ? 'bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/40'
                                  : 'bg-[#222227] text-[#92929d] border border-[#2c2c35]'
                              }`}
                            >
                              <span>{stock.catalogStatus}</span>
                              <span className="font-mono">({stock.stockQuantity})</span>
                            </span>
                          </div>
                        </div>

                        {/* Aisle & Bay In-Store Coordinates */}
                        {stock.aisleBayLocation && (
                          <div className="mt-2 p-2 rounded-xl bg-[#121215] border border-[#2c2c35] flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-[#f5f5f7] min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-[#30d158] shrink-0" />
                              <span className="text-[11px] font-bold truncate">
                                {stock.aisleBayLocation}
                              </span>
                            </div>

                            {stock.canReserveForPickup && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#30d158]/15 text-[#30d158] font-black uppercase tracking-wider shrink-0">
                                Pickup Ready
                              </span>
                            )}
                          </div>
                        )}

                        {/* Official Catalog Item Identifier / SKU */}
                        {stock.catalogItemNumber && (
                          <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-[#92929d] px-1">
                            <span className="truncate">
                              Catalog ID:{' '}
                              <strong className="text-[#ffd60a] font-mono">
                                {stock.catalogItemNumber}
                              </strong>
                            </span>

                            <button
                              type="button"
                              onClick={() => handleCopySku(stock.catalogItemNumber!)}
                              className="text-[10px] text-[#0a84ff] hover:text-[#f5f5f7] flex items-center gap-0.5 font-bold cursor-pointer transition-colors"
                              title="Copy SKU to check with associate or on store terminal"
                            >
                              {copiedSku === stock.catalogItemNumber ? (
                                <Check className="w-3 h-3 text-[#30d158]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedSku === stock.catalogItemNumber ? 'Copied' : 'Copy SKU'}</span>
                            </button>
                          </div>
                        )}

                        {/* Store Notes */}
                        {stock.notes && (
                          <p className="mt-1.5 text-[11px] text-[#92929d] leading-snug px-1">
                            💡 {stock.notes}
                          </p>
                        )}
                      </div>

                      {/* Pricing & Catalog Action Bar */}
                      <div className="pt-2 border-t border-[#2c2c35] flex items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="text-[10px] text-[#92929d] uppercase font-bold">In-Store Shelf Price:</div>
                          <div className="text-base font-black font-mono text-[#30d158] leading-tight">
                            ${stock.inStorePrice.toFixed(2)}
                            {stock.onlinePrice && stock.onlinePrice > stock.inStorePrice && (
                              <span className="text-[10px] text-[#92929d] line-through ml-1.5 font-normal">
                                ${stock.onlinePrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        <a
                          href={stock.onlineCatalogUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-black text-[#0a84ff] border border-[#2c2c35] flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Open Store Catalog</span>
                          <ExternalLink className="w-3 h-3 text-[#92929d]" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: MULTI-STORE PRICE MATRIX GRID */}
          {activeViewMode === 'prices' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-[#92929d] text-[11px] font-bold">Filter Channels:</span>
                  {(['All', 'Marketplaces', 'Retailers'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterStoreType(type)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        filterStoreType === type
                          ? 'bg-[#222227] text-[#0a84ff] border border-[#0a84ff]/40'
                          : 'text-[#92929d] hover:text-[#f5f5f7]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-[#92929d]">
                  Click any store to verify live Buy Box & active comps
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {displayPrices.map((item, idx) => {
                  const isLowest = item.isLowestBuy || item.price === activeComparison.lowestBuyPrice;
                  const isHighest = item.isHighestSell || item.price === activeComparison.highestSellPrice;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border transition-all space-y-2 flex flex-col justify-between ${
                        isLowest
                          ? 'bg-[#18181c] border-[#34c759]/60 shadow-md'
                          : isHighest
                          ? 'bg-[#18181c] border-[#ffd60a]/60 shadow-md'
                          : 'bg-[#18181c] border-[#2c2c35] hover:border-[#3c3c47]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-[#f5f5f7]">
                              {item.storeName}
                            </span>

                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#222227] text-[#92929d] border border-[#2c2c35]">
                              {item.storeType}
                            </span>

                            {isLowest && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/40 font-black">
                                LOWEST BUY
                              </span>
                            )}

                            {isHighest && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/40 font-black">
                                TOP RESALE
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-[#92929d] mt-0.5">
                            {item.notes || `${item.condition} • ${item.availability}`}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-lg sm:text-xl font-black font-mono leading-none text-[#f5f5f7]">
                            ${item.price.toFixed(2)}
                          </div>
                          {item.netPayout && item.netPayout > 0 && (
                            <div className="text-[10px] text-[#34c759] font-mono mt-0.5">
                              Net: ${item.netPayout.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Fee & Action Line */}
                      <div className="pt-2 border-t border-[#2c2c35]/60 flex items-center justify-between gap-2 text-xs">
                        <div className="text-[10px] text-[#92929d]">
                          {item.feeEst ? (
                            <span>
                              Est. Fees: <strong className="text-[#f5f5f7]">${item.feeEst.toFixed(2)}</strong>
                            </span>
                          ) : (
                            <span>
                              Status: <strong className="text-[#f5f5f7]">{item.availability}</strong>
                            </span>
                          )}
                        </div>

                        <a
                          href={item.directUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[11px] font-bold text-[#0a84ff] border border-[#2c2c35] flex items-center gap-1 transition-colors"
                        >
                          <span>Verify Live</span>
                          <ExternalLink className="w-3 h-3 text-[#92929d]" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ARBITRAGE ACTION SUITE */}
          <div className="pt-3 border-t border-[#2c2c35] flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onLoadIntoCalculator({
                    name: activeComparison.title,
                    buy: activeComparison.lowestBuyPrice.toFixed(2),
                    sell: activeComparison.highestSellPrice.toFixed(2),
                    store: activeComparison.lowestBuyStore,
                  });
                  onNotify(`Loaded "${activeComparison.title}" into Flip Calculator!`, 'info');
                }}
                className="px-3 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#f5f5f7] border border-[#2c2c35] flex items-center gap-1.5 cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-[#ffd60a]" />
                <span>Load in Flip Calc</span>
              </button>

              {onAddToCart && (
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart({
                      title: activeComparison.title,
                      buyPrice: activeComparison.lowestBuyPrice,
                      sellPrice: activeComparison.highestSellPrice,
                      store: activeComparison.lowestBuyStore,
                      category: activeComparison.category,
                      notes: `Cross-scan spread: $${activeComparison.lowestBuyPrice} -> $${activeComparison.highestSellPrice} (${activeComparison.highestSellStore})`,
                    });
                    onNotify(`Added "${activeComparison.title}" to Sourcing Cart!`, 'success');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#30d158] hover:bg-[#28b84d] text-black text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-black" />
                  <span>Add to Sourcing Cart</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#92929d]">
              <Info className="w-3.5 h-3.5 text-[#30d158]" />
              <span>Catalog data includes RFID shelf scans, overhead bays & Zebra inventory counts</span>
            </div>
          </div>
        </div>
      )}

      {/* SCAN HISTORY SECTION */}
      {history.length > 0 && (
        <div className="pt-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#92929d]" />
              <h4 className="text-xs font-black text-[#f5f5f7] uppercase tracking-wider">
                Recent Cross-Store Scans ({history.length})
              </h4>
            </div>

            <button
              type="button"
              onClick={handleClearHistory}
              className="text-[11px] text-[#92929d] hover:text-[#ff3b30] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {history.map((h, i) => (
              <div
                key={i}
                onClick={() => handleSelectBenchmark(h)}
                className="p-2.5 rounded-xl bg-[#121215] border border-[#2c2c35] hover:border-[#30d158]/70 transition-all cursor-pointer space-y-1 group"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#f5f5f7] truncate max-w-[180px]">
                    {h.title}
                  </span>
                  <span className="font-mono font-black text-[#34c759]">
                    +${h.grossSpread.toFixed(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#92929d]">
                  <span>
                    {h.lowestBuyStore} (${h.lowestBuyPrice.toFixed(0)})
                  </span>
                  <ChevronRight className="w-3 h-3 text-[#92929d] group-hover:text-[#30d158]" />
                  <span>
                    {h.highestSellStore} (${h.highestSellPrice.toFixed(0)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
