import React, { useEffect, useRef, useState } from 'react';
import { CHANNEL_LABELS, ProfitResult, SalesChannel } from '../../../shared/fees';
import { lookupUpcTitle } from '../lookupUpc';
import { parseShelfPrice, safeHttpsUrl } from '../format';
import { Coupon, fetchCouponsForMerchant } from '../../utils/coupons';

/** Mirrors server/learning/loggedSpread.ts LoggedSpreadReport (JSON shape). */
interface ChannelSpread {
  channel: SalesChannel;
  status: 'ok' | 'not_configured' | 'no_match' | 'insufficient_comps' | 'error';
  statusMessage: string;
  resalePrice?: number;
  resaleBasis?: string;
  matchedTitle?: string;
  matchUrl?: string;
  profit?: ProfitResult;
  isRealSpread: boolean;
}

interface LoggedSpreadReport {
  packageAssumed: boolean;
  channels: ChannelSpread[];
  bestRealSpread?: ChannelSpread | null;
  checkedAt: string;
  predictionId: string;
  confidenceLabel: string | null;
  /** Prices you typed for this item before this check. */
  yourPriceHistory?: { count: number; last?: PricePoint; lowest?: PricePoint };
}

interface PricePoint {
  price: number;
  store?: string;
  seenAt: number;
}

interface PendingPrediction {
  id: string;
  timestamp: string;
  title: string;
  store?: string;
  buyPrice: number;
  predictedResale?: number;
  predictedProfit?: number;
  category: string;
}

const CATEGORY = 'penny-scan';

function CouponBadge({ merchant }: { merchant?: string }) {
  const [coupon, setCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!merchant) {
      setCoupon(null);
      return;
    }
    fetchCouponsForMerchant(merchant).then((coupons) => {
      if (!cancelled) setCoupon(coupons[0] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [merchant]);

  if (!coupon) return null;

  return (
    <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: '#1a1a1e', border: '1px solid #ff9800' }}>
      <div style={{ fontSize: 12, color: '#ff9800', fontWeight: 700 }}>
        {coupon.merchant} coupon: {coupon.discountText}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <code style={{ fontSize: 13, color: '#f5f5f7', background: '#0b0b0d', padding: '2px 8px', borderRadius: 6 }}>
          {coupon.code}
        </code>
        {safeHttpsUrl(coupon.affiliateUrl) && (
          <a
            href={safeHttpsUrl(coupon.affiliateUrl)!}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13, fontWeight: 700, color: '#000', background: '#ff9800', padding: '4px 10px', borderRadius: 8, textDecoration: 'none' }}
          >
            Claim
          </a>
        )}
      </div>
    </div>
  );
}

function money(n: number): string {
  return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;
}

function VerdictCard({ report, store, onWrongMatch }: { report: LoggedSpreadReport; store?: string; onWrongMatch?: (matchUrl: string) => void }) {
  const mine = report.yourPriceHistory;
  const best = report.bestRealSpread ?? report.channels.find((c) => c.status === 'ok');
  const isBuy = Boolean(report.bestRealSpread);

  return (
    <>
      <section className="pd-receipt" aria-label="Verdict">
        <div className="pd-receipt__head">
          <div>
            <div className="pd-small" style={{ letterSpacing: '0.14em', fontWeight: 800 }}>PENNY DEALS / SPREAD CHECK</div>
            <div className="pd-ink-soft">{new Date(report.checkedAt).toLocaleString()}</div>
            {report.confidenceLabel && <div className="pd-ink-soft">Confidence: {report.confidenceLabel}</div>}
          </div>
          <div className={`pd-stamp ${isBuy ? 'pd-stamp--buy' : 'pd-stamp--pass'}`} role="status">
            {isBuy ? 'Buy' : 'Pass'}
          </div>
        </div>

        {best?.status === 'ok' && best.profit ? (
          <>
            <div className="pd-line">
              <span>{CHANNEL_LABELS[best.channel]} resale</span>
              <span>{money(best.resalePrice ?? 0)}</span>
            </div>
            {best.profit.lines.map((l) => (
              <div className="pd-line" key={l.label}>
                <span>{l.label}</span>
                <span>-{money(Math.abs(l.amount))}</span>
              </div>
            ))}
            <div className="pd-line pd-line--total">
              <span>NET PROFIT</span>
              <span>
                {money(best.profit.netProfit)}
                {Number.isFinite(best.profit.roiPct) ? ` (${best.profit.roiPct.toFixed(0)}% ROI)` : ''}
              </span>
            </div>
            <p className="pd-ink-soft" style={{ margin: '10px 0 0' }}>{best.resaleBasis}</p>
            {report.packageAssumed && <p className="pd-ink-soft" style={{ margin: '4px 0 0' }}>Postage assumes a 1 lb, 10x8x4 in package.</p>}
            {best.matchUrl && (
              <p style={{ margin: '10px 0 0', fontSize: 13 }}>
                <a href={best.matchUrl} target="_blank" rel="noreferrer">View the matched listing</a>
              </p>
            )}
            {best.matchUrl && onWrongMatch && (
              <button className="pd-receipt__btn" style={{ marginTop: 6 }} onClick={() => onWrongMatch(best.matchUrl as string)}>
                Not the same item (never use it again)
              </button>
            )}
          </>
        ) : (
          report.channels.map((c) => (
            <div className="pd-line" key={c.channel}>
              <span>{CHANNEL_LABELS[c.channel]}</span>
              <span style={{ textAlign: 'right', maxWidth: '65%' }}>{c.statusMessage}</span>
            </div>
          ))
        )}

        {mine && mine.count > 0 && mine.last && (
          <p className="pd-ink-soft" style={{ margin: '12px 0 0' }}>
            Before this check you saved {mine.count} price(s) for this item. Last {money(mine.last.price)}
            {mine.last.store ? ` at ${mine.last.store}` : ''}
            {mine.lowest && mine.count > 1 ? `. Lowest ${money(mine.lowest.price)}${mine.lowest.store ? ` at ${mine.lowest.store}` : ''}` : ''}.
          </p>
        )}
      </section>
      <CouponBadge merchant={store} />
    </>
  );
}

