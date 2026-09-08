import React, { useState } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  Car,
  Compass,
  CheckCircle2,
  Circle,
  ExternalLink,
  Calendar,
  AlertTriangle,
  Sparkles,
  ShoppingBag,
  DollarSign,
  ChevronRight,
  TrendingUp,
  Download,
  RotateCcw,
} from 'lucide-react';
import { soundFx } from '../utils/audioFeedback';

export interface RouteStop {
  id: string;
  storeName: string;
  chain: 'Dollar General' | "Lowe's" | 'Target' | 'The Home Depot' | 'Walmart';
  branchName: string;
  address: string;
  distanceMiles: number;
  estDriveMins: number;
  bestDay: string;
  isTodayPeakDay: boolean;
  clearanceStrategy: string;
  aislesToCheck: string[];
  sampleTargets: {
    name: string;
    buy: number;
    resell: number;
    upc?: string;
    location: string;
  }[];
  potentialProfit: number;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
}

interface SourcingRunPlannerProps {
  zipCode: string;
  onAddToCart?: (deal: any) => void;
  onLoadIntoCalculator?: (deal: any) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const SourcingRunPlanner: React.FC<SourcingRunPlannerProps> = ({
  zipCode,
  onAddToCart,
  onLoadIntoCalculator,
  onNotify,
}) => {
  const todayDayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

  const getInitialStops = (): RouteStop[] => [
    {
      id: 'stop-dg',
      storeName: 'Dollar General',
      chain: 'Dollar General',
      branchName: `Dollar General #${Math.floor(1000 + Math.random() * 9000)}`,
      address: `104 County Rd, Near ${zipCode}`,
      distanceMiles: 1.8,
      estDriveMins: 5,
      bestDay: 'Tuesday',
      isTodayPeakDay: todayDayName === 'Tuesday',
      clearanceStrategy: 'Tuesday Morning Penny Drop (Items ring up $0.01 at register). Target yellow dot & blue star tags.',
      aislesToCheck: ['Seasonal Clearance Wall', 'Toy Aisle Top Shelf', 'Household Cleaning Overflow', 'Endcaps near registers'],
      sampleTargets: [
        { name: 'Holiday Ceramic Pumpkin Lantern (Penny Item)', buy: 0.01, resell: 18.5, location: 'Seasonal Wall' },
        { name: 'Blue Dot Comfort Fleece Blanket 50x60', buy: 0.01, resell: 14.0, location: 'Apparel Rack' },
      ],
      potentialProfit: 32.48,
      status: 'pending',
    },
    {
      id: 'stop-lowes',
      storeName: "Lowe's Home Improvement",
      chain: "Lowe's",
      branchName: `Lowe's #${Math.floor(1000 + Math.random() * 9000)}`,
      address: `450 Commercial Way, Near ${zipCode}`,
      distanceMiles: 3.4,
      estDriveMins: 9,
      bestDay: 'Wednesday',
      isTodayPeakDay: todayDayName === 'Wednesday',
      clearanceStrategy: 'Yellow Tag Markdowns ending in .02 (RTV Phase 2) or .03 (Final markdown). Huge tool spreads.',
      aislesToCheck: ['Clearance Cage near Lumber', 'Power Tool Overhead Bays', 'Hardware Endcaps', 'Lawn & Garden Back Racks'],
      sampleTargets: [
        { name: 'DeWalt 20V MAX XR Brushless 2-Tool Combo (.02 RTV)', buy: 89.02, resell: 299.0, location: 'Aisle 14 Bay 002' },
        { name: 'Kobalt 40V Cordless Leaf Blower Kit (.03 Tag)', buy: 39.03, resell: 139.0, location: 'Aisle 28 Bay 014' },
      ],
      potentialProfit: 279.95,
      status: 'pending',
    },
    {
      id: 'stop-target',
      storeName: 'Target',
      chain: 'Target',
      branchName: `Target Store #${Math.floor(100 + Math.random() * 900)}`,
      address: `800 Target Blvd, Near ${zipCode}`,
      distanceMiles: 4.1,
      estDriveMins: 11,
      bestDay: 'Thursday',
      isTodayPeakDay: todayDayName === 'Thursday',
      clearanceStrategy: 'Markdown schedule: Red clearance stickers ending in .04 (Salvage) or .98 (70% cut). Thursday is Toys & Baby day.',
      aislesToCheck: ['Toy Clearance Consolidation Aisle (G12-G15)', 'Home Decor Endcaps', 'Electronics Back Wall Clearance', 'Baby Department Rear'],
      sampleTargets: [
        { name: 'LEGO Star Wars Ghost & Phantom II (.04 Salvage)', buy: 47.98, resell: 179.99, location: 'Aisle E14 Shelf 2' },
        { name: 'Dyson V8 Cordless Vacuum Slim (Yellow Salvage)', buy: 125.04, resell: 389.0, location: 'Aisle D08 Endcap' },
      ],
      potentialProfit: 355.97,
      status: 'pending',
    },
    {
      id: 'stop-hd',
      storeName: 'The Home Depot',
      chain: 'The Home Depot',
      branchName: `The Home Depot #${Math.floor(2000 + Math.random() * 4000)}`,
      address: `520 Commerce Blvd, Near ${zipCode}`,
      distanceMiles: 5.2,
      estDriveMins: 13,
      bestDay: 'Monday',
      isTodayPeakDay: todayDayName === 'Monday',
      clearanceStrategy: 'Deal Soldier Yellow Tag system: Look for yellow tags ending in .01 (Penny items ring up 1¢ at self-checkout).',
      aislesToCheck: ['The Closet (Store Clearance Cage)', 'Building Materials Overhead Racks', 'Lighting Department Mid-Aisle', 'Tool Coral Endcaps'],
      sampleTargets: [
        { name: 'Ryobi ONE+ 18V 6-Tool Combo Kit (.01 Penny Tag)', buy: 0.01, resell: 199.0, location: 'Aisle 12 Bay 04' },
        { name: 'Milwaukee M18 FUEL High Output 8.0Ah Battery', buy: 49.00, resell: 149.0, location: 'Aisle 15 Bay 01' },
      ],
      potentialProfit: 278.99,
      status: 'pending',
    },
    {
      id: 'stop-walmart',
      storeName: 'Walmart Supercenter',
      chain: 'Walmart',
      branchName: `Walmart Supercenter #${Math.floor(1500 + Math.random() * 3000)}`,
      address: `1200 Grand Army Hwy, Near ${zipCode}`,
      distanceMiles: 6.8,
      estDriveMins: 15,
      bestDay: 'Friday',
      isTodayPeakDay: todayDayName === 'Friday',
      clearanceStrategy: 'Hidden Rollback Clearance: Ring-up price in app scanner is often 50-75% lower than yellow shelf stickers.',
      aislesToCheck: ['Lawn & Garden Seasonal Pavilion', 'Toy Department Clearance Isle', 'Automotive Clearance Endcap', 'Sporting Goods Racks'],
      sampleTargets: [
        { name: 'Coleman 10x10 Instant Canopy Shelter', buy: 29.0, resell: 119.0, location: 'Garden Pavilion Bay 4' },
        { name: 'Hot Wheels 20-Car Collector Pack (Hidden Markdown)', buy: 5.0, resell: 28.0, location: 'Toy Aisle 7' },
      ],
      potentialProfit: 103.0,
      status: 'pending',
    },
  ];

  const [stops, setStops] = useState<RouteStop[]>(getInitialStops);
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);
  const [baggedItems, setBaggedItems] = useState<number>(0);

