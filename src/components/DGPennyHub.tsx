import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Copy,
  ExternalLink,
  Plus,
  HelpCircle,
  Sparkles,
  BookOpen,
  Filter,
  Check,
  Tag,
  Barcode,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DGPennyItem } from '../types';
import { DG_TAG_GUIDE, DG_PENNY_RULES, DEFAULT_DG_PENNY_DEALS } from '../data/dgPennyDeals';

interface DGPennyHubProps {
  onLoadIntoCalculator: (item: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const DGPennyHub: React.FC<DGPennyHubProps> = ({
  onLoadIntoCalculator,
  onNotify,
}) => {
  const [items, setItems] = useState<DGPennyItem[]>(() => {
    try {
      const saved = localStorage.getItem('dgPennyDealsList');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load DG penny items', e);
    }
    return DEFAULT_DG_PENNY_DEALS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [showTagGuide, setShowTagGuide] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedUpc, setCopiedUpc] = useState<string | null>(null);

  // New Item Form State
  const [newName, setNewName] = useState('');
  const [newUpc, setNewUpc] = useState('');
  const [newTag, setNewTag] = useState('🟣 Purple Dot');
  const [newCategory, setNewCategory] = useState('Home & Decor');
  const [newOrigPrice, setNewOrigPrice] = useState('10.00');
  const [newEstResell, setNewEstResell] = useState('15.00');
  const [newNotes, setNewNotes] = useState('');

  const saveItems = (updated: DGPennyItem[]) => {
    setItems(updated);
    localStorage.setItem('dgPennyDealsList', JSON.stringify(updated));
  };

  const handleCopyUpc = async (upc: string, name: string) => {
    try {
      await navigator.clipboard.writeText(upc);
      setCopiedUpc(upc);
      onNotify(`Copied UPC ${upc} (${name})`, 'success');
      setTimeout(() => setCopiedUpc(null), 2000);
    } catch {
      onNotify(`Failed to copy UPC`, 'error');
    }
  };

  const handleToggleFound = (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, isFound: !item.isFound } : item
    );
    saveItems(updated);
    const target = updated.find((i) => i.id === id);
    if (target?.isFound) {
      onNotify(`Marked "${target.name}" as Found in cart! 🎉`, 'success');
    }
  };

  const handleSendToCalc = (item: DGPennyItem) => {
    onLoadIntoCalculator({
      name: `${item.name} [${item.tagSymbol}] (UPC: ${item.upc})`,
      buy: '0.01',
      sell: item.estResell.toFixed(2),
      store: 'Dollar General',
    });
    onNotify(`Loaded 1¢ deal into Calculator: ${item.name}`, 'success');
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: DGPennyItem = {
      id: `dg-custom-${Date.now()}`,
      name: newName.trim(),
      upc: newUpc.trim() || 'Custom UPC',
      tagSymbol: newTag,
      category: newCategory,
      origPrice: parseFloat(newOrigPrice) || 5.0,
      estResell: parseFloat(newEstResell) || 10.0,
      dropDate: 'Tuesday Verified',
      notes: newNotes.trim() || 'Found in DG clearance run.',
      verified: true,
      isFound: false,
    };

    const updated = [newItem, ...items];
    saveItems(updated);
    setShowAddModal(false);
    setNewName('');
    setNewUpc('');
    setNewNotes('');
    onNotify(`Added "${newItem.name}" to your DG Penny Master List!`, 'success');
  };

  const handleResetToDefault = () => {
    saveItems(DEFAULT_DG_PENNY_DEALS);
    onNotify('Reset DG Penny List to verified master deals', 'info');
  };

  // Filter items
  const categories = [
    'All',
    'Seasonal & Holiday',
    'Home & Decor',
    'Apparel & Shoes',
    'Toys & Games',
    'Health & Beauty',
    'Food & Candy',
    'Cleaning & Household',
  ];

  const tagSymbols = [
    'All',
    '🟣 Purple Dot',
    '🟤 Brown Dot',
    '🟡 Yellow Dot',
    '🌸 Pink Square',
    '🔵 Blue Star',
    '🟩 Green Star',
    '🎃 Seasonal Mark',
    '📦 Discontinued NCI',
  ];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.upc.includes(searchQuery) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    const matchesTag = selectedTag === 'All' || item.tagSymbol === selectedTag;

    return matchesSearch && matchesCategory && matchesTag;
  });

  const foundCount = items.filter((i) => i.isFound).length;

  return (
    <div className="bg-[#18181c] p-4 sm:p-5 rounded-2xl mb-4 border-2 border-[#ff9800]/80 shadow-xl">
      {/* Title & Hub Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 pb-3 border-b border-[#2c2c35]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🟡</span>
            <h2 className="text-base sm:text-lg font-extrabold text-[#ff9800] tracking-tight m-0">
              Dollar General Tuesday Penny Hub
            </h2>
          </div>
          <p className="text-xs text-[#92929d] mt-0.5">
            Confirmed 1¢ Register Markdowns • Updated for Tuesday Sourcing Runs
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-[#ff9800] text-black font-bold text-xs flex items-center gap-1 hover:bg-[#e08600] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Deal</span>
          </button>
        </div>
      </div>

      {/* Guide & Rules Expandable Tabs */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          type="button"
          onClick={() => {
            setShowTagGuide(!showTagGuide);
            if (showRules) setShowRules(false);
          }}
          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
            showTagGuide
              ? 'bg-[#ff9800]/15 text-[#ff9800] border-[#ff9800]'
              : 'bg-[#222227] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7]'
          }`}
        >
          <span className="flex items-center gap-1.5 truncate">
            <Tag className="w-3.5 h-3.5 text-[#ff9800]" /> DG Tag Decoder Guide
          </span>
          {showTagGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setShowRules(!showRules);
            if (showTagGuide) setShowTagGuide(false);
          }}
          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
            showRules
              ? 'bg-[#ff9800]/15 text-[#ff9800] border-[#ff9800]'
              : 'bg-[#222227] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7]'
          }`}
        >
          <span className="flex items-center gap-1.5 truncate">
            <BookOpen className="w-3.5 h-3.5 text-[#34c759]" /> 5 Golden Rules
          </span>
          {showRules ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* DG Tag Guide Section */}
      {showTagGuide && (
        <div className="bg-[#222227] p-3.5 rounded-xl mb-3 border border-[#2c2c35] text-xs space-y-2">
          <div className="font-bold text-[#ff9800] flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wider">
            <span>🏷️ Dollar General Clearance Dots & Tags Cheatsheet</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {DG_TAG_GUIDE.map((guide, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-[#18181c] border border-[#2c2c35] flex items-start gap-2"
              >
                <span className="font-bold text-[#f5f5f7] whitespace-nowrap">{guide.symbol}</span>
                <span className="text-[#92929d] text-[11px] leading-tight">{guide.description}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#92929d] pt-1">
            💡 Check inside garments near washing tags, bottom stickers, and price barcodes for these printed colored shapes.
          </p>
        </div>
      )}

      {/* 5 Golden Rules Section */}
      {showRules && (
        <div className="bg-[#222227] p-3.5 rounded-xl mb-3 border border-[#2c2c35] text-xs space-y-2">
          <div className="font-bold text-[#34c759] flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wider">
            <span>📜 The 5 Golden Rules of Dollar General Penny Hunting</span>
          </div>
          <div className="space-y-2 pt-1">
            {DG_PENNY_RULES.map((rule, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-[#18181c] border border-[#2c2c35]">
                <span className="font-bold text-[#f5f5f7] block mb-0.5">{rule.title}</span>
                <p className="text-[11px] text-[#92929d] leading-relaxed m-0">{rule.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="space-y-2.5 mb-3">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#92929d] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search DG penny items by Name, UPC code, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs sm:text-sm text-[#f5f5f7] focus:border-[#ff9800] outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#92929d] hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category horizontal scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] border transition-all ${
                selectedCategory === cat
                  ? 'bg-[#ff9800] text-black font-bold border-[#ff9800]'
                  : 'bg-[#222227] text-[#92929d] border-[#2c2c35] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tag symbol filter */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold text-[#92929d] whitespace-nowrap">Filter Tag:</label>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="bg-[#222227] text-xs text-[#f5f5f7] border border-[#2c2c35] rounded-lg px-2.5 py-1 focus:border-[#ff9800] outline-none"
          >
            {tagSymbols.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <div className="ml-auto text-[11px] text-[#92929d]">
            <span>Found: </span>
            <strong className="text-[#34c759]">{foundCount}</strong> / {items.length}
          </div>
        </div>
      </div>

      {/* DG Penny Items List */}
      <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 rounded-xl bg-[#222227]/40 border border-dashed border-[#2c2c35] text-xs text-[#92929d]">
            <Barcode className="w-8 h-8 text-[#92929d]/50 mx-auto mb-2" />
            <p className="font-semibold mb-1">No DG penny items match your criteria.</p>
            <p className="text-[11px] opacity-80 mb-3">Try adjusting your filters or add a new verified deal.</p>
            <button
              onClick={handleResetToDefault}
              className="px-3 py-1.5 rounded-lg bg-[#222227] text-[#ff9800] text-xs font-semibold border border-[#ff9800]/40"
            >
              Restore Verified DG Penny Master List
            </button>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-xl border transition-all ${
                item.isFound
                  ? 'bg-[#222227]/40 border-[#34c759]/40 opacity-75'
                  : 'bg-[#222227] border-[#2c2c35] hover:border-[#ff9800]/70 shadow-sm'
              }`}
            >
              {/* Top Row: Name & Found checkbox */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-[#f5f5f7] leading-snug">
                      {item.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18181c] text-[#ff9800] font-bold border border-[#ff9800]/30 shrink-0">
                      {item.tagSymbol}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18181c] text-[#92929d] border border-[#2c2c35] shrink-0">
                      {item.category}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleFound(item.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition-all shrink-0 ${
                    item.isFound
                      ? 'bg-[#34c759]/20 text-[#34c759] border-[#34c759]'
                      : 'bg-[#18181c] text-[#92929d] border-[#2c2c35] hover:text-white'
                  }`}
                  title="Mark item as Found in cart"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{item.isFound ? 'Found' : 'Need'}</span>
                </button>
              </div>

              {/* Middle Row: UPC & Comps */}
              <div className="flex items-center justify-between gap-2 text-xs py-1 border-t border-b border-[#2c2c35]/50 my-1.5">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#92929d]">
                  <Barcode className="w-3.5 h-3.5 text-[#ff9800]" />
                  <span>UPC:</span>
                  <span className="text-[#f5f5f7] font-semibold">{item.upc}</span>
                  <button
                    onClick={() => handleCopyUpc(item.upc, item.name)}
                    className="p-1 text-[#92929d] hover:text-[#ff9800] transition-colors"
                    title="Copy UPC to clipboard"
                  >
                    {copiedUpc === item.upc ? (
                      <Check className="w-3 h-3 text-[#34c759]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#92929d]">
                    Orig: <span className="line-through">${item.origPrice.toFixed(2)}</span>
                  </span>
                  <span className="text-xs font-mono font-extrabold text-[#34c759] bg-[#34c759]/15 px-1.5 py-0.5 rounded border border-[#34c759]/30">
                    Buy: $0.01
                  </span>
                </div>
              </div>

              {/* Bottom Row: Sourcing notes & Actions */}
              {item.notes && (
                <p className="text-[11px] text-[#92929d] mt-1 mb-2 leading-relaxed">
                  💡 {item.notes}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 text-xs">
                  <a
                    href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(item.name)}&LH_Sold=1&LH_Complete=1`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#0a84ff] hover:underline flex items-center gap-1"
                    title="Check eBay Sold Comps"
                  >
                    <span>Sold Comps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => handleSendToCalc(item)}
                  className="px-3 py-1.5 rounded-xl bg-[#ff9800] hover:bg-[#e08600] text-black font-extrabold text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-sm"
                  title="Send to Calculator with $0.01 Buy Cost"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Send to 1¢ Calc</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Custom Penny Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#18181c] border border-[#ff9800]/50 rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-base font-bold text-[#ff9800] mb-3 flex items-center gap-2">
              <span>➕</span> Add Verified DG Penny Deal
            </h3>
            <form onSubmit={handleAddNewItem} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Item Name & Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Purex 4-in-1 Mountain Breeze Pacs 19ct"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] focus:border-[#ff9800] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    UPC / Barcode (Digits)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 037000123456"
                    value={newUpc}
                    onChange={(e) => setNewUpc(e.target.value)}
                    className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] font-mono focus:border-[#ff9800] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Tag / Dot Symbol
                  </label>
                  <select
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] focus:border-[#ff9800] outline-none"
                  >
                    {tagSymbols.filter((t) => t !== 'All').map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-2 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] focus:border-[#ff9800] outline-none"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Original Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    placeholder="10.00"
                    value={newOrigPrice}
                    onChange={(e) => setNewOrigPrice(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] font-mono focus:border-[#ff9800] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                    Est. Resell ($)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    placeholder="15.00"
                    value={newEstResell}
                    onChange={(e) => setNewEstResell(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] font-mono focus:border-[#ff9800] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">
                  Location / Sourcing Notes (Where on shelf?)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Found on top shelf in cleaning aisle. Black cap bottle."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] focus:border-[#ff9800] outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2c2c35]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#222227] text-[#92929d] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#ff9800] text-black hover:bg-[#e08600] transition-colors"
                >
                  Save Penny Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