const CAMERA_STORAGE_KEY = 'pennyPhoneCameraId';

export function ScanScreen() {
  const [upc, setUpc] = useState('');
  const [title, setTitle] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [store, setStore] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>(() => {
    try {
      return localStorage.getItem(CAMERA_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<LoggedSpreadReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diag, setDiag] = useState('not started');
  const [notice, setNotice] = useState<string | null>(null);
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  // Serializes every start()/stop() call on the scanner so React StrictMode's
  // double-invoked effect (mount -> cleanup -> mount, in dev mode) can never
  // fire an overlapping start() while the previous instance is still stopping
  // -- that race is exactly what throws "Cannot clear while scan is ongoing."
  const opQueueRef = useRef<Promise<void>>(Promise.resolve());
  const readerId = 'phone-scan-viewport';

  function queueOp(op: () => Promise<void>): Promise<void> {
    const next = opQueueRef.current.then(op, op);
    opQueueRef.current = next;
    return next;
  }

  async function onDecoded(decodedText: string) {
    const code = decodedText.trim();
    setUpc(code);
    await queueOp(async () => {
      if (scannerRef.current?.isScanning) await scannerRef.current.stop();
    });
    const found = await lookupUpcTitle(code);
    if (found) setTitle(found);
  }

  function describeVideoElement(): string {
    const container = document.getElementById(readerId);
    const video = container?.querySelector('video');
    if (!container) return 'container missing';
    if (!video) return `no <video> yet (container ${container.clientWidth}x${container.clientHeight})`;
    return (
      `video ${video.videoWidth}x${video.videoHeight}, ` +
      `el ${video.clientWidth}x${video.clientHeight}, ` +
      `readyState=${video.readyState}, paused=${video.paused}, ` +
      `srcObject=${video.srcObject ? 'set' : 'null'}`
    );
  }

  // The scanning library calls videoElement.play() internally but never awaits or
  // catches it -- if Safari silently rejects that call (autoplay policy, or the
  // element wasn't "ready" yet), the library has no idea and the stream just sits
  // there paused forever with no error anywhere. This retries play() ourselves and
  // surfaces the real rejection reason instead of staying silently stuck.
  async function forcePlay(label: string) {
    const container = document.getElementById(readerId);
    const video = container?.querySelector('video');
    if (!video) {
      setDiag(`${label}: ` + describeVideoElement());
      return;
    }
    if (!video.paused) {
      setDiag(`${label}: already playing -- ` + describeVideoElement());
      return;
    }
    try {
      await video.play();
      setDiag(`${label}: play() succeeded -- ` + describeVideoElement());
    } catch (err: any) {
      setDiag(`${label}: play() REJECTED: ${err?.name || ''} ${err?.message || String(err)} -- ` + describeVideoElement());
    }
  }

  function startScan(cameraTarget: string | { facingMode: string }): Promise<void> {
    return queueOp(async () => {
      const scanner = scannerRef.current;
      if (!scanner) return;
      if (scanner.isScanning) {
        try {
          await scanner.stop();
        } catch {
          // best effort -- start() below will surface any real problem
        }
      }
      setCameraError(null);
      setDiag('requesting camera...');
      try {
        await scanner.start(
          cameraTarget,
          { fps: 12, qrbox: { width: 260, height: 160 } },
          (decodedText) => void onDecoded(decodedText),
          () => {}
        );
        setDiag('start() resolved: ' + describeVideoElement());

        // Retry play() when the browser actually signals it has data, instead of
        // guessing with fixed delays -- and keep the delays too as a fallback in
        // case those events never fire at all (which is itself diagnostic).
        const video = document.getElementById(readerId)?.querySelector('video');
        if (video) {
          const onReady = () => void forcePlay(`event:${video.readyState >= 1 ? 'loadedmetadata' : 'canplay'}`);
          video.addEventListener('loadedmetadata', onReady, { once: true });
          video.addEventListener('canplay', onReady, { once: true });
        }
        setTimeout(() => forcePlay('after 500ms'), 500);
        setTimeout(() => forcePlay('after 2s'), 2000);
        setTimeout(() => forcePlay('after 5s'), 5000);
      } catch (err: any) {
        setCameraError(err?.message || 'Camera not available. Type the UPC manually below.');
        setDiag('start() threw: ' + (err?.name || '') + ' ' + (err?.message || String(err)));
      }
    });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      if (cancelled) return;
      // Reused across React StrictMode's dev-mode double-invoke of this effect --
      // refs survive that cycle, so only create the scanner once.
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
          ],
          verbose: false,
        });
      }

      await startScan(selectedCameraId || { facingMode: 'environment' });
      if (cancelled) return;

      // Listing cameras needs a permission grant, which the start() call above just got us.
      try {
        const found = await Html5Qrcode.getCameras();
        if (!cancelled) setCameras(found);
      } catch {
        // Camera list is a nice-to-have; scanning already works without it.
      }
    })();

    return () => {
      cancelled = true;
      queueOp(async () => {
        if (scannerRef.current?.isScanning) {
          try {
            await scannerRef.current.stop();
          } catch {
            // ignore -- component is unmounting either way
          }
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCameraChange(id: string) {
    setSelectedCameraId(id);
    try {
      localStorage.setItem(CAMERA_STORAGE_KEY, id);
    } catch {
      // best effort
    }
    await startScan(id || { facingMode: 'environment' });
  }

  async function rescan() {
    setReport(null);
    setError(null);
    setUpc('');
    setTitle('');
    await startScan(selectedCameraId || { facingMode: 'environment' });
  }

  async function markWrongMatch(matchUrl: string) {
    try {
      const res = await fetch('/api/brain/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'wrong_match', title: title.trim(), upc: upc || undefined, matchUrl }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setNotice("Got it. That listing won't be used for this item again. Check again for a new match.");
    } catch (err) {
      setNotice(`Could not save that: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function checkSpread() {
    const price = parseShelfPrice(buyPrice);
    if (!title.trim()) return setError('Enter a title (or scan a barcode first).');
    if (price === null) return setError('Enter the price on the shelf. It has to be more than $0.');

    setChecking(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch('/api/arbitrage/spread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), buyPrice: price, upc: upc || undefined, store: store || undefined, category: CATEGORY, source: 'penny-scan', priceIsUserTyped: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Spread check failed');
      setReport(json.data as LoggedSpreadReport);
    } catch (err: any) {
      setError(err?.message || 'Spread check failed');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="pd-stack">
      <div>
        <h1 className="pd-h1">Scan</h1>
        <p className="pd-lede">Point the camera at a barcode, or type it. You get a buy or pass from live eBay prices and real fees, never a guess.</p>
      </div>

      <div className="pd-card">
        <div id={readerId} style={{ width: '100%', borderRadius: 10, overflow: 'hidden', background: '#000', minHeight: 220 }} />
        {cameraError && <div className="pd-banner pd-banner--warn" style={{ marginTop: 10 }}>{cameraError}</div>}
        {cameras.length > 1 && (
          <label className="pd-small pd-muted" style={{ display: 'grid', gap: 4, marginTop: 10 }}>
            Camera
            <select className="pd-select" value={selectedCameraId} onChange={(e) => onCameraChange(e.target.value)}>
              <option value="">Default (rear)</option>
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || cam.id}
                </option>
              ))}
            </select>
          </label>
        )}
        <details style={{ marginTop: 8 }}>
          <summary className="pd-small pd-muted" style={{ cursor: 'pointer' }}>Camera details</summary>
          <p className="pd-mono pd-small pd-muted" style={{ wordBreak: 'break-word' }}>{diag}</p>
        </details>
      </div>

      <div className="pd-card pd-stack">
        <label className="pd-small pd-muted" style={{ display: 'grid', gap: 4 }}>
          Barcode (fills in when you scan)
          <input className="pd-input pd-mono" value={upc} onChange={(e) => setUpc(e.target.value)} placeholder="scan or type" inputMode="numeric" />
        </label>
        <label className="pd-small pd-muted" style={{ display: 'grid', gap: 4 }}>
          What is it?
          <input className="pd-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product name" />
        </label>
        <div className="pd-row" style={{ alignItems: 'stretch' }}>
          <label className="pd-small pd-muted" style={{ display: 'grid', gap: 4, flex: 1, minWidth: 130 }}>
            Price on the shelf ($)
            <input className="pd-input pd-mono" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} inputMode="decimal" placeholder="1.00" />
          </label>
          <label className="pd-small pd-muted" style={{ display: 'grid', gap: 4, flex: 1, minWidth: 130 }}>
            Store (optional)
            <input className="pd-input" value={store} onChange={(e) => setStore(e.target.value)} placeholder="Dollar General" />
          </label>
        </div>
        <button className="pd-btn" onClick={checkSpread} disabled={checking}>
          {checking ? 'Checking live prices…' : 'Check it'}
        </button>
        {report && (
          <button className="pd-btn pd-btn--ghost" onClick={rescan}>
            Scan another
          </button>
        )}
        {error && <div className="pd-banner pd-banner--bad" role="alert">{error}</div>}
        {notice && <div className="pd-banner pd-banner--warn">{notice}</div>}
      </div>

      {report && <VerdictCard report={report} store={store} onWrongMatch={markWrongMatch} />}
    </div>
  );
}

export function MineScreen() {
  const [items, setItems] = useState<PendingPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [soldPrice, setSoldPrice] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/learning/pending');
      const json = await res.json();
      if (json.success) {
        setItems(json.data as PendingPrediction[]);
        setError(null);
      } else setError(json.error || 'Failed to load');
    } catch (err: any) {
      setError(err?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitOutcome(id: string, stage: 'bought' | 'sold', actualPrice?: number) {
    try {
      const res = await fetch('/api/learning/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stage, actualPrice }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setError(null);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not save that.');
    }
  }

  return (
    <div className="pd-stack">
      <div>
        <h1 className="pd-h1">My scans</h1>
        <p className="pd-lede">Tell the app what really happened. Every real result makes its next estimate better. It only learns from what you report.</p>
      </div>
      {error && <div className="pd-banner pd-banner--bad" role="alert">{error}</div>}
      {loading && <div className="pd-skeleton" />}
      {!loading && items.length === 0 && !error && (
        <div className="pd-banner pd-banner--info">Nothing waiting. Items you check on the Scan screen show up here until you say whether you bought and sold them.</div>
      )}
      {items.map((item) => (
        <div key={item.id} className="pd-card pd-stack">
          <div>
            <div style={{ fontWeight: 700 }}>{item.title}</div>
            <div className="pd-small pd-muted pd-mono">
              ${item.buyPrice.toFixed(2)}{item.store ? ` at ${item.store}` : ''}
              {item.predictedResale !== undefined ? ` / predicted resale $${item.predictedResale.toFixed(2)}` : ''}
            </div>
          </div>
          <div className="pd-row">
            <button className="pd-btn pd-btn--small" onClick={() => submitOutcome(item.id, 'bought')}>
              I bought it
            </button>
            <input
              className="pd-input pd-mono"
              style={{ width: 120 }}
              value={soldPrice[item.id] ?? ''}
              onChange={(e) => setSoldPrice((v) => ({ ...v, [item.id]: e.target.value }))}
              placeholder="sold for $"
              inputMode="decimal"
              aria-label={`Sold price for ${item.title}`}
            />
            <button
              className="pd-btn pd-btn--small pd-btn--ghost"
              onClick={() => submitOutcome(item.id, 'sold', Number(soldPrice[item.id]))}
              disabled={!soldPrice[item.id] || !Number.isFinite(Number(soldPrice[item.id]))}
            >
              Sold it
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
