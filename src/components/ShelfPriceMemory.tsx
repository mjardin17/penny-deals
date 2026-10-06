import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { History, Save } from 'lucide-react';

interface PricePoint {
  price: number;
  store?: string;
  seenAt: number;
}

interface PaidHistory {
  count: number;
  last?: PricePoint;
  lowest?: PricePoint;
  highest?: PricePoint;
}

interface ShelfPriceMemoryProps {
  upc: string;
  title: string;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const STORES = ["Walmart", "Target", "Home Depot", "Lowe's", "Dollar General", "Costco", "Sam's Club", "Best Buy", "Family Dollar"];
const LAST_STORE_KEY = 'pennyLastShelfStore';

function readLastStore(): string {
  try {
    return localStorage.getItem(LAST_STORE_KEY) || '';
  } catch {
    return '';
  }
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function ago(ms: number): string {
  const days = Math.round((startOfDay(Date.now()) - startOfDay(ms)) / 86_400_000);
  if (days <= 0) return 'today';
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

function describe(p: PricePoint): string {
  return `$${p.price.toFixed(2)}${p.store ? ` at ${p.store}` : ''}, ${ago(p.seenAt)}`;
}

/**
 * Takes the price YOU see on the shelf and remembers it. The scanner's built-in lookup
 * is sample data, so its price is never saved; only what you type here is.
 */
export const ShelfPriceMemory: React.FC<ShelfPriceMemoryProps> = ({ upc, title, onNotify }) => {
  const [price, setPrice] = useState('');
  const [store, setStore] = useState(readLastStore);
  const [history, setHistory] = useState<PaidHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const listId = useId();

  // The item being looked at. A late answer for a previous scan must never show up under the new one.
  const itemId = upc || title;
  const currentItem = useRef(itemId);
  currentItem.current = itemId;

  const loadHistory = useCallback(async () => {
    const asked = itemId;
    try {
      const params = new URLSearchParams({ title });
      if (upc) params.set('upc', upc);
      const res = await fetch(`/api/brain/item?${params}`);
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || `HTTP ${res.status}`);
      if (currentItem.current !== asked) return;
      setHistory(body.data.yourPrices as PaidHistory);
      setError(null);
    } catch (err) {
      if (currentItem.current !== asked) return;
      setHistory(null);
      setError(`Memory unavailable: ${(err as Error).message}`);
    }
  }, [itemId, title, upc]);

  // Clear what was typed only when a different item is scanned, not when the same item's name updates.
  useEffect(() => {
    setPrice('');
    setHistory(null);
  }, [itemId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) {
      onNotify('Type the shelf price first (a number above 0).', 'error');
      return;
    }
    const savedFor = itemId;
    const cleanStore = store.trim();
    setSaving(true);
    try {
      const res = await fetch('/api/brain/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, upc, price: value, store: cleanStore || undefined }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || `HTTP ${res.status}`);
      try {
        localStorage.setItem(LAST_STORE_KEY, cleanStore);
      } catch {
        // Remembering the last store is a convenience only.
      }
      if (body.data.saved) onNotify(`Remembered $${value.toFixed(2)}${cleanStore ? ` at ${cleanStore}` : ''}.`, 'success');
      else onNotify('That price is already saved from the last hour.', 'info');
      if (currentItem.current === savedFor) {
        setPrice('');
        await loadHistory();
      }
    } catch (err) {
      onNotify(`Could not save the price: ${(err as Error).message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#18181c] p-3 rounded-xl border border-[#2c2c35] space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#ffd60a] uppercase tracking-wide">
        <History className="w-3.5 h-3.5" />
        <span>Price on the shelf (you type it, I remember it)</span>
      </div>

      <form onSubmit={handleSave} className="flex items-center gap-2 flex-wrap">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="$ shelf price"
          aria-label="Shelf price"
          className="w-28 px-2 py-1.5 rounded-lg bg-[#0f0f12] border border-[#2c2c35] text-sm text-[#f5f5f7] focus:outline-none focus:border-[#ffd60a]"
        />
        <input
          list={listId}
          value={store}
          onChange={(e) => setStore(e.target.value)}
          placeholder="Store"
          aria-label="Store"
          className="flex-1 min-w-[110px] px-2 py-1.5 rounded-lg bg-[#0f0f12] border border-[#2c2c35] text-sm text-[#f5f5f7] focus:outline-none focus:border-[#ffd60a]"
        />
        <datalist id={listId}>
          {STORES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 rounded-lg bg-[#ffd60a] text-black text-xs font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving…' : 'Remember'}</span>
        </button>
      </form>

      {error && <p className="text-[11px] text-[#ff453a]">{error}</p>}
      {history && history.count === 0 && !error && (
        <p className="text-[11px] text-[#92929d]">No price saved for this item yet.</p>
      )}
      {history && history.count > 0 && history.last && (
        <ul className="text-[11px] text-[#92929d] space-y-0.5">
          <li>
            Last you saw: <span className="text-[#f5f5f7] font-semibold">{describe(history.last)}</span> ({history.count} saved)
          </li>
          {history.lowest && history.count > 1 && (
            <li>
              Lowest: <span className="text-[#30d158] font-semibold">{describe(history.lowest)}</span>
            </li>
          )}
          {history.highest && history.count > 1 && (
            <li>
              Highest: <span className="text-[#ff9f0a] font-semibold">{describe(history.highest)}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
