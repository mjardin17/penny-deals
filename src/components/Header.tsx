import React, { useState } from 'react';
import { MapPin, Copy, Check, Edit2, ShoppingBag, ScanLine, Volume2, VolumeX, Receipt, Store, Info, X, Sparkles, AlertCircle, ExternalLink } from 'lucide-react';
import { soundFx } from '../utils/audioFeedback';

interface HeaderProps {
  zipCode: string;
  onUpdateZip: (newZip: string) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  cartCount: number;
  onOpenScanner?: () => void;
  onOpenReceiptScanner?: () => void;
  activeStoreName?: string;
  activeStoreDistance?: string;
  onOpenStoreLookup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  zipCode,
  onUpdateZip,
  onNotify,
  cartCount,
  onOpenScanner,
  onOpenReceiptScanner,
  activeStoreName,
  activeStoreDistance,
  onOpenStoreLookup,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempZip, setTempZip] = useState(zipCode);
  const [isMuted, setIsMuted] = useState(() => soundFx.isAudioMuted());
  const [showDataInfoModal, setShowDataInfoModal] = useState(false);

  const handleToggleSound = () => {
    const nextMuted = soundFx.toggleMute();
    setIsMuted(nextMuted);
    onNotify(nextMuted ? 'Sound FX Muted' : 'Sound FX Enabled (In-Store Chimes Active)', nextMuted ? 'info' : 'success');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(zipCode);
      setIsCopied(true);
      onNotify(`Copied Zip Code ${zipCode} to clipboard!`, 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      onNotify(`Failed to copy. ZIP: ${zipCode}`, 'error');
    }
  };

  const handleSaveZip = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tempZip.trim();
    if (clean) {
      onUpdateZip(clean);
      onNotify(`Store Zip updated to ${clean}`, 'info');
    }
    setIsEditing(false);
  };

  return (
    <header className="text-center pt-2 pb-5">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[11px] uppercase tracking-wider text-[#92929d] font-semibold flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[#34c759] animate-pulse"></span>
          Retail Arbitrage Sourcing Engine
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDataInfoModal(true)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-[#18181c] hover:bg-[#222227] text-[#ffd60a] border border-[#ffd60a]/40 font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="How live data & store clearance works"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Data Guide: Live vs Templates</span>
            <span className="sm:hidden">Data Info</span>
          </button>
          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-1.5 rounded-full border transition-all cursor-pointer ${
              isMuted
                ? 'bg-[#18181c] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7]'
                : 'bg-[#30d158]/15 text-[#30d158] border-[#30d158]/40 hover:bg-[#30d158]/25'
            }`}
            title={isMuted ? 'Unmute In-Store Audio Chimes' : 'Mute In-Store Audio Chimes'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="text-xs px-2.5 py-1 rounded-full bg-[#ffd60a] hover:bg-[#ffc107] text-black font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Scan Barcode</span>
            </button>
          )}
          {onOpenReceiptScanner && (
            <button
              type="button"
              onClick={onOpenReceiptScanner}
              className="text-xs px-2.5 py-1 rounded-full bg-[#222227] hover:bg-[#2c2c35] text-[#ffd60a] border border-[#ffd60a]/40 font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="OCR Receipt & COGS Logger"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Receipt OCR</span>
            </button>
          )}
          {cartCount > 0 && (
            <a
              href="#sessionLog"
              className="text-xs px-2.5 py-1 rounded-full bg-[#222227] text-[#ff9800] border border-[#2c2c35] flex items-center gap-1.5 hover:border-[#ff9800] transition-colors"
            >
              <ShoppingBag className="w-3 h-3" />
              <span>{cartCount} in Cart</span>
            </a>
          )}
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ff9800] tracking-tight mb-2 flex items-center justify-center gap-2">
        <span>🛒</span> Penny Hunter Pro V5
      </h1>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {isEditing ? (
          <form onSubmit={handleSaveZip} className="flex items-center gap-1.5 bg-[#18181c] border border-[#ff9800] rounded-full px-3 py-1">
            <MapPin className="w-3.5 h-3.5 text-[#ff9800]" />
            <input
              type="text"
              value={tempZip}
              onChange={(e) => setTempZip(e.target.value)}
              placeholder="Zip code"
              autoFocus
              className="bg-transparent text-xs text-[#f5f5f7] outline-none w-20 text-center font-mono"
            />
            <button
              type="submit"
              className="text-xs text-[#34c759] font-bold px-1.5 hover:underline"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setTempZip(zipCode);
                setIsEditing(false);
              }}
              className="text-xs text-[#92929d] px-1 hover:text-white"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="inline-flex items-center gap-1.5 bg-[#18181c] border border-[#2c2c35] rounded-full py-1.5 px-3.5 shadow-sm text-xs text-[#92929d] transition-all hover:border-[#ff9800]/60">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-inherit hover:text-[#f5f5f7] transition-colors font-mono"
              title="Click to copy ZIP"
            >
              <MapPin className="w-3.5 h-3.5 text-[#ff9800]" />
              <span className="font-semibold text-[#f5f5f7]">{zipCode}</span>
              <span className="text-[11px] text-[#92929d]">(Tap to Copy)</span>
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-[#34c759]" />
              ) : (
                <Copy className="w-3 h-3 text-[#92929d] opacity-80" />
              )}
            </button>
            <span className="text-[#2c2c35]">|</span>
            <button
              onClick={() => {
                setTempZip(zipCode);
                setIsEditing(true);
              }}
              className="text-[#92929d] hover:text-[#ff9800] transition-colors p-0.5"
              title="Change Zip Code"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Active Store Lookup Indicator */}
        {onOpenStoreLookup && (
          <button
            type="button"
            onClick={onOpenStoreLookup}
            className="inline-flex items-center gap-1.5 bg-[#18181c] hover:bg-[#222227] border border-[#ffd60a]/30 hover:border-[#ffd60a] rounded-full py-1.5 px-3.5 shadow-sm text-xs text-[#f5f5f7] transition-all cursor-pointer group"
            title="Open Store Lookup & Directory"
          >
            <Store className="w-3.5 h-3.5 text-[#ffd60a] group-hover:scale-110 transition-transform" />
            <span className="font-semibold truncate max-w-[200px] sm:max-w-xs">
              {activeStoreName || 'Home Depot #2671'}
            </span>
            {activeStoreDistance && (
              <span className="text-[11px] text-[#ffd60a] font-mono">
                ({activeStoreDistance})
              </span>
            )}
            <span className="text-[10px] text-[#92929d] group-hover:text-white underline ml-0.5">
              Change
            </span>
          </button>
        )}
      </div>

      {/* Data Transparency Modal */}
      {showDataInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 text-left">
          <div className="bg-[#18181c] border border-[#2c2c35] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[#2c2c35] flex items-center justify-between bg-[#121215]">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[#ffd60a]" />
                <h3 className="font-black text-[#f5f5f7] text-base">
                  Data Reality: Live Tools vs Clearance Templates
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDataInfoModal(false)}
                className="p-1 rounded-lg text-[#92929d] hover:text-[#f5f5f7] hover:bg-[#222227] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs text-[#92929d] leading-relaxed">
              <div className="p-3 bg-[#ff9800]/10 border border-[#ff9800]/30 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#ff9800] font-bold text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Why In-Store Penny Items Don't Match Retail Apps</span>
                </div>
                <p className="text-[#f5f5f7]/90 text-[11px]">
                  Major retailers (Dollar General, Home Depot, Walmart, Target, Lowe's) <strong>deliberately hide 1¢ items and deep markdown clearance from their public APIs and customer mobile apps</strong>. Per official corporate policy, when an item hits $0.01 or final clearance, the store system marks it "recall / discard". Official apps will display them as <em>"Out of Stock"</em> or revert to full MSRP to prevent shelf clearing before associates pull them.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-[#f5f5f7] text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#30d158]" /> What In This App Works in Real-Time:
                </h4>
                <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
                  <li>
                    <strong className="text-[#f5f5f7]">Physical Barcode Camera Scanner:</strong> Scans real UPC-A, EAN-13, and Code 128 barcodes directly off physical shelf products.
                  </li>
                  <li>
                    <strong className="text-[#f5f5f7]">Global UPC Product Registry:</strong> Queries open barcode registries in real-time to identify real product names, brands, and categories.
                  </li>
                  <li>
                    <strong className="text-[#f5f5f7]">1-Tap Live Sold Comps & BrickSeek:</strong> Direct deep-links to real-time eBay completed sales, Walmart inventory, Target DPCI, Home Depot SKUs, and BrickSeek stock checker.
                  </li>
                  <li>
                    <strong className="text-[#f5f5f7]">Arbitrage & Fee Calculator:</strong> Computes real eBay, Amazon FBA, and Mercari seller fees, shipping, sales tax, breakeven prices, and net ROI.
                  </li>
                  <li>
                    <strong className="text-[#f5f5f7]">Auto-Coupler Engine:</strong> Calculates multi-layer coupon stacking, manufacturer rebates, and tool-hack refund allocations.
                  </li>
                  <li>
                    <strong className="text-[#f5f5f7]">Receipt OCR Scanner:</strong> Uses computer vision to digitize printed paper store receipts into your actual personal inventory log.
                  </li>
                </ul>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#2c2c35]">
                <h4 className="font-bold text-[#ffd60a] text-sm">
                  What The Pre-Loaded Lists Represent:
                </h4>
                <p className="text-[11px]">
                  The pre-loaded catalog items (such as DG Tuesday lists, Home Depot .02/.03 clearance codes, Target yellow tag cycles, and Lowe's tool deals) are <strong>curated community drop templates and markdown pattern blueprints</strong>. Because inventory varies store-by-store across 19,000+ Dollar Generals and 2,300+ Home Depots, these templates illustrate the exact SKUs, tag symbols, and aisle locations where clearances drop.
                </p>
              </div>

              <div className="p-3 bg-[#121215] border border-[#2c2c35] rounded-xl flex items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-[#f5f5f7] text-xs">Ready to scan real items?</div>
                  <div className="text-[10px] text-[#92929d]">Open the in-store scanner and scan any item barcode.</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDataInfoModal(false);
                    onOpenScanner?.();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#ffd60a] hover:bg-[#ffc107] text-black font-black text-xs cursor-pointer shrink-0"
                >
                  Scan Real Barcode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