  const totalMiles = stops.reduce((acc, s) => acc + s.distanceMiles, 0);
  const totalDriveMins = stops.reduce((acc, s) => acc + s.estDriveMins, 0);
  const totalPotentialProfit = stops.reduce((acc, s) => acc + s.potentialProfit, 0);
  const completedStops = stops.filter((s) => s.status === 'completed').length;

  const handleUpdateStatus = (id: string, newStatus: RouteStop['status']) => {
    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
    if (newStatus === 'completed') {
      soundFx.playHighProfitChime();
      onNotify('Store stop marked complete!', 'success');
    }
  };

  const handleBagItem = (stop: RouteStop, target: RouteStop['sampleTargets'][0]) => {
    soundFx.playPennyJackpot();
    setBaggedItems((prev) => prev + 1);

    if (onAddToCart) {
      onAddToCart({
        title: target.name,
        buyPrice: target.buy,
        sellPrice: target.resell,
        store: stop.storeName,
        category: 'Sourcing Run Find',
        notes: `Sourced during Run at ${stop.branchName} (${target.location})`,
      });
    }

    onNotify(`Bagged "${target.name}"! Added to Sourcing Cart.`, 'success');
  };

  const handleExportItinerary = () => {
    const lines = [
      `Sourcing Run Itinerary - ZIP: ${zipCode} (${new Date().toLocaleDateString()})`,
      `Total Stops: ${stops.length} | Est Distance: ${totalMiles.toFixed(1)} miles | Est Drive Time: ${totalDriveMins} mins`,
      `Estimated Sourcing Profit Pool: $${totalPotentialProfit.toFixed(2)}`,
      '',
      '--- STOPS SEQUENCE ---',
      ...stops.map((s, idx) => {
        return `Stop #${idx + 1}: ${s.storeName} (${s.branchName})\nAddress: ${s.address}\nDistance: ${s.distanceMiles} mi (${s.estDriveMins} min)\nStrategy: ${s.clearanceStrategy}\nAisles: ${s.aislesToCheck.join(', ')}\nSample Targets:\n${s.sampleTargets.map((t) => `  - ${t.name} (Buy: $${t.buy} -> Sell: $${t.resell}) @ ${t.location}`).join('\n')}\n`;
      }),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sourcing_Run_Route_${zipCode}_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify('Sourcing Run manifest exported!', 'info');
  };

  const activeStop = stops[activeStopIndex] || stops[0];

  return (
    <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-3.5 sm:p-5 mb-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/30">
              <Navigation className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-[#f5f5f7] tracking-tight">
              In-Store Sourcing Run & Route Optimizer
            </h2>
          </div>
          <p className="text-xs text-[#92929d] mt-1">
            Calculates optimal multi-stop clearance circuits, today’s markdown schedule & in-store aisle coordinates for ZIP <strong className="text-[#ffd60a] font-mono">{zipCode}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportItinerary}
            className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#92929d] hover:text-[#f5f5f7] flex items-center gap-1.5 transition-colors cursor-pointer border border-[#2c2c35]"
            title="Download Route Manifest"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Run Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStops(getInitialStops());
              setBaggedItems(0);
              onNotify('Sourcing route reset to beginning', 'info');
            }}
            className="p-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] transition-colors cursor-pointer border border-[#2c2c35]"
            title="Reset Route"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Trip Overview Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 bg-[#121215] rounded-xl border border-[#2c2c35]">
          <span className="text-[10px] text-[#92929d] uppercase font-bold flex items-center gap-1">
            <Car className="w-3 h-3 text-[#0a84ff]" /> Route Distance
          </span>
          <div className="text-base font-mono font-black text-[#f5f5f7] mt-0.5">
            {totalMiles.toFixed(1)} <span className="text-xs text-[#92929d] font-normal">mi</span>
          </div>
          <span className="text-[10px] text-[#92929d]">~{totalDriveMins} mins driving</span>
        </div>

        <div className="p-2.5 bg-[#121215] rounded-xl border border-[#2c2c35]">
          <span className="text-[10px] text-[#92929d] uppercase font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[#30d158]" /> Profit Pool
          </span>
          <div className="text-base font-mono font-black text-[#30d158] mt-0.5">
            ${totalPotentialProfit.toFixed(0)} <span className="text-xs text-[#92929d] font-normal">est spread</span>
          </div>
          <span className="text-[10px] text-[#92929d]">{stops.length} major clearance anchors</span>
        </div>

        <div className="p-2.5 bg-[#121215] rounded-xl border border-[#2c2c35]">
          <span className="text-[10px] text-[#92929d] uppercase font-bold flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#ffd60a]" /> Today is {todayDayName}
          </span>
          <div className="text-xs font-bold text-[#ffd60a] mt-1 truncate">
            {todayDayName === 'Tuesday' ? 'DG Penny Day!' : todayDayName === 'Thursday' ? 'Target Toys & Baby!' : todayDayName === 'Wednesday' ? "Lowe's Price Cuts!" : 'Regular Markdowns'}
          </div>
          <span className="text-[10px] text-[#92929d]">Priority schedules active</span>
        </div>

        <div className="p-2.5 bg-[#121215] rounded-xl border border-[#2c2c35]">
          <span className="text-[10px] text-[#92929d] uppercase font-bold flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-[#ff9f0a]" /> Run Progress
          </span>
          <div className="text-base font-mono font-black text-[#f5f5f7] mt-0.5">
            {completedStops} / {stops.length} <span className="text-xs text-[#92929d] font-normal">stops</span>
          </div>
          <span className="text-[10px] text-[#30d158] font-bold">{baggedItems} items bagged</span>
        </div>
      </div>

      {/* Stop Selector Carousel / Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {stops.map((stop, idx) => {
          const isActive = idx === activeStopIndex;
          return (
            <button
              key={stop.id}
              type="button"
              onClick={() => setActiveStopIndex(idx)}
              className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 cursor-pointer border ${
                isActive
                  ? 'bg-[#222227] text-[#f5f5f7] border-[#0a84ff] shadow-sm'
                  : 'bg-[#121215] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7]'
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] font-mono flex items-center justify-center font-black ${
                stop.status === 'completed'
                  ? 'bg-[#30d158] text-black'
                  : isActive
                  ? 'bg-[#0a84ff] text-white'
                  : 'bg-[#222227] text-[#92929d]'
              }`}>
                {idx + 1}
              </span>
              <span>{stop.storeName}</span>
              {stop.isTodayPeakDay && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffd60a] animate-ping" title="Peak schedule day!" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Stop Detail Card */}
      {activeStop && (
        <div className="p-4 bg-[#121215] border border-[#2c2c35] rounded-xl space-y-3.5 animate-fade-in">
          {/* Stop Title & Controls */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#222227] text-[#ffd60a] font-mono font-bold">
                  Stop #{activeStopIndex + 1} of {stops.length}
                </span>
                <h3 className="text-sm sm:text-base font-black text-[#f5f5f7]">
                  {activeStop.storeName}
                </h3>
                {activeStop.isTodayPeakDay && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/40">
                    🔥 PEAK TODAY ({todayDayName})
                  </span>
                )}
              </div>
              <p className="text-xs text-[#92929d] mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#ff9800]" />
                <span>{activeStop.address} • {activeStop.distanceMiles} mi ({activeStop.estDriveMins} mins)</span>
              </p>
            </div>

            {/* Google Maps & Navigation Link */}
            <div className="flex items-center gap-1.5">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeStop.address)}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-[#0a84ff] hover:bg-[#0071e3] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Open in GPS</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              {/* Mark Complete Button */}
              {activeStop.status !== 'completed' ? (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(activeStop.id, 'completed')}
                  className="px-3 py-1.5 rounded-xl bg-[#222227] hover:bg-[#30d158]/20 hover:text-[#30d158] text-xs font-bold text-[#92929d] flex items-center gap-1.5 transition-colors border border-[#2c2c35] cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158]" />
                  <span>Mark Done</span>
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-[#30d158]/20 text-[#30d158] font-bold text-xs flex items-center gap-1.5 border border-[#30d158]/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Stop Completed</span>
                </span>
              )}
            </div>
          </div>

          {/* Clearance Strategy Advice */}
          <div className="p-3 bg-[#18181c] rounded-xl border border-[#0a84ff]/30 text-xs">
            <span className="text-[10px] font-bold text-[#0a84ff] uppercase tracking-wider block mb-1">
              Clearance Hunting Strategy & Tag Rules
            </span>
            <p className="text-[#f5f5f7] leading-relaxed">{activeStop.clearanceStrategy}</p>
          </div>

          {/* High Priority Aisles to Walk */}
          <div>
            <span className="text-[11px] font-bold text-[#92929d] uppercase tracking-wider block mb-1.5">
              Priority Aisles & Coordinates to Check
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {activeStop.aislesToCheck.map((aisle, i) => (
                <div key={i} className="p-2 bg-[#18181c] rounded-lg border border-[#2c2c35] text-xs text-[#f5f5f7] flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-[#ffd60a] shrink-0" />
                  <span className="truncate">{aisle}</span>
                </div>
              ))}
            </div>
          </div>

          {/* High Yield Target Items to Look for */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#30d158] uppercase tracking-wider">
                Active High-Spread Targets at this Store
              </span>
              <span className="text-[10px] text-[#92929d]">Tap Bag to instantly add to cart</span>
            </div>

            <div className="space-y-1.5">
              {activeStop.sampleTargets.map((tgt, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-[#18181c] rounded-xl border border-[#2c2c35] flex items-center justify-between gap-2 flex-wrap"
                >
                  <div>
                    <h5 className="font-bold text-xs text-[#f5f5f7]">{tgt.name}</h5>
                    <div className="flex items-center gap-2.5 mt-1 text-[11px] text-[#92929d]">
                      <span>
                        Buy: <strong className="text-[#30d158] font-mono">${tgt.buy.toFixed(2)}</strong>
                      </span>
                      <span>
                        Resell: <strong className="text-[#0a84ff] font-mono">${tgt.resell.toFixed(2)}</strong>
                      </span>
                      <span className="text-[#ffd60a]">{tgt.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onLoadIntoCalculator && (
                      <button
                        type="button"
                        onClick={() =>
                          onLoadIntoCalculator({
                            title: tgt.name,
                            buyPrice: tgt.buy,
                            sellPrice: tgt.resell,
                            store: activeStop.storeName,
                          })
                        }
                        className="px-2 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[11px] font-bold text-[#92929d] hover:text-[#f5f5f7] transition-colors cursor-pointer"
                        title="Load into Calculator"
                      >
                        <DollarSign className="w-3 h-3 text-[#30d158]" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleBagItem(activeStop, tgt)}
                      className="px-2.5 py-1 rounded-lg bg-[#30d158] hover:bg-[#28b84c] text-black text-xs font-black flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>Bag It</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Stop Navigation Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2c2c35]/70 text-xs">
            <button
              type="button"
              disabled={activeStopIndex === 0}
              onClick={() => setActiveStopIndex((prev) => Math.max(0, prev - 1))}
              className="px-3 py-1.5 rounded-lg bg-[#18181c] text-[#92929d] hover:text-[#f5f5f7] disabled:opacity-40 disabled:pointer-events-none font-bold transition-colors cursor-pointer"
            >
              ← Previous Stop
            </button>

            <span className="text-[11px] text-[#92929d]">
              Stop {activeStopIndex + 1} of {stops.length}
            </span>

            <button
              type="button"
              disabled={activeStopIndex === stops.length - 1}
              onClick={() => setActiveStopIndex((prev) => Math.min(stops.length - 1, prev + 1))}
              className="px-3 py-1.5 rounded-lg bg-[#0a84ff]/20 text-[#0a84ff] hover:bg-[#0a84ff]/30 disabled:opacity-40 disabled:pointer-events-none font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Next Stop</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
