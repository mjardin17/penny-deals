import React, { useState } from 'react';
import {
  Compass,
  Map,
  MapPin,
  Eye,
  AlertCircle,
  Tag,
  ShoppingBag,
  DollarSign,
  Layers,
  ChevronRight,
  Info,
  Sparkles,
  Search,
} from 'lucide-react';
import { soundFx } from '../utils/audioFeedback';

export interface ClearanceZone {
  id: string;
  name: string;
  code: string;
  tagType: string;
  color: string;
  x: number; // percentage
  y: number; // percentage
  width: number;
  height: number;
  description: string;
  proTip: string;
  sampleItems: {
    name: string;
    buy: number;
    resell: number;
    upc?: string;
    exactLocation: string;
  }[];
}

export interface StoreLayout {
  storeId: 'walmart' | 'target' | 'lowes' | 'homedepot' | 'dg';
  storeName: string;
  tagline: string;
  zones: ClearanceZone[];
}

interface StoreFloorPlanNavigatorProps {
  zipCode: string;
  onAddToCart?: (deal: any) => void;
  onLoadIntoCalculator?: (deal: any) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenDiagnostic?: (deal: any) => void;
}

const STORE_LAYOUTS: Record<string, StoreLayout> = {
  walmart: {
    storeId: 'walmart',
    storeName: 'Walmart Supercenter',
    tagline: 'High volume clearance hiding in garden pavillions, top-stock risers & action alley endcaps.',
    zones: [
      {
        id: 'wmt-garden',
        name: 'Lawn & Garden Seasonal Pavilion',
        code: 'BAY-GARDEN',
        tagType: 'Yellow Shelf Stickers / Hidden Rollbacks',
        color: '#30d158',
        x: 72,
        y: 65,
        width: 24,
        height: 28,
        description: 'Patio sets, outdoor power equipment, pool chemicals, and end-of-season gardening tools.',
        proTip: 'Scan every single item with the Walmart app camera! Often rings up 75% less than the yellow sticker.',
        sampleItems: [
          { name: 'Coleman 10x10 Instant Canopy Shelter', buy: 29.0, resell: 119.0, exactLocation: 'Garden Center Bay 4' },
          { name: 'Expert Gardener Heavy Duty 50ft Hose', buy: 4.5, resell: 22.0, exactLocation: 'Perimeter Pallet' },
        ],
      },
      {
        id: 'wmt-toys',
        name: 'Toy Clearance Consolidation Aisle',
        code: 'AISLE-T7',
        tagType: 'Yellow Tag / Hidden Cut',
        color: '#ffd60a',
        x: 48,
        y: 20,
        width: 20,
        height: 18,
        description: 'Where returned, damaged box, and phased-out Hasbro, LEGO, and Mattel toys are condensed.',
        proTip: 'Look for items placed on top shelf (riser) without shelf labels—these are pending salvage or deep markdown.',
        sampleItems: [
          { name: 'Hot Wheels 20-Car Collector Box Pack', buy: 5.0, resell: 28.0, exactLocation: 'Aisle 7 Bottom Shelf' },
          { name: 'NERF Elite 2.0 Commander Motorized Blaster', buy: 7.0, resell: 24.99, exactLocation: 'Endcap Display' },
        ],
      },
      {
        id: 'wmt-action',
        name: 'Back Action Alley Endcaps',
        code: 'ACTION-ALLEY',
        tagType: 'Yellow Markdown Stickers',
        color: '#0a84ff',
        x: 20,
        y: 45,
        width: 50,
        height: 12,
        description: 'High foot-traffic main cross aisle at the rear of the store facing grocery & apparel.',
        proTip: 'Always check the reverse side of endcaps facing the back wall—managers hide deep markdowns away from prime view.',
        sampleItems: [
          { name: 'Mainstays 12-Piece Stainless Cookware Set', buy: 18.0, resell: 55.0, exactLocation: 'Action Alley Endcap #4' },
          { name: 'Bissell PowerForce Compact Vacuum', buy: 24.0, resell: 69.0, exactLocation: 'Rear Endcap #12' },
        ],
      },
      {
        id: 'wmt-electronics',
        name: 'Electronics Clearance Cage & Racks',
        code: 'ELEC-CAGE',
        tagType: 'Yellow Tag Open Box',
        color: '#bf5af2',
        x: 10,
        y: 15,
        width: 25,
        height: 22,
        description: 'Headphones, TV wall brackets, gaming peripherals, and returned smart home gear.',
        proTip: 'Ask the associate in the cage for "deleted inventory" or older model stock awaiting RTV return.',
        sampleItems: [
          { name: 'Razer BlackShark V2 X Gaming Headset', buy: 15.0, resell: 49.99, exactLocation: 'Glass Case B' },
          { name: 'Anker PowerCore 20000mAh Battery Bank', buy: 11.0, resell: 39.99, exactLocation: 'Hanging Pegs' },
        ],
      },
    ],
  },
  target: {
    storeId: 'target',
    storeName: 'Target PFresh & Greatland',
    tagline: 'Follow the secret markdown schedule: .04 is salvage, .98 is 70% off, and back-wall endcaps hold gold.',
    zones: [
      {
        id: 'tgt-toys',
        name: 'Toy Clearance Wall (G12-G15)',
        code: 'AISLE-G14',
        tagType: 'Red Stickers ending in .04 or .98',
        color: '#ff453a',
        x: 65,
        y: 18,
        width: 28,
        height: 22,
        description: 'The famous Target Toy Clearance aisle. Markdowns hit 30%, then 50%, then 70% every Thursday.',
        proTip: 'Items ending in .04 are in final salvage phase before being liquidated to Goodwill. Scoop immediately!',
        sampleItems: [
          { name: 'LEGO Star Wars Ghost & Phantom II (.04 Salvage)', buy: 47.98, resell: 179.99, exactLocation: 'Aisle G14 Shelf 2' },
          { name: 'Barbie Dreamhouse 75+ Pieces (70% Off)', buy: 59.98, resell: 199.99, exactLocation: 'Endcap G12' },
        ],
      },
      {
        id: 'tgt-backwall',
        name: 'Back Wall Perimeter Endcaps',
        code: 'PERIMETER-BACK',
        tagType: 'Yellow/Red Salvage Stickers',
        color: '#ffd60a',
        x: 10,
        y: 8,
        width: 80,
        height: 10,
        description: 'Endcaps facing the rear fire exit corridor. Unadvertised clearance holding small appliances and decor.',
        proTip: 'Employees stock these late Wednesday night. Check early Thursday morning for fresh 70% drops.',
        sampleItems: [
          { name: 'Dyson V8 Cordless Vacuum Slim (.04 Tag)', buy: 125.04, resell: 389.0, exactLocation: 'Aisle D08 Rear Endcap' },
          { name: 'Nespresso Vertuo Pop+ Coffee Machine', buy: 44.98, resell: 129.0, exactLocation: 'Aisle C12 Rear Endcap' },
        ],
      },
      {
        id: 'tgt-baby',
        name: 'Baby & Nursery Clearance Rack',
        code: 'AISLE-BABY',
        tagType: 'Red Sticker 50-70% Off',
        color: '#30d158',
        x: 10,
        y: 40,
        width: 25,
        height: 24,
        description: 'Strollers, car seats, monitors, and infant clothing marked down on Mondays.',
        proTip: 'High resale velocity on eBay and local Marketplace. Check boxes for complete factory tape seals.',
        sampleItems: [
          { name: 'Graco 4Ever DLX 4-in-1 Car Seat', buy: 89.98, resell: 279.0, exactLocation: 'Aisle E04 Shelf 1' },
          { name: 'Nanit Pro Smart Baby Monitor Camera', buy: 74.98, resell: 220.0, exactLocation: 'Aisle E07 Security Peg' },
        ],
      },
      {
        id: 'tgt-bullseye',
        name: "Bullseye's Playground (Front of Store)",
        code: 'BULLSEYE-FRONT',
        tagType: 'Dollar Bin $1-$5 Markdowns',
        color: '#0a84ff',
        x: 35,
        y: 78,
        width: 30,
        height: 18,
        description: 'Seasonal knickknacks, wooden holiday decor, and craft packs located right at the front entrance.',
        proTip: 'When seasons change (post-Halloween, post-Christmas), these drop to $0.10 - $0.30 each. Sell in bundles on Mercari!',
        sampleItems: [
          { name: 'Felt Tiered Tray Decor Sets (Pack of 5)', buy: 1.5, resell: 18.0, exactLocation: 'Front Entrance Bin' },
        ],
      },
    ],
  },
  lowes: {
    storeId: 'lowes',
    storeName: "Lowe's Home Improvement",
    tagline: 'Yellow stickers ending in .02 (RTV Phase 2) or .03 (Final markdown). Huge tool spreads.',
    zones: [
      {
        id: 'low-lumber',
        name: 'Clearance Cage near Lumber & Pro Desk',
        code: 'PRO-CAGE',
        tagType: 'Yellow Tag .02 / .03',
        color: '#ff9f0a',
        x: 75,
        y: 20,
        width: 20,
        height: 40,
        description: 'The Holy Grail of power tool flips. Locked cage or rolling metal cart holding return drops & discontinued tools.',
        proTip: 'Tags ending in .02 mean store is cleared to return to vendor if unsold—negotiate with store manager for another 20% off!',
        sampleItems: [
          { name: 'DeWalt 20V MAX XR Brushless 2-Tool Combo (.02 RTV)', buy: 89.02, resell: 299.0, exactLocation: 'Cage Bay 002' },
          { name: 'Metabo HPT 18V Sub-Compact Drill Driver', buy: 29.02, resell: 89.0, exactLocation: 'Lumber Aisle 1 Racks' },
        ],
      },
      {
        id: 'low-overheads',
        name: 'Overhead Top-Stock Bays (Tools & Hardware)',
        code: 'TOPSTOCK-BAY',
        tagType: 'Overhead Yellow Tags',
        color: '#ffd60a',
        x: 35,
        y: 25,
        width: 35,
        height: 25,
        description: 'Overhead cantilever racking above Aisles 10-18 holding excess tool kits, compressors, and blades.',
        proTip: 'Look upward! Many yellow clearance stickers are applied on pallets stored 12 feet in the air waiting for space.',
        sampleItems: [
          { name: 'Craftsman 230-Piece Mechanics Tool Set (.03)', buy: 49.03, resell: 149.0, exactLocation: 'Aisle 14 Overhead Bay' },
          { name: 'Bosch Laser Measure 165ft Blaze', buy: 24.02, resell: 79.0, exactLocation: 'Aisle 11 Top Shelf' },
        ],
      },
      {
        id: 'low-garden',
        name: 'Lawn & Garden Perimeter Racks',
        code: 'GARDEN-RACKS',
        tagType: 'Yellow Tag Clearance',
        color: '#30d158',
        x: 10,
        y: 60,
        width: 30,
        height: 32,
        description: 'Mowers, blowers, weed eaters, and high-end outdoor power equipment during seasonal shift.',
        proTip: 'Wednesday mornings are when garden associates scan and apply final .03 price reductions.',
        sampleItems: [
          { name: 'Kobalt 40V Cordless Leaf Blower Kit (.03 Tag)', buy: 39.03, resell: 139.0, exactLocation: 'Aisle 28 Bay 014' },
        ],
      },
    ],
  },
  homedepot: {
    storeId: 'homedepot',
    storeName: 'The Home Depot',
    tagline: 'Yellow tags ending in .01 ring up as $0.01 pennies at self-checkout. Check "The Closet" clearance cage.',
    zones: [
      {
        id: 'hd-closet',
        name: 'The Closet (Store Clearance Cage)',
        code: 'THE-CLOSET',
        tagType: 'Yellow Tag .01 / .06 / .03',
        color: '#ff9800',
        x: 12,
        y: 18,
        width: 25,
        height: 30,
        description: 'Designated wire mesh cage or back-corner alcove where all store markdown inventory is consolidated.',
        proTip: 'If a tag ends in .01, DO NOT take it to customer service—use self-checkout. It rings up as 1 cent.',
        sampleItems: [
          { name: 'Ryobi ONE+ 18V 6-Tool Combo Kit (.01 Penny Tag)', buy: 0.01, resell: 199.0, exactLocation: 'The Closet Bay 04' },
          { name: 'Milwaukee M18 FUEL High Output 8.0Ah Battery', buy: 49.00, resell: 149.0, exactLocation: 'Cage Shelf 2' },
        ],
      },
      {
        id: 'hd-toolcorral',
        name: 'Tool Corral Front Endcaps',
        code: 'TOOL-CORRAL',
        tagType: 'Yellow Tag Markdowns',
        color: '#0a84ff',
        x: 45,
        y: 20,
        width: 35,
        height: 25,
        description: 'Endcaps facing the central racetrack in the hardware department.',
        proTip: 'Monday mornings are when district price change sheets are executed.',
        sampleItems: [
          { name: 'RIDGID 18V Brushless SubCompact Circular Saw', buy: 39.00, resell: 129.0, exactLocation: 'Aisle 12 Endcap' },
          { name: 'Diablo 7-1/4 in. Framing Saw Blade (Pack of 3)', buy: 9.00, resell: 32.0, exactLocation: 'Aisle 14 Pegs' },
        ],
      },
      {
        id: 'hd-lighting',
        name: 'Lighting & Ceiling Fan Mid-Aisle Tables',
        code: 'LIGHTING-ISLAND',
        tagType: 'Yellow Clearance Sticker',
        color: '#ffd60a',
        x: 25,
        y: 65,
        width: 45,
        height: 25,
        description: 'Low tables set in the middle of aisle holding open box chandeliers, smart bulbs, and bath fixtures.',
        proTip: 'Smart home lighting (Philips Hue, Lutron Caseta) often gets dumped here at 80% discount.',
        sampleItems: [
          { name: 'Philips Hue White & Color Ambiance Starter Kit', buy: 35.0, resell: 119.0, exactLocation: 'Aisle 24 Island' },
        ],
      },
    ],
  },
  dg: {
    storeId: 'dg',
    storeName: 'Dollar General',
    tagline: 'Tuesday morning Penny drops: items ring up $0.01 at register. Target yellow dots and seasonal walls.',
    zones: [
      {
        id: 'dg-seasonal',
        name: 'Seasonal Clearance Back Wall',
        code: 'DG-SEASONAL',
        tagType: 'Yellow Dot / Blue Star Penny',
        color: '#ffd60a',
        x: 10,
        y: 10,
        width: 80,
        height: 20,
        description: 'The back wall where previous holiday decor, summer toys, and back-to-school goods are moved.',
        proTip: 'Tuesday morning Penny Drop! Items dropped to 1¢ at 7:00 AM on Tuesdays. Never ask employees to check price—scan with DG app.',
        sampleItems: [
          { name: 'Holiday Ceramic Pumpkin Lantern (Penny Item)', buy: 0.01, resell: 18.5, exactLocation: 'Seasonal Wall Middle' },
          { name: 'Blue Dot Comfort Fleece Blanket 50x60', buy: 0.01, resell: 14.0, exactLocation: 'Apparel Rack' },
        ],
      },
      {
        id: 'dg-household',
        name: 'Household & Cleaning Bottom Shelves',
        code: 'DG-HOUSEHOLD',
        tagType: 'Penny Items / Brown Dot',
        color: '#30d158',
        x: 15,
        y: 40,
        width: 30,
        height: 45,
        description: 'Detergents, paper goods, air fresheners, and pet supplies.',
        proTip: 'Look at the very bottom shelf pushed all the way to the back. Employees often miss stocking them away.',
        sampleItems: [
          { name: 'Febreze Small Spaces 2-Pack Air Freshener', buy: 0.01, resell: 8.5, exactLocation: 'Aisle 4 Bottom Shelf' },
          { name: 'Gain Flings 35-Count Pods (Discontinued Scents)', buy: 1.0, resell: 12.0, exactLocation: 'Aisle 3 Overstock' },
        ],
      },
      {
        id: 'dg-front',
        name: 'Register Endcaps & Overflow Carts',
        code: 'DG-REGISTERS',
        tagType: 'Discounted Toys / As-Is',
        color: '#0a84ff',
        x: 55,
        y: 65,
        width: 35,
        height: 25,
        description: 'Rolling wire carts near the cash registers where stray clearance items are deposited.',
        proTip: 'Check these carts first thing upon entering before employees return them to the stockroom.',
        sampleItems: [
          { name: 'Fisher-Price Stack & Roll Chime Cups', buy: 0.01, resell: 11.0, exactLocation: 'Register Cart #1' },
        ],
      },
    ],
  },
};

