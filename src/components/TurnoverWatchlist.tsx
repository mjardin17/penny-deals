import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Plus, ExternalLink, Tag } from 'lucide-react';
import { WatchlistTopic } from '../types';
import { DEFAULT_WATCHLIST } from '../data/defaultWatchlist';

interface TurnoverWatchlistProps {
  onSelectItemForCalc: (itemName: string) => void;
  onNotify: (msg: string, type?: 'success' | 'info') => void;
}

export const TurnoverWatchlist: React.FC<TurnoverWatchlistProps> = ({
  onSelectItemForCalc,
  onNotify,
}) => {
  const [topics, setTopics] = useState<WatchlistTopic[]>(() => {
    const saved = localStorage.getItem('pennyWatchlist');
    return saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
  });
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newTopic: WatchlistTopic = {
      id: `topic-${Date.now()}`,
      season: 'Custom Watchlist',
      title: newTitle.trim(),
      description: newDesc.trim() || 'Custom tracked seasonal clearance turnover note.',
      recommendedStore: 'Local Big Box / Clearance',
    };
    const updated = [newTopic, ...topics];
    setTopics(updated);
    localStorage.setItem('pennyWatchlist', JSON.stringify(updated));
    setNewTitle('');
    setNewDesc('');
    setShowAddModal(false);
    onNotify('New watchlist item added!', 'success');
  };

  const handlePrefill = (title: string) => {
    onSelectItemForCalc(title);
    onNotify(`Pre-filled calculator with "${title}"`, 'info');
  };

  return (
    <div className="bg-[#18181c] p-4 sm:p-5 rounded-2xl mb-4 border border-[#2c2c35] shadow-md transition-all">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left group flex-1 focus:outline-none"
        >
          <span className="text-lg">🍁</span>
          <h2 className="text-base sm:text-lg font-bold text-[#f5f5f7] group-hover:text-[#ff9800] transition-colors">
            October Turnover Watchlist
          </h2>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#92929d] ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#92929d] ml-1" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="p-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#ff9800] transition-colors text-xs flex items-center gap-1 border border-[#2c2c35]"
            title="Add to Watchlist"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Note</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3.5 space-y-3.5 pt-2 border-t border-[#2c2c35]/50">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="border-l-[3px] border-[#ff9800] pl-3 py-0.5 group hover:bg-[#222227]/40 rounded-r-lg transition-colors pr-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-[#f5f5f7] text-sm tracking-tight flex items-center gap-1.5">
                  <span>{topic.title}</span>
                  {topic.recommendedStore && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222227] text-[#ff9800] font-normal border border-[#2c2c35]">
                      {topic.recommendedStore}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handlePrefill(topic.title)}
                    className="text-[11px] text-[#92929d] hover:text-[#ff9800] px-2 py-0.5 rounded bg-[#222227] border border-[#2c2c35] transition-colors"
                    title="Load into Arbitrage Calculator"
                  >
                    Quick Calc
                  </button>
                  <a
                    href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(topic.title)}&LH_Sold=1&LH_Complete=1`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#92929d] hover:text-[#0a84ff] p-1"
                    title="View eBay Sold Comps"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
              <p className="text-xs text-[#92929d] mt-1 leading-relaxed">
                {topic.description}
              </p>
              {topic.hotItems && topic.hotItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {topic.hotItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePrefill(`${topic.title} - ${item}`)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] hover:border-[#ff9800] border border-[#2c2c35] flex items-center gap-1 transition-colors"
                    >
                      <Tag className="w-2.5 h-2.5 text-[#ff9800]" />
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between text-[11px] text-[#92929d] pt-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#ff9800]" /> Pro Tip: Dollar General penny lists drop every Tuesday!
            </span>
          </div>
        </div>
      )}

      {/* Quick Add Custom Topic Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-base font-bold text-[#f5f5f7] mb-3">Add Custom Turnover Watch Item</h3>
            <form onSubmit={handleAddTopic} className="space-y-3">
              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">Item Title / Category</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Patio Propane Heaters"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] text-sm focus:border-[#ff9800] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#92929d] font-semibold uppercase block mb-1">Sourcing Intel / Strategy</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Markdowns start at 50% off mid-month, flip locally on OfferUp."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] text-sm focus:border-[#ff9800] outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
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
                  Save Watch Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
