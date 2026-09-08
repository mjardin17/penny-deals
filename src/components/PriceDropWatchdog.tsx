import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ShoppingBag,
  ExternalLink,
  DollarSign,
  Activity,
  Zap,
} from 'lucide-react';
import { soundFx } from '../utils/audioFeedback';

export interface WatchdogAlertTrigger {
  id: string;
  name: string;
  store: string;
  keyword: string;
  triggerCondition: string; // e.g., 'Price <= $0.05' | 'Markdown >= 70%' | 'Price ends in .02/.03'
  enabled: boolean;
  lastTriggered?: string;
  matchedItemsCount: number;
}

export interface WatchdogDropEvent {
  id: string;
  title: string;
  store: string;
  triggerName: string;
  oldPrice: number;
  newPrice: number;
  estResell: number;
  timestamp: string;
  category: string;
}

interface PriceDropWatchdogProps {
  zipCode: string;
  onAddToCart?: (deal: any) => void;
  onLoadIntoCalculator?: (deal: any) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenDiagnostic?: (deal: any) => void;
}

const DEFAULT_TRIGGERS: WatchdogAlertTrigger[] = [
  {
    id: 'trig-lowes-rtv',
    name: "Lowe's .02 RTV Power Tool Drop",
    store: "Lowe's",
    keyword: 'DeWalt / Milwaukee / Kobalt',
    triggerCondition: 'Price ends in .02 or .03',
    enabled: true,
    lastTriggered: '12 mins ago',
    matchedItemsCount: 2,
  },
  {
    id: 'trig-tgt-salvage',
    name: 'Target 70% / .04 Salvage Toys & Vacuums',
    store: 'Target',
    keyword: 'LEGO / Dyson / Barbie',
    triggerCondition: 'Markdown >= 70% or ends in .04',
    enabled: true,
    lastTriggered: '45 mins ago',
    matchedItemsCount: 3,
  },
  {
    id: 'trig-dg-penny',
    name: 'Dollar General Tuesday Morning 1¢ Drop',
    store: 'Dollar General',
    keyword: 'Seasonal / Yellow Dot / Blankets',
    triggerCondition: 'Price <= $0.01',
    enabled: true,
    lastTriggered: '2 hours ago',
    matchedItemsCount: 4,
  },
  {
    id: 'trig-poke-restock',
    name: 'Pokémon TCG 151 & Prismatic Evolutions',
    store: 'Target / Walmart',
    keyword: 'Booster Bundle / Elite Trainer Box',
    triggerCondition: 'In-Stock at MSRP or below',
    enabled: true,
    lastTriggered: 'Just now',
    matchedItemsCount: 1,
  },
];

