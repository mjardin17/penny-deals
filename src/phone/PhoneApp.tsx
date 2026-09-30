import React, { useEffect, useRef, useState } from 'react';
import { CHANNEL_LABELS, ProfitResult, SalesChannel } from '../../shared/fees';
import { lookupBarcodeAsync } from '../utils/barcodeLookup';

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

type Tab = 'scan' | 'mine';

const CATEGORY = 'penny-scan';

function VerdictCard({ report }: { report: LoggedSpreadReport }) {
  const best = report.bestRealSpread ?? report.channels.find((c) => c.status === 'ok');
  const isBuy = Boolean(report.bestRealSpread);

  return (
    <div
      style={{
        marginTop: 16,
        borderRadius: 16,
        padding: 16,
        background: isBuy ? '#0f5c3f' : '#3a1f1f',
        border: `2px solid ${isBuy ? '#30d158' : '#ff453a'}`,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 900, color: isBuy ? '#30d158' : '#ff453a' }}>
        {isBuy ? 'BUY' : "DON'T BUY"}
      </div>
      {report.confidenceLabel && (
        <div style={{ fontSize: 12, color: '#ccc', marginTop: 2 }}>Confidence: {report.confidenceLabel}</div>
      )}
      {best?.status === 'ok' ? (
        <div style={{ marginTop: 10, fontSize: 14, color: '#f5f5f7' }}>
          <div>
            {CHANNEL_LABELS[best.channel]} resale ~${best.resalePrice?.toFixed(2)} ({best.resaleBasis})
          </div>
          {best.profit && (
            <div style={{ marginTop: 4, fontWeight: 700 }}>
              Net profit: ${best.profit.netProfit.toFixed(2)}
              {Number.isFinite(best.profit.roiPct) ? ` (${best.profit.roiPct.toFixed(0)}% ROI)` : ''}
            </div>
          )}
          {best.matchUrl && (
            <a href={best.matchUrl} target="_blank" rel="noreferrer" style={{ color: '#64d2ff', fontSize: 12 }}>
              View matched listing
            </a>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 10, fontSize: 14, color: '#f5f5f7' }}>
          {report.channels.map((c) => (
            <div key={c.channel}>
              {CHANNEL_LABELS[c.channel]}: {c.statusMessage}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CAMERA_STORAGE_KEY = 'pennyPhoneCameraId';

function ScanTab() {
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
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const readerId = 'phone-scan-viewport';

  async function onDecoded(decodedText: string) {
    const code = decodedText.trim();
    setUpc(code);
    if (scannerRef.current?.isScanning) await scannerRef.current.stop();
    const match = await lookupBarcodeAsync(code);
    setTitle(match.title);
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

  async function startScan(cameraTarget: string | { facingMode: string }) {
    const scanner = scannerRef.current;
    if (!scanner) return;
    if (scanner.isScanning) await scanner.stop();
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
      // The stream can take a beat to actually paint; recheck a moment later.
      setTimeout(() => setDiag('after 1.5s: ' + describeVideoElement()), 1500);
    } catch (err: any) {
      setCameraError(err?.message || 'Camera not available. Type the UPC manually below.');
      setDiag('start() threw: ' + (err?.name || '') + ' ' + (err?.message || String(err)));
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      if (cancelled) return;
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
      if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(() => {});
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

  async function checkSpread() {
    const price = Number(buyPrice);
    if (!title.trim()) return setError('Enter a title (or scan a barcode first).');
    if (!Number.isFinite(price) || price < 0) return setError('Enter a valid buy price.');

    setChecking(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch('/api/arbitrage/spread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), buyPrice: price, upc: upc || undefined, store: store || undefined, category: CATEGORY, source: 'penny-scan' }),
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
    <div>
      <div
        id={readerId}
        style={{ width: '100%', borderRadius: 12, overflow: 'hidden', background: '#111', minHeight: 220 }}
      />
      {cameraError && <p style={{ color: '#ff9f0a', fontSize: 13 }}>{cameraError}</p>}
      <p style={{ color: '#666', fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-word' }}>diag: {diag}</p>

      {cameras.length > 1 && (
        <label style={{ ...fieldLabel, marginTop: 8 }}>
          Camera
          <select value={selectedCameraId} onChange={(e) => onCameraChange(e.target.value)} style={inputStyle}>
            <option value="">Default (rear)</option>
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>
                {cam.label || cam.id}
              </option>
            ))}
          </select>
        </label>
      )}

      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        <label style={fieldLabel}>
          UPC (auto-filled from scan)
          <input value={upc} onChange={(e) => setUpc(e.target.value)} placeholder="scan or type" style={inputStyle} />
        </label>
        <label style={fieldLabel}>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product title" style={inputStyle} />
        </label>
        <label style={fieldLabel}>
          Buy price ($)
          <input
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            inputMode="decimal"
            placeholder="1.00"
            style={inputStyle}
          />
        </label>
        <label style={fieldLabel}>
          Store (optional)
          <input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Dollar General" style={inputStyle} />
        </label>

        <button onClick={checkSpread} disabled={checking} style={primaryButton}>
          {checking ? 'Checking live comps…' : 'Check spread'}
        </button>
        {report && (
          <button onClick={rescan} style={secondaryButton}>
            Scan another
          </button>
        )}
        {error && <p style={{ color: '#ff453a', fontSize: 13 }}>{error}</p>}
      </div>

      {report && <VerdictCard report={report} />}
    </div>
  );
}

function MineTab() {
  const [items, setItems] = useState<PendingPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [soldPrice, setSoldPrice] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/learning/pending');
      const json = await res.json();
      if (json.success) setItems(json.data as PendingPrediction[]);
      else setError(json.error || 'Failed to load');
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
    await fetch('/api/learning/outcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, stage, actualPrice }),
    });
    await load();
  }

  if (loading) return <p style={{ color: '#92929d' }}>Loading your scans…</p>;
  if (error) return <p style={{ color: '#ff453a' }}>{error}</p>;
  if (items.length === 0) {
    return <p style={{ color: '#92929d' }}>No pending scans. Predictions you check in the Scan tab show up here until you tell it what happened.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((item) => (
        <div key={item.id} style={{ background: '#18181c', border: '1px solid #2c2c35', borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700, color: '#f5f5f7' }}>{item.title}</div>
          <div style={{ fontSize: 12, color: '#92929d' }}>
            Bought ${item.buyPrice.toFixed(2)}{item.store ? ` at ${item.store}` : ''}
            {item.predictedResale !== undefined ? ` · predicted resale $${item.predictedResale.toFixed(2)}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button onClick={() => submitOutcome(item.id, 'bought')} style={smallButton}>
              I bought it
            </button>
            <input
              value={soldPrice[item.id] ?? ''}
              onChange={(e) => setSoldPrice((s) => ({ ...s, [item.id]: e.target.value }))}
              placeholder="sold for $"
              inputMode="decimal"
              style={{ ...inputStyle, width: 100 }}
            />
            <button
              onClick={() => submitOutcome(item.id, 'sold', Number(soldPrice[item.id]))}
              disabled={!Number.isFinite(Number(soldPrice[item.id])) || !soldPrice[item.id]}
              style={smallButton}
            >
              Sold it
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const fieldLabel: React.CSSProperties = { fontSize: 12, color: '#92929d', display: 'grid', gap: 4 };
const inputStyle: React.CSSProperties = {
  background: '#18181c',
  border: '1px solid #2c2c35',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 16,
  color: '#f5f5f7',
};
const primaryButton: React.CSSProperties = {
  background: '#ff9800',
  color: '#000',
  fontWeight: 800,
  border: 'none',
  borderRadius: 12,
  padding: '14px 16px',
  fontSize: 16,
};
const secondaryButton: React.CSSProperties = {
  background: 'transparent',
  color: '#f5f5f7',
  border: '1px solid #2c2c35',
  borderRadius: 12,
  padding: '10px 16px',
  fontSize: 14,
};
const smallButton: React.CSSProperties = {
  background: '#2c2c35',
  color: '#f5f5f7',
  border: 'none',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
};

export function PhoneApp() {
  const [tab, setTab] = useState<Tab>('scan');

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b0d', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: '#f5f5f7', fontSize: 20, margin: '0 0 12px' }}>Penny Deals</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab('scan')} style={tab === 'scan' ? primaryButton : secondaryButton}>
          Scan
        </button>
        <button onClick={() => setTab('mine')} style={tab === 'mine' ? primaryButton : secondaryButton}>
          My Scans
        </button>
      </div>
      {tab === 'scan' ? <ScanTab /> : <MineTab />}
    </div>
  );
}
