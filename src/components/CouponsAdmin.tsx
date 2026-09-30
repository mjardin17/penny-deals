import React, { useEffect, useState } from 'react';
import { Tag, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { Coupon, CouponSourceStatus, fetchAllCouponsForAdmin, fetchCouponSources } from '../utils/coupons';

interface CouponsAdminProps {
  onNotify?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const inputCls =
  'w-full bg-[#222227] border border-[#2c2c35] rounded-lg px-3 py-2 text-sm text-[#f5f5f7] focus:border-[#ff9800] outline-none';

const emptyForm = { code: '', merchant: '', title: '', discountText: '', expiresAt: '', affiliateUrl: '' };

export const CouponsAdmin: React.FC<CouponsAdminProps> = ({ onNotify }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [sources, setSources] = useState<CouponSourceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const [c, s] = await Promise.all([fetchAllCouponsForAdmin(), fetchCouponSources()]);
    setCoupons(c);
    setSources(s);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, expiresAt: new Date(form.expiresAt).toISOString() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to add coupon');
      setForm(emptyForm);
      onNotify?.('Coupon added', 'success');
      await load();
    } catch (err: any) {
      onNotify?.(err?.message || 'Failed to add coupon', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(id: string) {
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to deactivate');
      onNotify?.('Coupon deactivated', 'info');
      await load();
    } catch (err: any) {
      onNotify?.(err?.message || 'Failed to deactivate coupon', 'error');
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2 m-0">
          <Tag className="w-4 h-4 text-[#ff9800]" /> Coupons
        </h3>
        <button
          type="button"
          onClick={load}
          className="text-xs text-[#92929d] hover:text-[#f5f5f7] flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {sources.map((s) => (
          <span
            key={s.source}
            title={s.detail}
            className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
              s.state === 'ok'
                ? 'border-[#30d158] text-[#30d158]'
                : s.state === 'not_implemented'
                ? 'border-[#ff9f0a] text-[#ff9f0a]'
                : 'border-[#2c2c35] text-[#92929d]'
            }`}
          >
            {s.source}: {s.state}
          </span>
        ))}
      </div>

      <form onSubmit={submit} className="grid grid-cols-2 gap-2 mb-4 bg-[#18181c] border border-[#2c2c35] rounded-xl p-3">
        <input required placeholder="Code (e.g. SAVE10)" className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input required placeholder="Merchant (e.g. Amazon)" className={inputCls} value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} />
        <input required placeholder="Title" className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input required placeholder="Discount text (e.g. 10% off)" className={inputCls} value={form.discountText} onChange={(e) => setForm({ ...form, discountText: e.target.value })} />
        <input required type="date" className={inputCls} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        <input required type="url" placeholder="Affiliate/buy URL" className={inputCls} value={form.affiliateUrl} onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })} />
        <button type="submit" disabled={submitting} className="col-span-2 bg-[#ff9800] text-black font-bold rounded-lg py-2 text-sm">
          {submitting ? 'Adding…' : 'Add coupon'}
        </button>
      </form>

      {loading ? (
        <p className="text-xs text-[#92929d]">Loading…</p>
      ) : coupons.length === 0 ? (
        <p className="text-xs text-[#92929d]">No coupons yet.</p>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => {
            const expired = new Date(c.expiresAt).getTime() <= Date.now();
            return (
              <div key={c.id} className="flex items-center justify-between gap-2 bg-[#18181c] border border-[#2c2c35] rounded-xl p-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2">
                    {c.merchant} · <code className="text-[#ff9800]">{c.code}</code>
                    {!c.active && <span className="text-[10px] text-[#92929d] border border-[#2c2c35] rounded px-1">inactive</span>}
                    {expired && <span className="text-[10px] text-[#ff453a] border border-[#ff453a]/40 rounded px-1">expired</span>}
                  </div>
                  <div className="text-xs text-[#92929d] truncate">
                    {c.title} — {c.discountText} — expires {new Date(c.expiresAt).toLocaleDateString()} — source: {c.source}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={c.affiliateUrl} target="_blank" rel="noreferrer" className="text-[#64d2ff]">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {c.active && (
                    <button type="button" onClick={() => deactivate(c.id)} className="text-[#ff453a]" title="Deactivate">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