export const PriceDropWatchdog: React.FC<PriceDropWatchdogProps> = ({
  zipCode,
  onAddToCart,
  onLoadIntoCalculator,
  onNotify,
  onOpenDiagnostic,
}) => {
  const [triggers, setTriggers] = useState<WatchdogAlertTrigger[]>(() => {
    try {
      const saved = localStorage.getItem('pennyHunterWatchdogTriggers');
      return saved ? JSON.parse(saved) : DEFAULT_TRIGGERS;
    } catch {
      return DEFAULT_TRIGGERS;
    }
  });

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newTriggerName, setNewTriggerName] = useState('');
  const [newTriggerStore, setNewTriggerStore] = useState("Lowe's");
  const [newTriggerKeyword, setNewTriggerKeyword] = useState('');
  const [newTriggerCondition, setNewTriggerCondition] = useState('Price <= $10.00');

  const [recentDrops, setRecentDrops] = useState<WatchdogDropEvent[]>([
    {
      id: 'drop-1',
      title: 'DeWalt 20V MAX XR Brushless 2-Tool Combo Kit',
      store: "Lowe's",
      triggerName: "Lowe's .02 RTV Power Tool Drop",
      oldPrice: 229.0,
      newPrice: 89.02,
      estResell: 299.0,
      timestamp: '14 mins ago',
      category: 'Power Tools',
    },
    {
      id: 'drop-2',
      title: 'LEGO Star Wars Ghost & Phantom II Building Set',
      store: 'Target',
      triggerName: 'Target 70% / .04 Salvage Toys & Vacuums',
      oldPrice: 159.99,
      newPrice: 47.98,
      estResell: 179.99,
      timestamp: '38 mins ago',
      category: 'Toys',
    },
    {
      id: 'drop-3',
      title: 'Holiday Ceramic Pumpkin Lantern (Penny Item)',
      store: 'Dollar General',
      triggerName: 'Dollar General Tuesday Morning 1¢ Drop',
      oldPrice: 15.0,
      newPrice: 0.01,
      estResell: 18.5,
      timestamp: '1 hr ago',
      category: 'Seasonal Clearance',
    },
  ]);

  useEffect(() => {
    try {
      localStorage.setItem('pennyHunterWatchdogTriggers', JSON.stringify(triggers));
    } catch {
      // Ignore
    }
  }, [triggers]);

  const handleToggleTrigger = (id: string) => {
    setTriggers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
    soundFx.playStandardScan();
  };

  const handleDeleteTrigger = (id: string) => {
    setTriggers((prev) => prev.filter((t) => t.id !== id));
    onNotify('Watchdog trigger deleted', 'info');
  };

  const handleCreateTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTriggerName.trim() || !newTriggerKeyword.trim()) {
      onNotify('Please enter a trigger name and keyword', 'error');
      return;
    }

    const newTrigger: WatchdogAlertTrigger = {
      id: `trig-${Date.now()}`,
      name: newTriggerName.trim(),
      store: newTriggerStore,
      keyword: newTriggerKeyword.trim(),
      triggerCondition: newTriggerCondition,
      enabled: true,
      lastTriggered: 'Never',
      matchedItemsCount: 0,
    };

    setTriggers((prev) => [newTrigger, ...prev]);
    setNewTriggerName('');
    setNewTriggerKeyword('');
    setShowAddForm(false);
    soundFx.playHighProfitChime();
    onNotify(`Created Watchdog trigger: "${newTrigger.name}"!`, 'success');
  };

  const handleSimulateWatchdogPing = () => {
    setIsScanning(true);
    soundFx.playStandardScan();

    setTimeout(() => {
      setIsScanning(false);
      soundFx.playPennyJackpot();

      const freshDrop: WatchdogDropEvent = {
        id: `drop-${Date.now()}`,
        title: `Kobalt 40V Cordless Brushless Blower Kit (.03 Cut)`,
        store: "Lowe's",
        triggerName: "Lowe's .02 RTV Power Tool Drop",
        oldPrice: 149.0,
        newPrice: 39.03,
        estResell: 139.0,
        timestamp: 'Just now',
        category: 'Outdoor Tools',
      };

      setRecentDrops((prev) => [freshDrop, ...prev]);
      onNotify('🚨 FLASH PRICE DROP DETECTED: Kobalt 40V Kit dropped to $39.03 at Lowe\'s!', 'success');
    }, 600);
  };

  const handleBagDrop = (drop: WatchdogDropEvent) => {
    soundFx.playPennyJackpot();
    if (onAddToCart) {
      onAddToCart({
        title: drop.title,
        buyPrice: drop.newPrice,
        sellPrice: drop.estResell,
        store: drop.store,
        category: drop.category,
        notes: `Triggered by Watchdog: ${drop.triggerName}`,
      });
    }
    onNotify(`Bagged "${drop.title}"! Added to Sourcing Cart.`, 'success');
  };

  return (
    <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-3.5 sm:p-5 mb-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/30">
              <BellRing className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-[#f5f5f7] tracking-tight">
              Markdown Watchdog & Flash Drop Triggers
            </h2>
          </div>
          <p className="text-xs text-[#92929d] mt-1">
            Automated price-drop sentinel monitoring big-box markdowns (.01 penny, .02 Lowe&apos;s RTV, .04 Target salvage) for ZIP <strong className="text-[#ffd60a] font-mono">{zipCode}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isScanning}
            onClick={handleSimulateWatchdogPing}
            className="px-3 py-1.5 rounded-xl bg-[#ff453a] hover:bg-[#e03b30] disabled:opacity-40 text-white font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isScanning ? 'Pinging Feeds...' : 'Ping Watchdog Feeds'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#ffd60a] flex items-center gap-1.5 transition-colors cursor-pointer border border-[#2c2c35]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Alert Trigger</span>
          </button>
        </div>
      </div>

      {/* Add Custom Trigger Form (Collapsible) */}
      {showAddForm && (
        <form
          onSubmit={handleCreateTrigger}
          className="p-3.5 bg-[#121215] border border-[#ffd60a]/30 rounded-xl space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#ffd60a] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Create Custom Markdown Trigger
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-[#92929d] hover:text-[#f5f5f7]"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-[#92929d] font-bold block mb-1">Trigger Name</label>
              <input
                type="text"
                required
                value={newTriggerName}
                onChange={(e) => setNewTriggerName(e.target.value)}
                placeholder="e.g., Dyson Vacuum Salvage Alert"
                className="w-full bg-[#18181c] border border-[#2c2c35] rounded-lg p-2 text-xs text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#92929d] font-bold block mb-1">Target Retailer</label>
              <select
                value={newTriggerStore}
                onChange={(e) => setNewTriggerStore(e.target.value)}
                className="w-full bg-[#18181c] border border-[#2c2c35] rounded-lg p-2 text-xs text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
              >
                <option value="Lowe's">Lowe&apos;s</option>
                <option value="Target">Target</option>
                <option value="Dollar General">Dollar General</option>
                <option value="The Home Depot">The Home Depot</option>
                <option value="Walmart Supercenter">Walmart Supercenter</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#92929d] font-bold block mb-1">Keyword / UPC</label>
              <input
                type="text"
                required
                value={newTriggerKeyword}
                onChange={(e) => setNewTriggerKeyword(e.target.value)}
                placeholder="e.g., DeWalt, LEGO, Vacuum"
                className="w-full bg-[#18181c] border border-[#2c2c35] rounded-lg p-2 text-xs text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#92929d] font-bold block mb-1">Trigger Rule</label>
              <input
                type="text"
                value={newTriggerCondition}
                onChange={(e) => setNewTriggerCondition(e.target.value)}
                placeholder="e.g., Price <= $10 or Ends in .02"
                className="w-full bg-[#18181c] border border-[#2c2c35] rounded-lg p-2 text-xs text-[#f5f5f7] outline-none focus:border-[#ffd60a]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-[#ffd60a] hover:bg-[#ffc107] text-black font-black text-xs cursor-pointer shadow-sm"
            >
              Save Alert Sentinel
            </button>
          </div>
        </form>
      )}

      {/* Trigger Sentinels List */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-[#92929d] uppercase tracking-wider block">
          Active Watchdog Sentinels ({triggers.filter((t) => t.enabled).length} Online)
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {triggers.map((trigger) => (
            <div
              key={trigger.id}
              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                trigger.enabled
                  ? 'bg-[#121215] border-[#2c2c35] hover:border-[#ffd60a]/40'
                  : 'bg-[#121215]/50 border-[#2c2c35]/50 opacity-60'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleTrigger(trigger.id)}
                    className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${
                      trigger.enabled ? 'bg-[#30d158] ring-2 ring-[#30d158]/40' : 'bg-[#92929d]'
                    }`}
                    title={trigger.enabled ? 'Trigger Active' : 'Trigger Paused'}
                  />
                  <h4 className="font-bold text-[#f5f5f7] truncate">{trigger.name}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222227] text-[#ffd60a] font-mono">
                    {trigger.store}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#92929d] flex-wrap">
                  <span>
                    Rule: <strong className="text-[#f5f5f7]">{trigger.triggerCondition}</strong>
                  </span>
                  <span>Target: {trigger.keyword}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDeleteTrigger(trigger.id)}
                  className="p-1.5 rounded-lg bg-[#222227] hover:bg-[#ff453a]/20 text-[#92929d] hover:text-[#ff453a] transition-colors cursor-pointer border border-[#2c2c35]"
                  title="Delete Trigger"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Markdown Event Feed */}
      <div className="space-y-2 pt-2 border-t border-[#2c2c35]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#30d158] uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#30d158]" />
            Recent Flash Price Drops Caught by Watchdog
          </span>
          <span className="text-[10px] text-[#92929d]">Real-time sentinel feed</span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {recentDrops.map((drop) => (
            <div
              key={drop.id}
              className="p-3 bg-[#121215] border border-[#2c2c35] hover:border-[#30d158]/40 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/40">
                    🔥 FLASH DROP
                  </span>
                  <span className="text-[11px] text-[#ffd60a] font-mono font-bold">{drop.store}</span>
                  <span className="text-[10px] text-[#92929d]">{drop.timestamp}</span>
                </div>
                <h4 className="font-bold text-[#f5f5f7] mt-1 truncate">{drop.title}</h4>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#92929d] flex-wrap">
                  <span className="line-through text-[#92929d]">Was: ${drop.oldPrice.toFixed(2)}</span>
                  <span>
                    Now:{' '}
                    <strong className="text-[#ffd60a] font-mono text-xs font-black">
                      ${drop.newPrice.toFixed(2)}
                    </strong>
                  </span>
                  <span>
                    Resell Comp: <strong className="text-[#0a84ff] font-mono">${drop.estResell.toFixed(2)}</strong>
                  </span>
                  <span>
                    Profit:{' '}
                    <strong className="text-[#30d158] font-mono font-bold">
                      +${(drop.estResell * 0.85 - drop.newPrice).toFixed(2)}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onOpenDiagnostic && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenDiagnostic({
                        title: drop.title,
                        buyPrice: drop.newPrice,
                        sellPrice: drop.estResell,
                        store: drop.store,
                        category: drop.category,
                      })
                    }
                    className="p-1.5 rounded-lg bg-[#222227] hover:bg-[#0a84ff]/20 text-[#0a84ff] transition-colors cursor-pointer border border-[#2c2c35]"
                    title="AI Risk Diagnostic"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                )}

                {onLoadIntoCalculator && (
                  <button
                    type="button"
                    onClick={() =>
                      onLoadIntoCalculator({
                        title: drop.title,
                        buyPrice: drop.newPrice,
                        sellPrice: drop.estResell,
                        store: drop.store,
                      })
                    }
                    className="p-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] transition-colors cursor-pointer border border-[#2c2c35]"
                    title="Load into Calculator"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-[#30d158]" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleBagDrop(drop)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#30d158] hover:bg-[#28b84c] text-black font-black text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Bag</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
