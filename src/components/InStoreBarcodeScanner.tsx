import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ScanLine,
  X,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  MapPin,
  Tag,
  ExternalLink,
  Calculator,
  ShoppingBag,
  Volume2,
  VolumeX,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Info,
  ArrowRightLeft,
  Layers,
  Store,
  ChevronDown,
  ChevronUp,
  Boxes,
  Navigation,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { lookupBarcode, lookupBarcodeAsync, getLiveLookupLinks, BarcodeScanMatch } from '../utils/barcodeLookup';
import { generateCrossStoreComparison } from '../utils/crossStoreScanner';
import { soundFx } from '../utils/audioFeedback';

interface InStoreBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
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
  onOpenDiagnostic?: (deal: any) => void;
}

export const InStoreBarcodeScanner: React.FC<InStoreBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onLoadIntoCalculator,
  onAddToCart,
  onNotify,
  onOpenDiagnostic,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<BarcodeScanMatch | null>(null);
  const [showCrossStore, setShowCrossStore] = useState(true);
  const [scannerRadarView, setScannerRadarView] = useState<'catalogs' | 'prices'>('catalogs');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerId = 'instore-barcode-scanner-viewport';

  // Subtle Web Audio Scanner Beep
  const playBeep = (isSuccess = true) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isSuccess) {
        osc.frequency.setValueAtTime(1760, ctx.currentTime); // A6
        osc.frequency.setValueAtTime(2349.32, ctx.currentTime + 0.07); // D7
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } else {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      }
    } catch (e) {
      // Audio context may be restricted before user interaction
    }
  };

  const handleBarcodeIdentified = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Immediate local lookup for ultra-fast response
    const quickResult = lookupBarcode(cleanCode);
    setScanResult(quickResult);

    if (quickResult && quickResult.matched) {
      if (quickResult.actualPrice <= 0.04) {
        soundFx.playPennyJackpot();
      } else if (quickResult.marketPrice - quickResult.actualPrice > 25) {
        soundFx.playHighProfitChime();
      } else {
        soundFx.playStandardScan();
      }

      onNotify(
        `Scanned: ${quickResult.title.substring(0, 26)}... (${quickResult.store})`,
        'success'
      );
      return;
    }

    // If not in local pre-loaded deal archives, query open global UPC registry
    soundFx.playStandardScan();
    try {
      const asyncResult = await lookupBarcodeAsync(cleanCode);
      setScanResult(asyncResult);
      if (asyncResult.matched) {
        onNotify(`Live UPC Matched: ${asyncResult.title.substring(0, 28)}`, 'success');
      } else {
        onNotify(`Barcode Scanned: ${cleanCode}`, 'info');
      }
    } catch {
      onNotify(`Barcode Scanned: ${cleanCode}`, 'info');
    }
  };

  // Start Camera Scanner
  const startScanner = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(readerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
      }

      const qrScanner = html5QrCodeRef.current;
      if (qrScanner.isScanning) {
        await qrScanner.stop();
      }

      await qrScanner.start(
        { facingMode },
        {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const w = Math.floor(Math.min(viewfinderWidth * 0.88, 320));
            const h = Math.floor(Math.min(viewfinderHeight * 0.6, 200));
            return { width: Math.max(w, 140), height: Math.max(h, 80) };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleBarcodeIdentified(decodedText);
        },
        () => {
          // Frame scan pass with no barcode detected
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera scanner initialization error:', err);
      setIsScanning(false);
      setCameraError(
        err?.message ||
          'Camera access not available in this preview environment. You can use Image Upload or Manual/Quick-Test Barcodes below!'
      );
    }
  };

  // Stop Camera Scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner', err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      // Small timeout to allow modal DOM node to mount
      const timer = setTimeout(() => {
        startScanner();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab, facingMode]);

  // Clean up when modal unmounts
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const scanner = new Html5Qrcode('file-scanner-temp');
      const decodedText = await scanner.scanFile(file, true);
      handleBarcodeIdentified(decodedText);
      scanner.clear();
    } catch (err) {
      playBeep(false);
      onNotify('Could not read a clear barcode from this image. Try another photo or enter manually.', 'error');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeIdentified(manualCode.trim());
  };

  const QUICK_SAMPLE_BARCODES = [
    { label: 'DeWalt 20V $89 (.02 RTV Lowe\'s)', code: '885911478294', store: 'Lowe\'s .02' },
    { label: 'Kobalt Saw $29 (.03 Final Lowe\'s)', code: '850005471923', store: 'Lowe\'s .03' },
    { label: 'LEGO 70% Off Salvage (Target)', code: '673419376976', store: 'Target Salvage' },
    { label: 'Dyson V8 $125 Clearance (Target)', code: '885609028912', store: 'Target Thursday' },
    { label: 'Pokémon 151 Bundle (Walmart/MJ)', code: '820650853753', store: 'Walmart TCG' },
    { label: 'Prismatic Evolutions ETB (Target/Excell)', code: '820650861024', store: 'Target TCG' },
    { label: 'Charizard ex $39 Clearance (Walmart)', code: '820650854910', store: 'Walmart Hidden' },
    { label: 'Shark Robot Vacuum $89 Floor (Walmart)', code: '622356592810', store: 'Walmart Secret' },
    { label: 'ClosetMaid 1¢ Penny (Home Depot)', code: '075381028394', store: 'Home Depot 1¢' },
    { label: 'Velvet Throw 1¢ Penny (Dollar General)', code: '086892147321', store: 'DG Penny' },
    { label: 'Crown Zenith 14-Pk (Sam’s Club)', code: '820650858192', store: 'Sam’s Club' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Hidden container for image uploads */}
      <div id="file-scanner-temp" className="hidden" />

      <div className="bg-[#18181c] border border-[#2c2c35] rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-[#2c2c35] flex items-center justify-between bg-[#121215]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ffd60a]/20 border border-[#ffd60a]/40 flex items-center justify-center text-[#ffd60a]">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-[#f5f5f7] tracking-tight">
                  In-Store Barcode & Price Scanner
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/40 font-bold uppercase">
                  Multi-Store Radar
                </span>
              </div>
              <p className="text-[11px] text-[#92929d]">
                Scan box barcodes or shelf tags to cross-check secret clearance, penny status & market comps.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Beep' : 'Enable Beep'}
              className="p-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-white transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#ffd60a]" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection: Camera vs Image Upload vs Manual */}
        <div className="px-4 pt-3 pb-2 border-b border-[#2c2c35] flex items-center gap-2 bg-[#141418]">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-[#ffd60a] text-black shadow-xs font-black'
                : 'bg-[#222227] text-[#92929d] hover:text-white border border-[#2c2c35]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live Camera Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('upload');
              stopScanner();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-[#ffd60a] text-black shadow-xs font-black'
                : 'bg-[#222227] text-[#92929d] hover:text-white border border-[#2c2c35]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Photo / Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              stopScanner();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-[#ffd60a] text-black shadow-xs font-black'
                : 'bg-[#222227] text-[#92929d] hover:text-white border border-[#2c2c35]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Keypad / SKU</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* CAMERA TAB */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-[#2c2c35] min-h-[220px] flex items-center justify-center">
                {/* Viewport for html5-qrcode */}
                <div id={readerId} className="w-full max-w-[340px] overflow-hidden" />

                {/* Laser animation overlay when active */}
                {isScanning && !cameraError && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-[260px] h-[150px] border-2 border-[#34c759]/80 rounded-xl relative shadow-[0_0_15px_rgba(52,199,89,0.3)]">
                      <div className="absolute left-0 right-0 h-0.5 bg-[#34c759] shadow-[0_0_8px_#34c759] animate-bounce top-1/2 -translate-y-1/2" />
                      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-[#34c759] font-mono tracking-wider font-bold whitespace-nowrap">
                        ALIGN BARCODE HERE
                      </span>
                    </div>
                  </div>
                )}

                {/* Camera Error or Fallback Notice */}
                {cameraError && (
                  <div className="p-6 text-center max-w-sm space-y-2">
                    <AlertTriangle className="w-8 h-8 text-[#ffd60a] mx-auto opacity-80" />
                    <h4 className="text-xs font-bold text-[#f5f5f7]">Camera Access Needed</h4>
                    <p className="text-[11px] text-[#92929d] leading-relaxed">
                      {cameraError}
                    </p>
                    <div className="pt-2 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => startScanner()}
                        className="px-3 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#f5f5f7] border border-[#2c2c35] flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#ffd60a]" />
                        <span>Retry Camera</span>
                      </button>
                      <a
                        href={window.location.href}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-[#0a84ff]/20 hover:bg-[#0a84ff]/30 text-[#0a84ff] border border-[#0a84ff]/40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in New Tab (Enable Camera)</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className="px-3 py-1.5 rounded-xl bg-[#ffd60a] hover:bg-[#ffc107] text-xs font-black text-black flex items-center gap-1 cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Enter Barcode Manually</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Switch Controls */}
              {isScanning && (
                <div className="flex items-center justify-between text-xs text-[#92929d]">
                  <span>Aim camera steadily at barcode</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFacingMode(facingMode === 'environment' ? 'user' : 'environment');
                    }}
                    className="text-[#ffd60a] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Switch to {facingMode === 'environment' ? 'Front' : 'Back'} Camera
                  </button>
                </div>
              )}
            </div>
          )}

          {/* UPLOAD TAB */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#2c2c35] hover:border-[#ffd60a]/60 bg-[#121215] rounded-2xl p-8 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-10 h-10 text-[#ffd60a] mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-[#f5f5f7]">Tap to Select or Drop Barcode Photo</h4>
                <p className="text-xs text-[#92929d] mt-1 max-w-sm mx-auto">
                  Take a photo of the product package, retail shelf tag, or upload a screenshot.
                </p>
              </div>
            </div>
          )}

          {/* MANUAL / KEYPAD TAB */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#92929d] uppercase block mb-1">
                  Type UPC Barcode or Store SKU
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="e.g. 820650853753 or 622356592810"
                    className="w-full px-3.5 py-2.5 bg-[#222227] border border-[#2c2c35] rounded-xl text-[#f5f5f7] font-mono text-sm outline-none focus:border-[#ffd60a]"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-[#ffd60a] text-black font-black text-xs hover:bg-[#ffc107] transition-colors cursor-pointer"
                  >
                    Lookup
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* QUICK-TEST PRESET BARCODES (Convenience chips for rapid testing) */}
          <div className="pt-2 border-t border-[#2c2c35]/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#92929d] uppercase flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#ffd60a]" /> Quick-Test Sample Barcodes:
              </span>
              <span className="text-[10px] text-[#ffd60a]">Tap to simulate scan</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SAMPLE_BARCODES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setManualCode(item.code);
                    handleBarcodeIdentified(item.code);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] border border-[#2c2c35] hover:border-[#ffd60a] text-[11px] text-[#f5f5f7] font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="text-[10px] px-1 py-0.2 rounded bg-black/40 text-[#ffd60a] font-mono">
                    {item.store}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SCAN RESULT CARD */}
          {scanResult && (
            <div className="mt-4 p-4 rounded-2xl bg-[#121215] border border-[#ffd60a]/50 shadow-lg space-y-3 relative overflow-hidden animate-fadeIn">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#ffd60a] text-black font-black uppercase">
                    {scanResult.store}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#222227] text-[#f5f5f7] border border-[#2c2c35] font-bold">
                    {scanResult.category}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-black ${
                      scanResult.isPenny
                        ? 'bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/40'
                        : 'bg-[#ff9800]/20 text-[#ff9800] border border-[#ff9800]/40'
                    }`}
                  >
                    {scanResult.statusBadge}
                  </span>
                </div>

                <div className="text-[11px] text-[#92929d] font-mono shrink-0">
                  UPC: <strong className="text-[#f5f5f7]">{scanResult.upc}</strong>
                </div>
              </div>

              {/* Title */}
              <h4 className="text-base font-black text-[#f5f5f7] leading-snug">
                {scanResult.title}
              </h4>

              {/* Price & Profit Comparison Box */}
              <div className="p-3 bg-[#18181c] border border-[#2c2c35] rounded-xl flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-[10px] text-[#92929d] uppercase font-bold">Retail MSRP:</div>
                  <div className="text-sm font-bold text-[#92929d] line-through font-mono">
                    ${scanResult.regularPrice.toFixed(2)}
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-[#ffd60a] hidden sm:block" />

                <div>
                  <div className="text-[10px] text-[#34c759] uppercase font-extrabold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> In-Store Scan Price:
                  </div>
                  <div className="text-2xl font-black text-[#34c759] font-mono leading-none">
                    ${scanResult.actualPrice.toFixed(2)}
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-[#ffd60a] hidden sm:block" />

                <div>
                  <div className="text-[10px] text-[#ffd60a] uppercase font-bold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Online Market Comps:
                  </div>
                  <div className="text-xl font-black text-[#ffd60a] font-mono leading-none">
                    ${scanResult.marketPrice > 0 ? scanResult.marketPrice.toFixed(2) : '--'}
                  </div>
                </div>

                {scanResult.discountPct > 0 && (
                  <div className="text-right pl-2 border-l border-[#2c2c35]">
                    <span className="px-2 py-0.5 rounded-full bg-[#34c759]/20 text-[#34c759] font-black text-xs">
                      {scanResult.discountPct}% OFF
                    </span>
                  </div>
                )}
              </div>

              {/* Aisle & Tag Intel */}
              <div className="text-xs space-y-1 bg-[#18181c] p-2.5 rounded-xl border border-[#2c2c35]">
                <div className="flex items-center gap-1 text-[#f5f5f7]">
                  <MapPin className="w-3.5 h-3.5 text-[#ffd60a] shrink-0" />
                  <strong className="text-[#ffd60a]">In-Store Location:</strong>{' '}
                  <span>{scanResult.locationHint}</span>
                </div>
                <p className="text-[11px] text-[#92929d] leading-snug">
                  🏷️ <strong>Tag Intel:</strong> {scanResult.tagIntel}
                </p>
                <p className="text-[11px] text-[#92929d] leading-snug">
                  💡 <strong>Hunter Strategy:</strong> {scanResult.hunterNotes}
                </p>
              </div>

              {/* CROSS-STORE MULTI-CHANNEL PRICE & CATALOG RADAR */}
              {(() => {
                const crossComp = generateCrossStoreComparison(
                  scanResult.title,
                  scanResult.upc,
                  scanResult.store,
                  scanResult.actualPrice,
                  scanResult.category
                );

                const stocks = crossComp.catalogStocks || [];

                return (
                  <div className="p-3 bg-[#18181c] border border-[#0a84ff]/40 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 p-1 bg-[#121215] border border-[#2c2c35] rounded-xl">
                        <button
                          type="button"
                          onClick={() => setScannerRadarView('catalogs')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all ${
                            scannerRadarView === 'catalogs'
                              ? 'bg-[#30d158] text-black shadow-sm'
                              : 'text-[#92929d] hover:text-[#f5f5f7]'
                          }`}
                        >
                          <Boxes className="w-3 h-3" />
                          <span>Store Catalogs & Stock ({stocks.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setScannerRadarView('prices')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all ${
                            scannerRadarView === 'prices'
                              ? 'bg-[#0a84ff] text-white shadow-sm'
                              : 'text-[#92929d] hover:text-[#f5f5f7]'
                          }`}
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>Price Matrix ({crossComp.prices.length})</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowCrossStore(!showCrossStore)}
                        className="text-[11px] text-[#0a84ff] hover:text-[#f5f5f7] flex items-center gap-0.5 font-bold cursor-pointer"
                      >
                        <span>{showCrossStore ? 'Collapse' : 'Expand'}</span>
                        {showCrossStore ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Spread Highlights Banner */}
                    <div className="flex items-center justify-between text-[11px] bg-[#121215] p-2 rounded-xl border border-[#2c2c35] flex-wrap gap-2">
                      <div>
                        <span className="text-[#92929d]">Lowest Buy: </span>
                        <strong className="text-[#34c759] font-mono">${crossComp.lowestBuyPrice.toFixed(2)}</strong> ({crossComp.lowestBuyStore})
                      </div>
                      <div>
                        <span className="text-[#92929d]">Top Resale: </span>
                        <strong className="text-[#ffd60a] font-mono">${crossComp.highestSellPrice.toFixed(2)}</strong> ({crossComp.highestSellStore})
                      </div>
                      <div>
                        <span className="text-[#92929d]">In-Stock Stores: </span>
                        <strong className="text-[#30d158] font-mono">{stocks.filter((s) => s.stockQuantity > 0).length} / {stocks.length}</strong>
                      </div>
                    </div>

                    {showCrossStore && scannerRadarView === 'catalogs' && (
                      <div className="space-y-2 pt-1">
                        {stocks.map((stock, i) => (
                          <div
                            key={i}
                            className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 text-xs ${
                              stock.stockQuantity > 0
                                ? 'bg-[#121215] border-[#30d158]/35'
                                : 'bg-[#121215] border-[#2c2c35] opacity-75'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 font-bold text-[#f5f5f7] flex-wrap">
                                  <span>{stock.storeName}</span>
                                  {stock.storeNumber && (
                                    <span className="text-[10px] px-1 rounded bg-[#222227] text-[#92929d] font-mono">
                                      {stock.storeNumber}
                                    </span>
                                  )}
                                  {stock.distanceMiles !== undefined && stock.distanceMiles > 0 && (
                                    <span className="text-[10px] text-[#0a84ff] font-medium flex items-center gap-0.5">
                                      <Navigation className="w-2.5 h-2.5" /> {stock.distanceMiles} mi
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#92929d] truncate">
                                  {stock.branchName}
                                </div>
                              </div>

                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-black shrink-0 ${
                                  stock.stockQuantity > 0
                                    ? 'bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/40'
                                    : 'bg-[#222227] text-[#92929d] border border-[#2c2c35]'
                                }`}
                              >
                                {stock.catalogStatus} ({stock.stockQuantity})
                              </span>
                            </div>

                            {/* Aisle & Catalog ID */}
                            <div className="flex items-center justify-between gap-2 text-[11px] text-[#92929d] bg-[#18181c] p-1.5 rounded-lg">
                              <div className="flex items-center gap-1 text-[#f5f5f7] truncate">
                                <MapPin className="w-3 h-3 text-[#30d158] shrink-0" />
                                <span className="truncate">{stock.aisleBayLocation || 'Aisle Floor Display'}</span>
                              </div>

                              {stock.catalogItemNumber && (
                                <span className="font-mono text-[#ffd60a] shrink-0 text-[10px]">
                                  {stock.catalogItemNumber}
                                </span>
                              )}
                            </div>

                            {/* Shelf Price & Catalog Action */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#2c2c35]/50">
                              <div className="text-[11px] text-[#92929d]">
                                In-Store: <strong className="text-[#30d158] font-mono font-bold">${stock.inStorePrice.toFixed(2)}</strong>
                              </div>

                              <a
                                href={stock.onlineCatalogUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 rounded-md bg-[#222227] hover:bg-[#2c2c35] text-[10px] font-bold text-[#0a84ff] flex items-center gap-1 transition-colors"
                              >
                                <span>Catalog</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {showCrossStore && scannerRadarView === 'prices' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {crossComp.prices.map((p, i) => (
                          <div
                            key={i}
                            className="p-2 rounded-xl bg-[#121215] border border-[#2c2c35] flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 font-bold text-[#f5f5f7] truncate">
                                <span>{p.storeName}</span>
                                {p.isLowestBuy && (
                                  <span className="text-[9px] px-1 rounded bg-[#34c759]/20 text-[#34c759] font-black">
                                    BUY
                                  </span>
                                )}
                                {p.isHighestSell && (
                                  <span className="text-[9px] px-1 rounded bg-[#ffd60a]/20 text-[#ffd60a] font-black">
                                    SELL
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#92929d] truncate">
                                {p.storeType}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-black text-sm text-[#f5f5f7]">
                                ${p.price.toFixed(2)}
                              </span>
                              <a
                                href={p.directUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded-md bg-[#222227] hover:bg-[#2c2c35] text-[#0a84ff] transition-colors"
                                title={`Search on ${p.storeName}`}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Live Online Lookups & Real Market Data */}
              {(() => {
                const liveLinks = getLiveLookupLinks(scanResult.upc, scanResult.title);
                return (
                  <div className="p-3 bg-[#121215] border border-[#ffd60a]/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-[#ffd60a] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Live Store & Market Comps (Real-Time)
                      </span>
                      <span className="text-[10px] text-[#92929d]">1-Tap Direct Deep-Links</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <a
                        href={liveLinks.ebaySold}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#30d158]/20 hover:bg-[#30d158]/30 text-[#30d158] border border-[#30d158]/40 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>eBay Sold Comps</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>

                      <a
                        href={liveLinks.brickseekWalmart}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#ffd60a]/15 hover:bg-[#ffd60a]/25 text-[#ffd60a] border border-[#ffd60a]/30 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>BrickSeek Stock Check</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>

                      <a
                        href={liveLinks.walmartSearch}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#0a84ff]/15 hover:bg-[#0a84ff]/25 text-[#0a84ff] border border-[#0a84ff]/30 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>Walmart App</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>

                      <a
                        href={liveLinks.targetSearch}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#ff3b30]/15 hover:bg-[#ff3b30]/25 text-[#ff453a] border border-[#ff3b30]/30 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>Target DPCI</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>

                      <a
                        href={liveLinks.homeDepotSearch}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#ff9f0a]/15 hover:bg-[#ff9f0a]/25 text-[#ff9f0a] border border-[#ff9f0a]/30 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>Home Depot</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>

                      <a
                        href={liveLinks.googleShopping}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#f5f5f7] border border-[#2c2c35] text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>Google Lens</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>

                      {scanResult.source === 'Pokemon / TCG' && (
                        <a
                          href={`https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(scanResult.title)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-xs text-[#ffd60a] border border-[#ffd60a]/30 font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>TCGPlayer Comps</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    {/* Clearance Reality Explanation Box */}
                    <div className="text-[10px] text-[#92929d] bg-[#18181c] p-2 rounded-lg border border-[#2c2c35] flex items-start gap-1.5 leading-relaxed">
                      <Info className="w-3.5 h-3.5 text-[#ffd60a] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#f5f5f7]">Clearance Reality:</strong> Dollar General, Home Depot & Walmart flag 1¢ penny items and hidden markdowns for disposal—their customer apps intentionally hide them or list full MSRP. Physical barcode scans and sold comps are how arbiters verify true liquidation.
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {onOpenDiagnostic && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDiagnostic({
                          title: scanResult.title,
                          buyPrice: scanResult.actualPrice,
                          sellPrice: scanResult.marketPrice > 0 ? scanResult.marketPrice : scanResult.actualPrice * 2,
                          store: scanResult.store,
                          category: scanResult.category,
                          upc: scanResult.upc,
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#0a84ff]/15 hover:bg-[#0a84ff]/25 text-[#0a84ff] border border-[#0a84ff]/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="AI Risk & Velocity Diagnostic"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>AI Check</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onLoadIntoCalculator({
                        name: `${scanResult.store}: ${scanResult.title}`,
                        buy: scanResult.actualPrice.toFixed(2),
                        sell: scanResult.marketPrice > 0 ? scanResult.marketPrice.toFixed(2) : (scanResult.actualPrice * 2).toFixed(2),
                        store: scanResult.store,
                      });
                      onNotify(`Loaded "${scanResult.title}" into Flip Calculator`, 'info');
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#f5f5f7] border border-[#2c2c35] flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5 text-[#ffd60a]" />
                    <span>Flip Calc</span>
                  </button>

                  {onAddToCart && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddToCart({
                          title: scanResult.title,
                          buyPrice: scanResult.actualPrice,
                          sellPrice: scanResult.marketPrice > 0 ? scanResult.marketPrice : scanResult.actualPrice * 2,
                          store: scanResult.store,
                          category: scanResult.category,
                          notes: `Scanned UPC: ${scanResult.upc} • Location: ${scanResult.locationHint}`,
                        });
                        onNotify(`Added "${scanResult.title}" to Sourcing Cart!`, 'success');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#ffd60a] hover:bg-[#ffc107] text-black text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Add to Cart</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 border-t border-[#2c2c35] bg-[#121215] flex items-center justify-between text-[11px] text-[#92929d]">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-[#ffd60a]" />
            Works on phones, tablets & desktop with live UPC decoding
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[#92929d] hover:text-white font-bold cursor-pointer"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
