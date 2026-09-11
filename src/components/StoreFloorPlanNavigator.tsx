import React, { useState, useMemo } from 'react';
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
  CheckSquare,
  Square,
  Navigation,
  MessageSquare,
  HelpCircle,
  Footprints,
  Box,
  CornerDownRight,
  ShieldAlert,
  ArrowRight,
  X,
  Volume2,
  Check,
  Filter,
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
  aisleCoords: string;
  walkingRoute: string;
  hidingPattern: string;
  sampleItems: {
    name: string;
    buy: number;
    resell: number;
    sku?: string;
    upc?: string;
    exactLocation: string;
    shelfLevel: 'Overhead Top Stock' | 'Eye-Level Shelf' | 'Bottom Shelf / Kickplate' | 'Perimeter Endcap' | 'Middle Dump Table' | 'Customer Returns Cart';
    hidingCues: string;
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
    tagline: 'High volume clearance hiding in garden pavilions, top-stock risers & action alley endcaps.',
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
        aisleCoords: 'Garden Center • Bays G1 - G8 & Outdoor Pallets',
        walkingRoute: 'From entrance, follow main right-side perimeter wall straight into outdoor garden pavilion.',
        hidingPattern: 'Stack pallets near greenhouse perimeter fence & bottom kickplates under tool racks.',
        description: 'Patio sets, outdoor power equipment, pool chemicals, and end-of-season gardening tools.',
        proTip: 'Scan every single item with the Walmart app camera! Often rings up 75% less than the yellow sticker.',
        sampleItems: [
          {
            name: 'Coleman 10x10 Instant Canopy Shelter',
            buy: 29.0,
            resell: 119.0,
            sku: '59281042',
            exactLocation: 'Garden Center Bay 4 (Bottom Pallet)',
            shelfLevel: 'Bottom Shelf / Kickplate',
            hidingCues: 'Placed on floor wood pallet behind weed trimmers; yellow tag scratched off.',
          },
          {
            name: 'Expert Gardener Heavy Duty 50ft Hose',
            buy: 4.5,
            resell: 22.0,
            sku: '84910294',
            exactLocation: 'Perimeter Pallet near Soil Bags',
            shelfLevel: 'Perimeter Endcap',
            hidingCues: 'Rings up $4.50 in app despite $19.97 shelf label.',
          },
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
        aisleCoords: 'Aisle T7 - T9 • Middle Racks',
        walkingRoute: 'Walk straight past apparel towards rear toys. T7 is the designated clearance consolidation lane.',
        hidingPattern: 'Look on Top-Stock shelf (upper riser without price tags) and bottom kickplates.',
        description: 'Where returned, damaged box, and phased-out Hasbro, LEGO, and Mattel toys are condensed.',
        proTip: 'Look for items placed on top shelf (riser) without shelf labels—these are pending salvage or deep markdown.',
        sampleItems: [
          {
            name: 'Hot Wheels 20-Car Collector Box Pack',
            buy: 5.0,
            resell: 28.0,
            sku: '19482019',
            exactLocation: 'Aisle 7 Bottom Kickplate Shelf',
            shelfLevel: 'Bottom Shelf / Kickplate',
            hidingCues: 'Pushed back behind older Barbie boxes; barcode intact.',
          },
          {
            name: 'NERF Elite 2.0 Commander Motorized Blaster',
            buy: 7.0,
            resell: 24.99,
            sku: '73910482',
            exactLocation: 'Aisle T8 Overhead Top Stock',
            shelfLevel: 'Overhead Top Stock',
            hidingCues: 'Box placed on upper riser without price strip. Pull down with pole or ask clerk.',
          },
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
        aisleCoords: 'Main Back Crossway • Endcaps Facing Rear Wall',
        walkingRoute: 'Follow central grocery corridor all the way to rear wall. Inspect reverse sides of endcaps.',
        hidingPattern: 'Endcaps turned facing the back maintenance corridor away from shoppers.',
        description: 'High foot-traffic main cross aisle at the rear of the store facing grocery & apparel.',
        proTip: 'Always check the reverse side of endcaps facing the back wall—managers hide deep markdowns away from prime view.',
        sampleItems: [
          {
            name: 'Mainstays 12-Piece Stainless Cookware Set',
            buy: 18.0,
            resell: 55.0,
            sku: '38291048',
            exactLocation: 'Action Alley Endcap #4 (Reverse Side)',
            shelfLevel: 'Perimeter Endcap',
            hidingCues: 'Facing freezer wall, not main aisle. Yellow clearance badge on upper left box.',
          },
          {
            name: 'Bissell PowerForce Compact Vacuum',
            buy: 24.0,
            resell: 69.0,
            sku: '49281039',
            exactLocation: 'Rear Endcap #12 by Restrooms',
            shelfLevel: 'Perimeter Endcap',
            hidingCues: 'Yellow sticker shows $24.00, marked down from $69.00.',
          },
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
        aisleCoords: 'Electronics Department • Rear Counter & Glass Lockup C',
        walkingRoute: 'Head to back left corner. Check wire rack next to the photo pickup counter.',
        hidingPattern: 'Locked under bottom sliding glass cabinet or hanging on security spider-wrap pegs.',
        description: 'Headphones, TV wall brackets, gaming peripherals, and returned smart home gear.',
        proTip: 'Ask the associate in the cage for "deleted inventory" or older model stock awaiting RTV return.',
        sampleItems: [
          {
            name: 'Razer BlackShark V2 X Gaming Headset',
            buy: 15.0,
            resell: 49.99,
            sku: '82910482',
            exactLocation: 'Glass Case B (Bottom Sliding Drawer)',
            shelfLevel: 'Bottom Shelf / Kickplate',
            hidingCues: 'Locked in base compartment. Associate has master key.',
          },
          {
            name: 'Anker PowerCore 20000mAh Battery Bank',
            buy: 11.0,
            resell: 39.99,
            sku: '19482048',
            exactLocation: 'Hanging Pegs on Security Endcap',
            shelfLevel: 'Eye-Level Shelf',
            hidingCues: 'Yellow clearance sticker covering original UPC.',
          },
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
        aisleCoords: 'Aisle G12 - G15 • Outer Wall Endcaps',
        walkingRoute: 'Turn right at center racetrack past home goods into Toy department rear quadrant.',
        hidingPattern: 'Outward-facing endcaps pointing towards wall, never on main aisle entrances.',
        description: 'The famous Target Toy Clearance aisle. Markdowns hit 30%, then 50%, then 70% every Thursday.',
        proTip: 'Items ending in .04 are in final salvage phase before being liquidated to Goodwill. Scoop immediately!',
        sampleItems: [
          {
            name: 'LEGO Star Wars Ghost & Phantom II (.04 Salvage)',
            buy: 47.98,
            resell: 179.99,
            sku: '204-00-1928',
            exactLocation: 'Aisle G14 Shelf 2 (Outer Wall Endcap)',
            shelfLevel: 'Perimeter Endcap',
            hidingCues: 'Tiny yellow square sticker on upper right: says "70" in circle, ending in .04.',
          },
          {
            name: 'Barbie Dreamhouse 75+ Pieces (70% Off)',
            buy: 59.98,
            resell: 199.99,
            sku: '204-12-8491',
            exactLocation: 'Endcap G12 (Floor Level)',
            shelfLevel: 'Bottom Shelf / Kickplate',
            hidingCues: 'Resting on lower floor baseboard behind board games.',
          },
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
        aisleCoords: 'Perimeter Wall C & D • Rear Service Corridor',
        walkingRoute: 'Walk straight through apparel to the farthest rear wall under the home decor signs.',
        hidingPattern: 'Facing fire exits and emergency doors; associates stash overflow markdowns here.',
        description: 'Endcaps facing the rear fire exit corridor. Unadvertised clearance holding small appliances and decor.',
        proTip: 'Employees stock these late Wednesday night. Check early Thursday morning for fresh 70% drops.',
        sampleItems: [
          {
            name: 'Dyson V8 Cordless Vacuum Slim (.04 Tag)',
            buy: 125.04,
            resell: 389.0,
            sku: '072-04-1029',
            exactLocation: 'Aisle D08 Rear Wall Endcap',
            shelfLevel: 'Perimeter Endcap',
            hidingCues: 'Security spider-wrapped with red salvage sticker ending in .04.',
          },
          {
            name: 'Nespresso Vertuo Pop+ Coffee Machine',
            buy: 44.98,
            resell: 129.0,
            sku: '072-08-3921',
            exactLocation: 'Aisle C12 Rear Endcap Shelf 3',
            shelfLevel: 'Eye-Level Shelf',
            hidingCues: 'Marked 70% off with yellow clearance label.',
          },
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
        aisleCoords: 'Aisle E04 - E07 • Nursery Back Corner',
        walkingRoute: 'From baby apparel, walk past diaper wall into crib and stroller alcove.',
        hidingPattern: 'Strollers tucked under display mockups and behind oversized crib boxes.',
        description: 'Strollers, car seats, monitors, and infant clothing marked down on Mondays.',
        proTip: 'High resale velocity on eBay and local Marketplace. Check boxes for complete factory tape seals.',
        sampleItems: [
          {
            name: 'Graco 4Ever DLX 4-in-1 Car Seat',
            buy: 89.98,
            resell: 279.0,
            sku: '030-09-4819',
            exactLocation: 'Aisle E04 Shelf 1',
            shelfLevel: 'Bottom Shelf / Kickplate',
            hidingCues: 'Factory sealed box with yellow target clearance sticker.',
          },
          {
            name: 'Nanit Pro Smart Baby Monitor Camera',
            buy: 74.98,
            resell: 220.0,
            sku: '030-04-1829',
            exactLocation: 'Aisle E07 Security Peg',
            shelfLevel: 'Eye-Level Shelf',
            hidingCues: 'Inside plastic security keeper case.',
          },
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
        aisleCoords: 'Front Entrance • Section 1 - 6 Bins',
        walkingRoute: 'Immediately inside the main sliding doors before Starbucks & guest services.',
        hidingPattern: 'Bottom tiers of tiered wooden bin carts.',
        description: 'Seasonal knickknacks, wooden holiday decor, and craft packs located right at the front entrance.',
        proTip: 'When seasons change (post-Halloween, post-Christmas), these drop to $0.10 - $0.30 each. Sell in bundles on Mercari!',
        sampleItems: [
          {
            name: 'Felt Tiered Tray Decor Sets (Pack of 5)',
            buy: 1.5,
            resell: 18.0,
            sku: '234-01-9281',
            exactLocation: 'Front Entrance Bin #3 Lower Shelf',
            shelfLevel: 'Middle Dump Table',
            hidingCues: 'Packaged together in clear cellophane with $1-$3 retail stickers.',
          },
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
        aisleCoords: 'Lumber Aisle 1 • Pro Contractor Register Alcove',
        walkingRoute: 'Enter through contractor/lumber entrance on the far right. Cage is situated behind Pro Desk.',
        hidingPattern: 'Locked inside wire security cage or rolled onto heavy-duty wire mobile cart.',
        description: 'The Holy Grail of power tool flips. Locked cage or rolling metal cart holding return drops & discontinued tools.',
        proTip: 'Tags ending in .02 mean store is cleared to return to vendor if unsold—negotiate with store manager for another 20% off!',
        sampleItems: [
          {
            name: 'DeWalt 20V MAX XR Brushless 2-Tool Combo (.02 RTV)',
            buy: 89.02,
            resell: 299.0,
            sku: '1004921',
            exactLocation: 'Pro Cage Bay 002 (Middle Shelf)',
            shelfLevel: 'Eye-Level Shelf',
            hidingCues: 'Yellow sticker with .02 ending. Ask Pro Desk associate to unlock.',
          },
          {
            name: 'Metabo HPT 18V Sub-Compact Drill Driver',
            buy: 29.02,
            resell: 89.0,
            sku: '849102',
            exactLocation: 'Lumber Aisle 1 Racks Bottom Shelf',
            shelfLevel: 'Bottom Shelf / Kickplate',
            hidingCues: 'Open box return, tape sealed, yellow sticker on side handle.',
          },
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
        aisleCoords: 'Aisles 10 - 18 • Overheads Bay 004 - 012',
        walkingRoute: 'Walk down central tool boulevard. Look directly upwards at upper pallet tiers (10ft+).',
        hidingPattern: 'Overhead brown cardboard cartons labeled with handwritten black Sharpie SKUs.',
        description: 'Overhead cantilever racking above Aisles 10-18 holding excess tool kits, compressors, and blades.',
        proTip: 'Look upward! Many yellow clearance stickers are applied on pallets stored 12 feet in the air waiting for space.',
        sampleItems: [
          {
            name: 'Craftsman 230-Piece Mechanics Tool Set (.03)',
            buy: 49.03,
            resell: 149.0,
            sku: '928104',
            exactLocation: 'Aisle 14 Overhead Bay 008',
            shelfLevel: 'Overhead Top Stock',
            hidingCues: 'Sitting on upper pallet rack. Yellow clearance tag visible from aisle floor.',
          },
          {
            name: 'Bosch Laser Measure 165ft Blaze',
            buy: 24.02,
            resell: 79.0,
            sku: '381920',
            exactLocation: 'Aisle 11 Top Shelf Riser',
            shelfLevel: 'Overhead Top Stock',
            hidingCues: 'Tucked into top rack above tape measures.',
          },
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
        aisleCoords: 'Aisle 28 - 34 • Outside Nursery Compound',
        walkingRoute: 'Pass customer service on left through double automatic doors into outside garden center.',
        hidingPattern: 'Metal rolling carts and bottom racks under outdoor power equipment canopies.',
        description: 'Mowers, blowers, weed eaters, and high-end outdoor power equipment during seasonal shift.',
        proTip: 'Wednesday mornings are when garden associates scan and apply final .03 price reductions.',
        sampleItems: [
          {
            name: 'Kobalt 40V Cordless Leaf Blower Kit (.03 Tag)',
            buy: 39.03,
            resell: 139.0,
            sku: '482019',
            exactLocation: 'Aisle 28 Bay 014 (Back Wall)',
            shelfLevel: 'Bottom Shelf / Kickplate',
            hidingCues: 'Box has slight water mark on corner; tool is pristine.',
          },
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
        aisleCoords: 'Aisle 1 Back Corner or Receiving Bay 1',
        walkingRoute: 'Head to back left corner behind kitchen showrooms. Look for wire-mesh locked alcove.',
        hidingPattern: 'High-density wire shelving where RTV items and final markdown items are consolidated.',
        description: 'Designated wire mesh cage or back-corner alcove where all store markdown inventory is consolidated.',
        proTip: 'If a tag ends in .01, DO NOT take it to customer service—use self-checkout. It rings up as 1 cent.',
        sampleItems: [
          {
            name: 'Ryobi ONE+ 18V 6-Tool Combo Kit (.01 Penny Tag)',
            buy: 0.01,
            resell: 199.0,
            sku: '100692819',
            exactLocation: 'The Closet Bay 04 (Lower Shelf)',
            shelfLevel: 'Customer Returns Cart',
            hidingCues: 'Yellow sticker with .01 ending; marked for salvage destruction.',
          },
          {
            name: 'Milwaukee M18 FUEL High Output 8.0Ah Battery',
            buy: 49.0,
            resell: 149.0,
            sku: '100482910',
            exactLocation: 'Cage Shelf 2 (Behind Wire Gate)',
            shelfLevel: 'Eye-Level Shelf',
            hidingCues: 'Unclaimed online order pickup marked down to .03.',
          },
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
        aisleCoords: 'Aisles 12 - 16 • Tool Corral Front & Back Endcaps',
        walkingRoute: 'Follow central orange race track into Hardware center. Check endcaps facing power tools.',
        hidingPattern: 'Endcaps facing the back wall or side corridors rather than the main wide aisle.',
        description: 'Endcaps facing the central racetrack in the hardware department.',
        proTip: 'Monday mornings are when district price change sheets are executed.',
        sampleItems: [
          {
            name: 'RIDGID 18V Brushless SubCompact Circular Saw',
            buy: 39.0,
            resell: 129.0,
            sku: '100592810',
            exactLocation: 'Aisle 12 Endcap Facing Back Wall',
            shelfLevel: 'Perimeter Endcap',
            hidingCues: 'Yellow sticker shows $39.00 (.00 manager special).',
          },
          {
            name: 'Diablo 7-1/4 in. Framing Saw Blade (Pack of 3)',
            buy: 9.0,
            resell: 32.0,
            sku: '100294819',
            exactLocation: 'Aisle 14 Pegs (Behind regular blades)',
            shelfLevel: 'Eye-Level Shelf',
            hidingCues: 'False-fronted behind standard 24-tooth single blades.',
          },
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
        aisleCoords: 'Aisles 23 - 26 • Mid-Aisle Low Tables',
        walkingRoute: 'Walk into lighting department midway between entrance and paint desks.',
        hidingPattern: 'Low wooden tables placed in middle of aisle holding open-box chandeliers and smart fixtures.',
        description: 'Low tables set in the middle of aisle holding open box chandeliers, smart bulbs, and bath fixtures.',
        proTip: 'Smart home lighting (Philips Hue, Lutron Caseta) often gets dumped here at 80% discount.',
        sampleItems: [
          {
            name: 'Philips Hue White & Color Ambiance Starter Kit',
            buy: 35.0,
            resell: 119.0,
            sku: '100392810',
            exactLocation: 'Aisle 24 Island Table Under Display',
            shelfLevel: 'Middle Dump Table',
            hidingCues: 'Yellow sticker on tape-sealed retail box. Ends in .03.',
          },
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
        aisleCoords: 'Farthest Back Wall • Spans Width of Store',
        walkingRoute: 'Walk directly down center aisle to back wall. Follow seasonal hanging banners.',
        hidingPattern: 'Bottom shelves and top risers behind seasonal candy displays.',
        description: 'The back wall where previous holiday decor, summer toys, and back-to-school goods are moved.',
        proTip: 'Tuesday morning Penny Drop! Items dropped to 1¢ at 7:00 AM on Tuesdays. Never ask employees to check price—scan with DG app.',
        sampleItems: [
          {
            name: 'Holiday Ceramic Pumpkin Lantern (Penny Item)',
            buy: 0.01,
            resell: 18.5,
            sku: '8491028',
            exactLocation: 'Seasonal Wall Middle Shelf 1',
            shelfLevel: 'Bottom Shelf / Kickplate',
            hidingCues: 'Blue Dot symbol on price tag. Dropped to 1¢ on Tuesday morning cycle.',
          },
          {
            name: 'Blue Dot Comfort Fleece Blanket 50x60',
            buy: 0.01,
            resell: 14.0,
            sku: '9281048',
            exactLocation: 'Apparel Rack Hanging Endcap',
            shelfLevel: 'Eye-Level Shelf',
            hidingCues: 'Hanging on corner apparel peg. Rings 1¢ at self-checkout.',
          },
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
        aisleCoords: 'Aisle 3 & 4 • Cleaning & Detergent Bays',
        walkingRoute: 'Left side of store. Aisle 4 contains paper goods and chemical detergents.',
        hidingPattern: 'Push your hand deep into bottom shelf behind current stock.',
        description: 'Detergents, paper goods, air fresheners, and pet supplies.',
        proTip: 'Look at the very bottom shelf pushed all the way to the back. Employees often miss stocking them away.',
        sampleItems: [
          {
            name: 'Febreze Small Spaces 2-Pack Air Freshener',
            buy: 0.01,
            resell: 8.5,
            sku: '3819204',
            exactLocation: 'Aisle 4 Bottom Shelf (Pushed Back)',
            shelfLevel: 'Bottom Shelf / Kickplate',
            hidingCues: 'Discontinued scent (Holiday Pine). Scans 1¢ in Dollar General app.',
          },
          {
            name: 'Gain Flings 35-Count Pods (Discontinued Scents)',
            buy: 1.0,
            resell: 12.0,
            sku: '7491028',
            exactLocation: 'Aisle 3 Top Overstock Tier',
            shelfLevel: 'Overhead Top Stock',
            hidingCues: 'Placed on top shelf without tag. Brown dot clearance.',
          },
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
        aisleCoords: 'Register Queuing Lane & Front Entryway',
        walkingRoute: 'Right next to checkout register 1 and front window display.',
        hidingPattern: 'Rolling wire shopping baskets filled with stray items returned by customers.',
        description: 'Rolling wire carts near the cash registers where stray clearance items are deposited.',
        proTip: 'Check these carts first thing upon entering before employees return them to the stockroom.',
        sampleItems: [
          {
            name: 'Fisher-Price Stack & Roll Chime Cups',
            buy: 0.01,
            resell: 11.0,
            sku: '9182049',
            exactLocation: 'Register Cart #1 (Wire Basket)',
            shelfLevel: 'Customer Returns Cart',
            hidingCues: 'Sitting in bottom of wire buggy. Scans 1¢.',
          },
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'blueprint' | 'hiding-spots' | 'dialogue-scripts' | 'tag-decoder'>('blueprint');

  // Interactive 6-Spot In-Store Radar Checklist
  const [checkedSpots, setCheckedSpots] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('hunter_checked_spots');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {};
  });

  const toggleSpot = (spotId: string) => {
    soundFx.playStandardScan();
    setCheckedSpots((prev) => {
      const next = { ...prev, [spotId]: !prev[spotId] };
      try {
        localStorage.setItem('hunter_checked_spots', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

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

  // Search filter across all stores & zones
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const hits: {
      storeKey: string;
      storeName: string;
      zone: ClearanceZone;
      item: ClearanceZone['sampleItems'][0];
    }[] = [];

    Object.entries(STORE_LAYOUTS).forEach(([storeKey, store]) => {
      store.zones.forEach((zone) => {
        zone.sampleItems.forEach((item) => {
          const matchTitle = item.name.toLowerCase().includes(q);
          const matchSku = item.sku?.toLowerCase().includes(q);
          const matchLocation = item.exactLocation.toLowerCase().includes(q);
          const matchTag = zone.tagType.toLowerCase().includes(q);
          const matchZone = zone.name.toLowerCase().includes(q);

          if (matchTitle || matchSku || matchLocation || matchTag || matchZone) {
            hits.push({
              storeKey,
              storeName: store.storeName,
              zone,
              item,
            });
          }
        });
      });
    });

    return hits;
  }, [searchQuery]);

  const handlePinItemOnMap = (hit: {
    storeKey: string;
    zone: ClearanceZone;
    item: ClearanceZone['sampleItems'][0];
  }) => {
    setSelectedStoreKey(hit.storeKey);
    setSelectedZoneId(hit.zone.id);
    setActiveSubTab('blueprint');
    soundFx.playPennyJackpot();
    onNotify(`Pinned "${hit.item.name}" at ${hit.zone.name} (${hit.item.exactLocation})!`, 'info');
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
        notes: `Found in ${zone.name} (${item.exactLocation}) • Shelf: ${item.shelfLevel}`,
      });
    }
    onNotify(`Bagged "${item.name}"! Added to Sourcing Cart.`, 'success');
  };

  // Checklist Spots definitions
  const IN_STORE_HIDING_SPOTS = [
    {
      id: 'top-stock',
      title: '1. Overhead Top-Stock Riser Bays',
      subtitle: 'Look 10ft+ up for cardboard boxes with black Sharpie SKUs',
      badge: 'High Yield',
      desc: 'Big-box stores (Home Depot, Lowe’s, Walmart) store excess clearance pallets 10–14 feet in the air above active aisles. Employees write SKUs in black Sharpie on cardboard cartons.',
      actionCues: [
        'Look upward at cantilever orange/blue racking above aisles 10–18.',
        'Check for yellow clearance stickers placed on upper box corners.',
        'Use the in-app Associate Script to have an associate pull it down with a rolling safety ladder.',
      ],
    },
    {
      id: 'blind-endcaps',
      title: '2. Rear Blind Endcaps Facing Perimeter Walls',
      subtitle: 'Opposite of the main high-traffic racetracks',
      badge: 'Manager Stash',
      desc: 'Managers instruct associates not to clutter front endcaps with deep clearance. Instead, they turn clearance displays towards rear fire doors, bathrooms, or maintenance corridors.',
      actionCues: [
        'Walk behind the back perimeter aisles and inspect the reverse face of each endcap.',
        'Check outward-facing endcaps in Target (facing the outer walls rather than inner walkways).',
        'Look for unmarked wire racks tucked next to emergency exits.',
      ],
    },
    {
      id: 'false-fronting',
      title: '3. False-Fronted Shelves (Behind Full-Price Stock)',
      subtitle: 'Reach your arm deep into the second and third rows',
      badge: 'Employee Habit',
      desc: 'When stocking new shipments, busy store associates frequently slide new full-price items in front of older, discontinued items rather than pulling the older stock.',
      actionCues: [
        'Push front boxes aside on bottom and top shelf tiers.',
        'Check deep back corners of detergent, hardware, and toy aisles.',
        'Look for older box packaging variations hiding 2 rows back.',
      ],
    },
    {
      id: 'returns-carts',
      title: '4. Customer Service & Pro Desk "Go-Back" Carts',
      subtitle: 'Rolling wire carts staged for restocking or RTV',
      badge: 'Instant Pennies',
      desc: 'When customers return clearance or online orders, items sit in rolling plastic or wire bins near customer service, lumber, or the contractor pro desk awaiting restocking.',
      actionCues: [
        'Glance inside shopping carts parked behind the customer service return counter.',
        'Check the blue wire carts near the lumber pro desk before 10:00 AM.',
        'Scan items in the cart directly with the store mobile app.',
      ],
    },
    {
      id: 'dump-tables',
      title: '5. Mid-Aisle Dump Tables & Island Wire Baskets',
      subtitle: 'Unlabeled open-box returns and discontinued fixtures',
      badge: 'Open Box 80% Off',
      desc: 'Low wooden tables or rolling wire bins set in the middle of aisles (especially lighting, seasonal, and electronics). Often holds pristine returns taped shut.',
      actionCues: [
        'Inspect taped boxes for yellow markdown barcode labels.',
        'Check ceiling fan, smart lighting, and small appliance aisles.',
        'Verify contents match the box label before heading to checkout.',
      ],
    },
    {
      id: 'garden-perimeter',
      title: '6. Outdoor Garden & Seasonal Perimeter Corrals',
      subtitle: 'Palletized stock pushed outside during seasonal transitions',
      badge: 'Volume Liquidation',
      desc: 'During seasonal changes (summer to fall, winter to spring), outdoor power equipment, patio heaters, pool chemicals, and garden tools get rolled outside behind greenhouse fences.',
      actionCues: [
        'Walk the outdoor covered patio and greenhouse perimeter.',
        'Inspect floor-level wooden pallets tucked under metal shelving.',
        'Scan tags with the store app—frequently scans 80% lower than the printed sticker.',
      ],
    },
  ];

  const checkedCount = Object.values(checkedSpots).filter(Boolean).length;

  return (
    <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-3.5 sm:p-5 mb-5 shadow-lg space-y-4">
      {/* Header & Title */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/30">
              <Map className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-[#f5f5f7] tracking-tight">
              In-Store Item Locator & Floor Plan GPS
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#30d158]/15 text-[#30d158] font-bold border border-[#30d158]/30">
              In-Store Navigation Ready
            </span>
          </div>
          <p className="text-xs text-[#92929d] mt-1">
            Locate hidden clearance items in physical stores: exact aisle/bay coordinates, turn-by-turn walking routes, top-stock riser radar, and associate dialogue scripts.
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

      {/* In-Store SKU & Item Quick Search Bar */}
      <div className="relative">
        <div className="flex items-center bg-[#121215] border border-[#2c2c35] focus-within:border-[#0a84ff] rounded-xl px-3 py-2 transition-all">
          <Search className="w-4 h-4 text-[#92929d] mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search item, brand, or SKU in store (e.g. DeWalt, Lego, Ryobi, 100492, .01, Vacuum)..."
            className="bg-transparent text-xs sm:text-sm text-[#f5f5f7] placeholder-[#92929d] w-full focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[#92929d] hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Hits Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#18181c] border border-[#0a84ff]/40 rounded-xl shadow-2xl z-30 p-2 space-y-1.5 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-[#92929d]">
              <span>Found {searchResults.length} in-store targets</span>
              <span className="text-[#ffd60a]">Tap to Pin & View Walking Route</span>
            </div>
            {searchResults.map((hit, i) => (
              <div
                key={i}
                onClick={() => handlePinItemOnMap(hit)}
                className="p-2 bg-[#121215] hover:bg-[#222227] rounded-lg border border-[#2c2c35] flex items-center justify-between gap-2 cursor-pointer transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0a84ff]/20 text-[#0a84ff] font-bold font-mono">
                      {hit.storeName.split(' ')[0]}
                    </span>
                    <span className="text-xs font-bold text-[#f5f5f7] truncate">{hit.item.name}</span>
                  </div>
                  <div className="text-[11px] text-[#ffd60a] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-[#30d158] shrink-0" />
                    <span>{hit.zone.aisleCoords}</span>
                    <span className="text-[#92929d]">• {hit.item.shelfLevel}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-black text-[#30d158]">
                    ${hit.item.buy.toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-[#0a84ff] font-bold">
                    Comp ${hit.item.resell.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#2c2c35] pb-2 overflow-x-auto scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('blueprint')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubTab === 'blueprint'
              ? 'bg-[#0a84ff] text-white shadow-sm font-black'
              : 'text-[#92929d] hover:text-[#f5f5f7] hover:bg-[#222227]'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Interactive Floor Blueprint</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('hiding-spots')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubTab === 'hiding-spots'
              ? 'bg-[#ffd60a] text-black shadow-sm font-black'
              : 'text-[#ffd60a] hover:bg-[#ffd60a]/10'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>6 Secret Hiding Spots Radar</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono font-black">
            {checkedCount}/6
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('dialogue-scripts')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubTab === 'dialogue-scripts'
              ? 'bg-[#30d158] text-black shadow-sm font-black'
              : 'text-[#30d158] hover:bg-[#30d158]/10'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Associate Dialogue Scripts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('tag-decoder')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubTab === 'tag-decoder'
              ? 'bg-[#bf5af2] text-white shadow-sm font-black'
              : 'text-[#bf5af2] hover:bg-[#bf5af2]/10'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Shelf Tag Price Decoder</span>
        </button>
      </div>

      {/* VIEW 1: INTERACTIVE FLOOR PLAN & WALKING ROUTE */}
      {activeSubTab === 'blueprint' && (
        <div className="space-y-4">
          {/* Active Zone Turn-by-Turn Walking Directions Banner */}
          <div className="p-3 bg-gradient-to-r from-[#0a84ff]/15 via-[#18181c] to-[#30d158]/10 rounded-xl border border-[#0a84ff]/30 space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-[#0a84ff] animate-pulse" />
                <span className="text-xs font-black text-[#f5f5f7] uppercase tracking-wider">
                  In-Store Walking Route: {activeStore.storeName}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#ffd60a] bg-[#222227] px-2 py-0.5 rounded-md border border-[#2c2c35]">
                📍 {activeZone.aisleCoords}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2 bg-[#121215]/80 rounded-lg border border-[#2c2c35]/80">
                <span className="text-[10px] font-bold text-[#0a84ff] uppercase tracking-wider block mb-0.5">
                  🚶 Walking Route from Entrance:
                </span>
                <p className="text-[#f5f5f7] leading-relaxed">{activeZone.walkingRoute}</p>
              </div>

              <div className="p-2 bg-[#121215]/80 rounded-lg border border-[#2c2c35]/80">
                <span className="text-[10px] font-bold text-[#ffd60a] uppercase tracking-wider block mb-0.5">
                  🔍 Physical Hiding Pattern:
                </span>
                <p className="text-[#f5f5f7] leading-relaxed">{activeZone.hidingPattern}</p>
              </div>
            </div>
          </div>

          {/* Main Blueprint & Zone Detail Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Schematic Store Blueprint (7 cols) */}
            <div className="lg:col-span-7 bg-[#121215] border border-[#2c2c35] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#92929d] uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#0a84ff]" />
                  Store Schematic Blueprint (Tap any zone to pin)
                </span>
                <span className="text-[10px] text-[#92929d]">Front Entrance at bottom</span>
              </div>

              {/* SVG Map Canvas */}
              <div className="relative w-full aspect-[4/3] bg-[#0c0c0e] border border-[#222227] rounded-lg overflow-hidden select-none">
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2c2c35" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Entrance Door Indicator */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#222227] border border-[#30d158]/50 text-[#30d158] text-[9px] font-mono font-bold rounded uppercase tracking-widest flex items-center gap-1 z-20">
                  <Footprints className="w-2.5 h-2.5 text-[#30d158]" />
                  <span>Main Entrance (Start Here)</span>
                </div>

                {/* Back Wall Marker */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[#92929d]/60 text-[9px] font-mono uppercase tracking-widest z-20">
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
                        {zone.code}
                      </span>

                      <span className="text-[8px] text-[#92929d] mt-0.5 hidden sm:inline truncate max-w-full px-1">
                        📍 {zone.aisleCoords.split('•')[0]}
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

            {/* Zone Detail Inspector Card (5 cols) */}
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

                {/* Hunter Protocol Box */}
                <div className="p-3 bg-[#18181c] border border-[#ffd60a]/30 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-[#ffd60a] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#ffd60a]" /> Hunter Protocol & Tag Intel
                  </span>
                  <p className="text-xs text-[#f5f5f7] leading-relaxed">{activeZone.proTip}</p>
                </div>

                {/* Documented High-Spread Items in this aisle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#30d158] uppercase tracking-wider">
                      Targets in {activeZone.code}
                    </span>
                    <span className="text-[10px] text-[#92929d]">Aisle/Bay Verified</span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {activeZone.sampleItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-[#18181c] border border-[#2c2c35] hover:border-[#30d158]/40 rounded-xl space-y-1.5 text-xs transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#ffd60a]/20 text-[#ffd60a] font-bold font-mono">
                                {item.shelfLevel}
                              </span>
                              {item.sku && (
                                <span className="text-[9px] font-mono text-[#92929d]">
                                  SKU: {item.sku}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-[#f5f5f7] mt-0.5">{item.name}</h4>
                            <span className="text-[10px] text-[#30d158] font-mono block">
                              📍 {item.exactLocation}
                            </span>
                          </div>
                        </div>

                        {item.hidingCues && (
                          <div className="p-1.5 bg-[#121215] rounded-md border border-[#2c2c35] text-[11px] text-[#92929d]">
                            <strong className="text-[#f5f5f7]">Where it hides:</strong> {item.hidingCues}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-[#2c2c35]/60">
                          <div className="flex items-center gap-2 text-[11px] text-[#92929d]">
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
                <span>Tip: Tap item to lock in walking directions</span>
                <span className="text-[#30d158] font-bold">100% Offline Compatible</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: 6 SECRET HIDING SPOTS RADAR CHECKLIST */}
      {activeSubTab === 'hiding-spots' && (
        <div className="space-y-4">
          <div className="p-3 bg-[#121215] rounded-xl border border-[#2c2c35] flex items-center justify-between gap-3 flex-wrap text-xs">
            <div>
              <span className="text-[#f5f5f7] font-black text-sm">
                Physical Retail Clearance Sweep Protocol
              </span>
              <p className="text-[#92929d] mt-0.5">
                Work through these 6 physical spots when walking any store. Check them off as you inspect each zone.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#ffd60a]">
                Sweep Progress: {checkedCount} of 6 Cleared
              </span>
              <div className="w-24 h-2 bg-[#222227] rounded-full overflow-hidden border border-[#2c2c35]">
                <div
                  className="h-full bg-gradient-to-r from-[#ffd60a] to-[#30d158] transition-all"
                  style={{ width: `${(checkedCount / 6) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {IN_STORE_HIDING_SPOTS.map((spot) => {
              const isChecked = !!checkedSpots[spot.id];
              return (
                <div
                  key={spot.id}
                  onClick={() => toggleSpot(spot.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isChecked
                      ? 'bg-[#30d158]/10 border-[#30d158]/50 shadow-sm'
                      : 'bg-[#121215] border-[#2c2c35] hover:border-[#ffd60a]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-[#30d158] shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-[#92929d] shrink-0" />
                      )}
                      <div>
                        <h4
                          className={`font-black text-sm ${
                            isChecked ? 'text-[#30d158] line-through' : 'text-[#f5f5f7]'
                          }`}
                        >
                          {spot.title}
                        </h4>
                        <span className="text-[11px] text-[#ffd60a] block">{spot.subtitle}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222227] text-[#92929d] font-mono border border-[#2c2c35] shrink-0">
                      {spot.badge}
                    </span>
                  </div>

                  <p className="text-xs text-[#92929d] leading-relaxed pl-7">{spot.desc}</p>

                  <div className="pl-7 pt-1 space-y-1">
                    <span className="text-[10px] font-bold text-[#0a84ff] uppercase tracking-wider block">
                      Tactical Action Steps:
                    </span>
                    {spot.actionCues.map((cue, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-[#f5f5f7]">
                        <span className="text-[#30d158] shrink-0 font-bold">•</span>
                        <span>{cue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: ASSOCIATE DIALOGUE SCRIPTS */}
      {activeSubTab === 'dialogue-scripts' && (
        <div className="space-y-3">
          <div className="p-3 bg-[#121215] rounded-xl border border-[#2c2c35] text-xs space-y-1">
            <span className="text-[#f5f5f7] font-black text-sm flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#ff9f0a]" />
              The Golden Rule of In-Store Sourcing: Never Say "Clearance" or "Penny"
            </span>
            <p className="text-[#92929d] leading-relaxed">
              If you tell an associate or cashier "this is a 1¢ penny item" or "this should be 90% off", store policy mandates they confiscate the item and send it to the RTV/salvage compactor. Use these exact battle-tested phrases instead.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Script 1 */}
            <div className="p-3.5 bg-[#121215] border border-[#2c2c35] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#0a84ff] uppercase tracking-wider">
                  Scenario 1: Overhead Top-Stock Ladder Pull
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#0a84ff]/20 text-[#0a84ff] font-bold">
                  Home Depot / Lowe's
                </span>
              </div>
              <p className="text-xs text-[#92929d]">
                You spot a box 12 feet up on an orange pallet rack with SKU #100492 written in Sharpie:
              </p>
              <div className="p-2.5 bg-[#18181c] border-l-4 border-[#0a84ff] rounded-r-lg text-xs text-[#f5f5f7] font-medium leading-relaxed">
                "Hi there! I was looking for SKU #100492 on the shelf below and noticed one stored in the overhead carton on Bay 004. Would you mind pulling that down with the safety ladder so I can purchase it?"
              </div>
              <span className="text-[10px] text-[#30d158] block">
                Why this works: Associates are required to retrieve inventory when given exact bay coordinates and an SKU.
              </span>
            </div>

            {/* Script 2 */}
            <div className="p-3.5 bg-[#121215] border border-[#2c2c35] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#ffd60a] uppercase tracking-wider">
                  Scenario 2: Inventory Shows In-Stock But Shelf is Empty
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#ffd60a]/20 text-[#ffd60a] font-bold">
                  Walmart / Target
                </span>
              </div>
              <p className="text-xs text-[#92929d]">
                The app shows 4 units in stock at this location, but the peg/shelf is vacant:
              </p>
              <div className="p-2.5 bg-[#18181c] border-l-4 border-[#ffd60a] rounded-r-lg text-xs text-[#f5f5f7] font-medium leading-relaxed">
                "Excuse me, could you quickly scan this barcode on your Zebra handheld? My app indicates there are a couple units in the store. Could you see if it's currently binned in the back room or sitting on a restock cart?"
              </div>
              <span className="text-[10px] text-[#30d158] block">
                Why this works: It prompts them to check the "Backroom Location" code (e.g. BR-14-A2) without raising suspicion.
              </span>
            </div>

            {/* Script 3 */}
            <div className="p-3.5 bg-[#121215] border border-[#2c2c35] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#30d158] uppercase tracking-wider">
                  Scenario 3: Self-Checkout 1¢ Penny Drops
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#30d158]/20 text-[#30d158] font-bold">
                  Dollar General / Home Depot
                </span>
              </div>
              <p className="text-xs text-[#92929d]">
                You found an item that has dropped to $0.01 at Dollar General or Home Depot:
              </p>
              <div className="p-2.5 bg-[#18181c] border-l-4 border-[#30d158] rounded-r-lg text-xs text-[#f5f5f7] font-medium leading-relaxed">
                Always take penny items to self-checkout or purchase along with 2-3 standard items (e.g. a soda, candy bar, or pack of batteries). Scan the items, tap card, take receipt, and exit quietly. If a cashier scanner beeps: "I found this on the shelf over there, here's my card."
              </div>
              <span className="text-[10px] text-[#ff9f0a] block">
                Crucial: Never argue if a cashier pulls it. Take your cart and move to the next store.
              </span>
            </div>

            {/* Script 4 */}
            <div className="p-3.5 bg-[#121215] border border-[#2c2c35] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#bf5af2] uppercase tracking-wider">
                  Scenario 4: Damaged Box / Missing Tape 15% Bonus
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#bf5af2]/20 text-[#bf5af2] font-bold">
                  All Big-Box Stores
                </span>
              </div>
              <p className="text-xs text-[#92929d]">
                Clearance box has a tear or opened tape seal, but the contents are 100% complete:
              </p>
              <div className="p-2.5 bg-[#18181c] border-l-4 border-[#bf5af2] rounded-r-lg text-xs text-[#f5f5f7] font-medium leading-relaxed">
                "Hi! I'd like to take this clearance item, but noticed the corner of the box is punctured and the tape was broken. Is the manager able to offer a small courtesy discount so I can take it as-is?"
              </div>
              <span className="text-[10px] text-[#30d158] block">
                Result: Managers routinely authorize an additional 10% to 20% off to remove damaged boxes from inventory.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: SHELF TAG PRICE SECRET DECODER */}
      {activeSubTab === 'tag-decoder' && (
        <div className="space-y-3">
          <div className="p-3 bg-[#121215] rounded-xl border border-[#2c2c35] text-xs">
            <span className="text-[#f5f5f7] font-black text-sm block">
              Store Price Ending Cheat Sheet & Salvage Matrix
            </span>
            <p className="text-[#92929d] mt-0.5">
              Retailers use automated price ending digits to communicate markdown stages to floor associates. Here is how to decode every shelf sticker:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Home Depot Decoder */}
            <div className="p-3 bg-[#121215] border border-[#ff9800]/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-[#ff9800] text-sm">The Home Depot</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ff9800]/20 text-[#ff9800] font-mono font-bold">
                  Yellow Tags
                </span>
              </div>
              <ul className="space-y-1.5 text-[#f5f5f7]">
                <li className="p-1.5 bg-[#18181c] rounded-lg border border-[#2c2c35]">
                  <strong className="text-[#ffd60a] font-mono">Ends in .06:</strong> First markdown tier (approx 50% off). Has 6 weeks before next drop.
                </li>
                <li className="p-1.5 bg-[#18181c] rounded-lg border border-[#2c2c35]">
                  <strong className="text-[#ff9f0a] font-mono">Ends in .03:</strong> Final clearance tier (approx 75% off). Has 3 weeks before salvage destruction.
                </li>
                <li className="p-1.5 bg-[#18181c] rounded-lg border border-[#30d158]/40">
                  <strong className="text-[#30d158] font-mono">Ends in .01:</strong> 1¢ Penny Drop! Item was deleted from inventory. Rings up $0.01 at self-checkout.
                </li>
              </ul>
            </div>

            {/* Target Decoder */}
            <div className="p-3 bg-[#121215] border border-[#ff3b30]/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-[#ff3b30] text-sm">Target</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ff3b30]/20 text-[#ff3b30] font-mono font-bold">
                  Red & Yellow Stickers
                </span>
              </div>
              <ul className="space-y-1.5 text-[#f5f5f7]">
                <li className="p-1.5 bg-[#18181c] rounded-lg border border-[#2c2c35]">
                  <strong className="text-[#0a84ff] font-mono">Upper Right Number:</strong> Look at tiny circle in top right (15, 30, 50, 70). Indicates percentage off!
                </li>
                <li className="p-1.5 bg-[#18181c] rounded-lg border border-[#2c2c35]">
                  <strong className="text-[#ffd60a] font-mono">Ends in .98:</strong> Standard markdown phase. Will cycle every 2 weeks on Thursday.
                </li>
                <li className="p-1.5 bg-[#18181c] rounded-lg border border-[#30d158]/40">
                  <strong className="text-[#30d158] font-mono">Ends in .04:</strong> FINAL SALVAGE! Don't wait—item will be sent to Goodwill liquidation next cycle.
                </li>
              </ul>
            </div>

            {/* Lowe's Decoder */}
            <div className="p-3 bg-[#121215] border border-[#0a84ff]/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-[#0a84ff] text-sm">Lowe's</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0a84ff]/20 text-[#0a84ff] font-mono font-bold">
                  Yellow Clearance Tags
                </span>
              </div>
              <ul className="space-y-1.5 text-[#f5f5f7]">
                <li className="p-1.5 bg-[#18181c] rounded-lg border border-[#2c2c35]">
                  <strong className="text-[#ffd60a] font-mono">Ends in .02:</strong> Return to Vendor (RTV) status. Eligible for immediate manager closeout negotiation.
                </li>
                <li className="p-1.5 bg-[#18181c] rounded-lg border border-[#2c2c35]">
                  <strong className="text-[#30d158] font-mono">Ends in .03:</strong> Rock bottom final price reduction. Lowest price Lowe’s system will execute.
                </li>
                <li className="p-1.5 bg-[#18181c] rounded-lg border border-[#2c2c35]">
                  <strong className="text-[#92929d] font-mono">Ends in .00:</strong> Store manager special markdown for that specific building only.
                </li>
              </ul>
            </div>

            {/* Walmart Decoder */}
            <div className="p-3 bg-[#121215] border border-[#ffd60a]/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-[#ffd60a] text-sm">Walmart</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ffd60a]/20 text-[#ffd60a] font-mono font-bold">
                  Yellow Label vs App Scan
                </span>
              </div>
              <ul className="space-y-1.5 text-[#f5f5f7]">
                <li className="p-1.5 bg-[#18181c] rounded-lg border border-[#2c2c35]">
                  <strong className="text-[#ffd60a] font-mono">Yellow "WAS / NOW":</strong> Standard clearance. 80% of items drop further in system before new stickers are printed!
                </li>
                <li className="p-1.5 bg-[#18181c] rounded-lg border border-[#30d158]/40">
                  <strong className="text-[#30d158] font-mono">Hidden Scan Price:</strong> Always scan with Walmart camera! A $49 yellow tag often scans $11 at register.
                </li>
                <li className="p-1.5 bg-[#18181c] rounded-lg border border-[#2c2c35]">
                  <strong className="text-[#0a84ff] font-mono">Price Ending .00:</strong> Final manager clearance markdown.
                </li>
              </ul>
            </div>

            {/* Dollar General Decoder */}
            <div className="p-3 bg-[#121215] border border-[#ffd60a]/40 rounded-xl space-y-2 md:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-[#ffd60a] text-sm">Dollar General</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ffd60a]/20 text-[#ffd60a] font-mono font-bold">
                  Color Symbols & Tuesday Drops
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#f5f5f7]">
                <div className="p-2 bg-[#18181c] rounded-lg border border-[#2c2c35]">
                  <strong className="text-[#30d158] font-mono block">Tuesday 7:00 AM Penny Drops:</strong>
                  <span>Every Tuesday morning, thousands of seasonal and discontinued SKUs drop to exactly $0.01 at register.</span>
                </div>
                <div className="p-2 bg-[#18181c] rounded-lg border border-[#2c2c35]">
                  <strong className="text-[#ffd60a] font-mono block">Color Dot Symbols:</strong>
                  <span>Look on corner of price tags for symbols: Yellow Dot, Blue Star, Brown Dot, Pink Square. Represents markdown cycle.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