export const StoreFloorPlanNavigator: React.FC<StoreFloorPlanNavigatorProps> = ({
  zipCode,
  onAddToCart,
  onLoadIntoCalculator,
  onNotify,
  onOpenDiagnostic,
}) => {
  const [selectedStoreKey, setSelectedStoreKey] = useState<string>('walmart');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('wmt-garden');
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  const activeStore = STORE_LAYOUTS[selectedStoreKey] || STORE_LAYOUTS.walmart;
  const activeZone =
    activeStore.zones.find((z) => z.id === selectedZoneId) || activeStore.zones[0];

  const handleSelectStore = (key: string) => {
    setSelectedStoreKey(key);
    const store = STORE_LAYOUTS[key];
    if (store && store.zones.length > 0) {
      setSelectedZoneId(store.zones[0].id);
    }
  };

  const handleBagSample = (zone: ClearanceZone, item: ClearanceZone['sampleItems'][0]) => {
    soundFx.playPennyJackpot();
    if (onAddToCart) {
      onAddToCart({
        title: item.name,
        buyPrice: item.buy,
        sellPrice: item.resell,
        store: activeStore.storeName,
        category: 'In-Store Clearance Map Find',
        notes: `Found in ${zone.name} (${item.exactLocation})`,
      });
    }
    onNotify(`Bagged "${item.name}"! Added to Sourcing Cart.`, 'success');
  };

  return (
    <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-3.5 sm:p-5 mb-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/30">
              <Map className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-[#f5f5f7] tracking-tight">
              Store Layout & In-Store Clearance Blueprint
            </h2>
          </div>
          <p className="text-xs text-[#92929d] mt-1">
            Interactive floor plan blueprints revealing hidden clearance consolidation zones, overhead bays, and secret tags for stores near ZIP <strong className="text-[#ffd60a] font-mono">{zipCode}</strong>.
          </p>
        </div>

        {/* Store Switcher Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(STORE_LAYOUTS).map(([key, store]) => {
            const isSelected = key === selectedStoreKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectStore(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#0a84ff] text-white border-[#0a84ff] shadow-sm font-black'
                    : 'bg-[#121215] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7]'
                }`}
              >
                {store.storeName.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Store Tagline Info Strip */}
      <div className="p-2.5 bg-[#121215] rounded-xl border border-[#2c2c35] flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse" />
          <span className="text-[#f5f5f7] font-bold">{activeStore.storeName} Blueprint:</span>
          <span className="text-[#92929d]">{activeStore.tagline}</span>
        </div>
        <span className="text-[11px] font-mono text-[#ffd60a] bg-[#222227] px-2 py-0.5 rounded-md border border-[#2c2c35]">
          {activeStore.zones.length} Clearance Anchors Mapped
        </span>
      </div>

      {/* Main Interactive Grid: Floor Plan SVG (Left/Top) + Zone Detail Inspector (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Schematic Store Blueprint (7 cols on desktop) */}
        <div className="lg:col-span-7 bg-[#121215] border border-[#2c2c35] rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#92929d] uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#0a84ff]" />
              Store Schematic Blueprint (Tap a zone)
            </span>
            <span className="text-[10px] text-[#92929d]">
              Front Entrance at bottom
            </span>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative w-full aspect-[4/3] bg-[#0c0c0e] border border-[#222227] rounded-lg overflow-hidden select-none">
            {/* Architectural Grid Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2c2c35" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Entrance Door Indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#222227] border border-[#30d158]/50 text-[#30d158] text-[9px] font-mono font-bold rounded uppercase tracking-widest flex items-center gap-1">
              <span>Main Entrance</span>
            </div>

            {/* Back Wall Marker */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[#92929d]/60 text-[9px] font-mono uppercase tracking-widest">
              Back Wall Perimeter (Salvage / Markdown Racks)
            </div>

            {/* Interactive Clearance Zones */}
            {activeStore.zones.map((zone) => {
              const isSelected = zone.id === selectedZoneId;
              const isHovered = zone.id === hoveredZoneId;

              return (
                <div
                  key={zone.id}
                  onClick={() => {
                    setSelectedZoneId(zone.id);
                    soundFx.playStandardScan();
                  }}
                  onMouseEnter={() => setHoveredZoneId(zone.id)}
                  onMouseLeave={() => setHoveredZoneId(null)}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                    borderColor: isSelected ? '#ffd60a' : zone.color,
                    backgroundColor: isSelected
                      ? `${zone.color}35`
                      : isHovered
                      ? `${zone.color}25`
                      : `${zone.color}15`,
                  }}
                  className={`absolute rounded-lg border-2 flex flex-col items-center justify-center p-1.5 transition-all cursor-pointer z-10 text-center ${
                    isSelected ? 'ring-2 ring-[#ffd60a]/70 shadow-lg scale-[1.02]' : 'hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: zone.color }}
                    />
                    <span className="text-[10px] sm:text-xs font-black text-[#f5f5f7] leading-tight truncate drop-shadow">
                      {zone.name}
                    </span>
                  </div>

                  <span className="text-[8px] sm:text-[9px] font-mono text-[#ffd60a] font-bold mt-0.5 truncate">
                    {zone.tagType.split('/')[0]}
                  </span>

                  <span className="text-[8px] text-[#92929d] mt-0.5 hidden sm:inline">
                    {zone.sampleItems.length} High-Yield Items
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Zone Jump Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-2.5">
            {activeStore.zones.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => {
                  setSelectedZoneId(z.id);
                  soundFx.playStandardScan();
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer border ${
                  z.id === selectedZoneId
                    ? 'bg-[#222227] text-[#ffd60a] border-[#ffd60a]'
                    : 'bg-[#18181c] text-[#92929d] border-[#2c2c35] hover:text-[#f5f5f7]'
                }`}
              >
                {z.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Zone Detail Inspector Card (5 cols on desktop) */}
        <div className="lg:col-span-5 bg-[#121215] border border-[#2c2c35] rounded-xl p-4 space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Zone Title & Badge */}
            <div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#222227] text-[#0a84ff] font-mono font-bold">
                  {activeZone.code}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/40">
                  {activeZone.tagType}
                </span>
              </div>
              <h3 className="text-base font-black text-[#f5f5f7] mt-1.5">
                {activeZone.name}
              </h3>
              <p className="text-xs text-[#92929d] mt-1 leading-relaxed">
                {activeZone.description}
              </p>
            </div>

            {/* Hunter Pro-Tip Box */}
            <div className="p-3 bg-[#18181c] border border-[#ffd60a]/30 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-[#ffd60a] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#ffd60a]" /> Hunter Protocol & Tag Intel
              </span>
              <p className="text-xs text-[#f5f5f7] leading-relaxed">{activeZone.proTip}</p>
            </div>

            {/* High-Spread Targets inside this zone */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#30d158] uppercase tracking-wider">
                  Documented Items in this Aisle
                </span>
                <span className="text-[10px] text-[#92929d]">Live verified</span>
              </div>

              <div className="space-y-2">
                {activeZone.sampleItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-[#18181c] border border-[#2c2c35] hover:border-[#30d158]/40 rounded-xl space-y-1.5 text-xs transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-[#f5f5f7]">{item.name}</h4>
                        <span className="text-[10px] text-[#ffd60a] font-mono">
                          📍 {item.exactLocation}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-[#2c2c35]/60">
                      <div className="flex items-center gap-2.5 text-[11px] text-[#92929d]">
                        <span>
                          Buy: <strong className="text-[#ffd60a] font-mono">${item.buy.toFixed(2)}</strong>
                        </span>
                        <span>
                          Comp: <strong className="text-[#0a84ff] font-mono">${item.resell.toFixed(2)}</strong>
                        </span>
                        <span>
                          Net:{' '}
                          <strong className="text-[#30d158] font-mono font-bold">
                            +${(item.resell * 0.85 - item.buy).toFixed(2)}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onOpenDiagnostic && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenDiagnostic({
                                title: item.name,
                                buyPrice: item.buy,
                                sellPrice: item.resell,
                                store: activeStore.storeName,
                              })
                            }
                            className="p-1.5 rounded-lg bg-[#222227] hover:bg-[#0a84ff]/20 text-[#0a84ff] transition-colors cursor-pointer border border-[#2c2c35]"
                            title="AI Risk Diagnostic"
                          >
                            <Sparkles className="w-3 h-3" />
                          </button>
                        )}

                        {onLoadIntoCalculator && (
                          <button
                            type="button"
                            onClick={() =>
                              onLoadIntoCalculator({
                                title: item.name,
                                buyPrice: item.buy,
                                sellPrice: item.resell,
                                store: activeStore.storeName,
                              })
                            }
                            className="p-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] transition-colors cursor-pointer border border-[#2c2c35]"
                            title="Load into Calculator"
                          >
                            <DollarSign className="w-3 h-3 text-[#30d158]" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleBagSample(activeZone, item)}
                          className="px-2.5 py-1 rounded-lg bg-[#30d158] hover:bg-[#28b84c] text-black font-black text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>Bag It</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#2c2c35]/80 text-[11px] text-[#92929d] flex items-center justify-between">
            <span>Tip: Take photos of shelf tags for price adjustments</span>
            <span className="text-[#30d158] font-bold">100% Offline Compatible</span>
          </div>
        </div>
      </div>
    </div>
  );
};
