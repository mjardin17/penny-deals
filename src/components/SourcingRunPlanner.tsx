import React, { useState, useMemo } from 'react';
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
  Paintbrush,
  Palette,
  Search,
  Crosshair,
  Timer,
  Check,
  Copy,
  Flame,
  ShieldAlert,
  Wrench,
  Tag,
  Info,
  SlidersHorizontal,
  ArrowRight,
  Filter,
  Truck,
  Zap,
} from 'lucide-react';
import { soundFx } from '../utils/audioFeedback';

export interface RouteStop {
  id: string;
  storeName: string;
  chain: 'Dollar General' | "Lowe's" | 'Target' | 'The Home Depot' | 'Walmart' | 'Sherwin-Williams';
  branchName: string;
  address: string;
  distanceMiles: number;
  estDriveMins: number;
  bestDay: string;
  isTodayPeakDay: boolean;
  timeWindow: string;
  clearanceStrategy: string;
  paintScopingTips?: string;
  pokemonDeliveryIntel?: {
    vendor: string;
    deliveryDays: string[];
    window: string;
    probabilityScore: number;
    probabilityLabel: string;
    stashSpot: string;
    hunterTip: string;
  };
  aislesToCheck: string[];
  sampleTargets: {
    name: string;
    buy: number;
    resell: number;
    category: string;
    isPaint?: boolean;
    isPenny?: boolean;
    location: string;
    tagCode?: string;
  }[];
  potentialProfit: number;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
}

interface SourcingRunPlannerProps {
  zipCode: string;
  onUpdateZip?: (newZip: string) => void;
  onAddToCart?: (deal: any) => void;
  onLoadIntoCalculator?: (deal: any) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

// Popular geographic hubs for instant scoping
const POPULAR_HUBS = [
  { name: 'Atlanta, GA', zip: '30301' },
  { name: 'Dallas, TX', zip: '75201' },
  { name: 'Chicago, IL', zip: '60601' },
  { name: 'Los Angeles, CA', zip: '90012' },
  { name: 'Miami, FL', zip: '33101' },
  { name: 'Columbus, OH', zip: '43215' },
  { name: 'Phoenix, AZ', zip: '85001' },
];

// Days of the week data
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

// Penny & Clearance Drop Schedule by Day
const PENNY_DROP_SCHEDULE: Record<
  string,
  {
    primaryFocus: string;
    highlight: string;
    dropHour: string;
    store: string;
    badgeColor: string;
    policySop: string;
    tactics: string[];
  }
> = {
  Monday: {
    primaryFocus: 'Home Depot 1¢ Drops & Target Electronics',
    highlight: 'Home Depot Yellow Tag .01 RTV Drops + Target Kids & Electronics',
    dropHour: '6:00 AM - 9:00 AM',
    store: 'The Home Depot & Target',
    badgeColor: '#f96302',
    policySop: 'Home Depot systems flag 3rd-markdown items down to $0.01 overnight Sunday. Items ring up at 1¢ at self-checkout before associates finish RTV carting.',
    tactics: [
      'Hit Home Depot right at 6:00 AM opening for unpulled .01 yellow tags.',
      'Check top risers above aisles 11-16 (tools & hardware).',
      'Target sweeps electronics & children clothing clearance to 50%-70% off.',
    ],
  },
  Tuesday: {
    primaryFocus: '🔥 DOLLAR GENERAL 1¢ PENNY DAY (The Master Drop)',
    highlight: 'Dollar General System-Wide 1¢ Penny Drops (Nationwide)',
    dropHour: '7:00 AM - 9:30 AM (Store open at 8:00 AM)',
    store: 'Dollar General',
    badgeColor: '#ffd60a',
    policySop: 'Dollar General SOP 14 / Cashier Standard: If an item rings up $0.01 at register, employees are required to sell it to the customer. They cannot refuse the sale, but they must pull remaining inventory afterward.',
    tactics: [
      'Line up at Dollar General doors before 8:00 AM opening.',
      'Look for the week’s discontinued symbols (Brown Dot, Yellow Star, Purple Dot).',
      'Check sky-shelves, back corner seasonal racks, and bottom register carts.',
      'Scan items with DG mobile app in-store to verify 1¢ ring-up before checkout.',
    ],
  },
  Wednesday: {
    primaryFocus: "Lowe's Yellow Tag .02/.03 Price Drops & Paint Purge",
    highlight: "Lowe's Final Liquidation (.02 & .03) & Home Depot Phase 2",
    dropHour: '7:00 AM - 11:00 AM',
    store: "Lowe's Home Improvement",
    badgeColor: '#004990',
    policySop: "Lowe's price change labels generate Tuesday evening and are applied Wednesday morning. Tags ending in .02 (Phase 2) and .03 (Final Rock Bottom) represent 70-90% margin cuts.",
    tactics: [
      "Inspect Lowe's tool department endcaps for fresh yellow stickers ending in .02 or .03.",
      'Check paint department Oops rack for contractor returns from Tuesday projects.',
      'Target begins markdowns on Men’s Apparel, Health & Beauty, and Lawn/Garden.',
    ],
  },
  Thursday: {
    primaryFocus: 'Target TOYS, BABY & SPORTING GOODS (Huge Toy Clearance)',
    highlight: 'Target Major Toy Drops (Up to 70% Off) + Baby Department',
    dropHour: '8:00 AM - 12:00 PM',
    store: 'Target',
    badgeColor: '#ff3b30',
    policySop: 'Target corporate markdown calendar reserves Thursday mornings for Toys, Sporting Goods, Luggage, and Housewares. Stickers ending in .04 or .98 are final markdowns before salvage.',
    tactics: [
      'Walk the backside of Toy aisles (look for consolidation endcap towers marked Clearance).',
      'Scan LEGO, Action Figures, Board Games, and Strollers with the Target app.',
      'Items with red stickers ending in .04 are at rock bottom and will not drop lower.',
    ],
  },
  Friday: {
    primaryFocus: 'Target Hardware/Auto + Harbor Freight Open-Box Staging',
    highlight: 'Target Auto & Hardware Cuts + Weekend Clearance Consolidation',
    dropHour: '8:00 AM - 1:00 PM',
    store: 'Target & Harbor Freight',
    badgeColor: '#e02424',
    policySop: 'Friday is Target’s official Auto, Hardware, Jewelry & Cosmetics markdown day. Stores consolidate weekly leftovers onto back perimeter endcaps.',
    tactics: [
      'Check Target hardware endcaps for power tool accessories, car wash kits, and motor oil.',
      'Visit Harbor Freight for orange tag open-box return tables staged for the weekend.',
      'Lowe’s & Home Depot restock paint mistint racks ahead of Saturday DIY painters.',
    ],
  },
  Saturday: {
    primaryFocus: 'Morning Oops Paint Carts & Flea Market Flipping',
    highlight: 'Early Morning Paint Mistint Restocks (7:00 AM - 9:00 AM)',
    dropHour: '7:00 AM - 9:00 AM',
    store: 'The Home Depot, Lowe’s & Sherwin-Williams',
    badgeColor: '#30d158',
    policySop: 'Home Depot & Lowe’s paint desks receive early morning returns from residential painters. Carts are cleared of mistints by 9:00 AM.',
    tactics: [
      'Arrive at Home Depot paint counter by 7:00 AM sharp to scoop $9 gallon mistints.',
      'Look for neutral whites, greiges, and exterior deck stains for 200%+ flip profit.',
      'Sweep Dollar General for any lingering Tuesday penny items left on high shelves.',
    ],
  },
  Sunday: {
    primaryFocus: 'Weekly Ad Roll Over & Clearance Re-Tagging Sweep',
    highlight: 'Sunday Ad Resets & Final Salvage Clearance Searches',
    dropHour: '9:00 AM - 2:00 PM',
    store: 'Walmart & Target',
    badgeColor: '#bf5af2',
    policySop: 'Stores prepare weekly promotional endcaps, moving unsold stock to clearance dump tables and rear perimeter aisles.',
    tactics: [
      'Walk Walmart Garden Center pavilions for season-transition equipment.',
      'Check Target front dollar-spot / Bullseye Playground for clearance markdowns.',
      'Map your Tuesday Dollar General game plan using early leaked penny lists.',
    ],
  },
};

// Curated Paint Deals Database for the Scoper
const CURATED_PAINT_DEALS = [
  {
    id: 'paint-1',
    title: 'Behr Marquee Exterior Flat Enamel (Mistint - Greige / Warm Stone)',
    store: 'The Home Depot',
    location: 'Paint Counter Oops Cart (Beside Shaker #2)',
    buy: 9.0,
    resell: 42.0,
    colorGrade: 'Grade A (Neutral)',
    flipSpeed: '< 24 Hours on FB Marketplace',
    notes: 'Normally $68.98/gal. Tint error was 2 drops too dark. Perfect neutral for exterior trim or shed.',
    volume: '1 Gallon',
  },
  {
    id: 'paint-2',
    title: 'Sherwin-Williams HGTV Showcase Interior Satin (Mistint - Pure Chantilly White)',
    store: "Lowe's Home Improvement",
    location: "Aisle 3 Paint Desk Endcap (Yellow Tag Mistint)",
    buy: 9.0,
    resell: 45.0,
    colorGrade: 'Grade A (Pure White)',
    flipSpeed: 'Instant (Highest Demand)',
    notes: 'Normally $59.98/gal. High-hide interior white. Contractors buy these in bulk.',
    volume: '1 Gallon',
  },
  {
    id: 'paint-3',
    title: 'Behr Dynasty Interior Eggshell (Mistint - Charcoal Slate Accent)',
    store: 'The Home Depot',
    location: 'Paint Desk Rolling Wire Rack',
    buy: 9.0,
    resell: 38.0,
    colorGrade: 'Grade A (Modern Charcoal)',
    flipSpeed: '< 48 Hours',
    notes: 'Normally $74.98/gal. Ultra-durable scuff defense. High-end modern accent wall color.',
    volume: '1 Gallon',
  },
  {
    id: 'paint-4',
    title: 'Behr Premium Plus Interior Sample Quarts (Assorted Neutrals)',
    store: 'The Home Depot',
    location: 'Front Counter Metal Tray by Register',
    buy: 1.0,
    resell: 8.5,
    colorGrade: 'Grade A (Sampler)',
    flipSpeed: 'Fast (Furniture Flippers)',
    notes: 'Normally $7.48 each. Dribble tested once, labeled with hand-written $1.00 sticker.',
    volume: '1 Quart',
  },
  {
    id: 'paint-5',
    title: 'Rust-Oleum Painter’s Touch 2X Ultra Cover Spray Paint (Discontinued Lot)',
    store: 'The Home Depot',
    location: 'Aisle 10 Spray Paint Clearance Bin',
    buy: 1.5,
    resell: 6.98,
    colorGrade: 'Grade B (Hardware/Craft)',
    flipSpeed: 'Fast Lot Resell',
    notes: 'Discontinued SKU clearance. Clean cans, full pressure, rings up $1.50 at self-checkout.',
    volume: '12 oz Can',
  },
  {
    id: 'paint-6',
    title: 'Minwax Fast-Drying Polyurethane & Wood Finish Stain Return',
    store: "Lowe's Home Improvement",
    location: 'Stain Aisle Bottom Shelf Wire Basket',
    buy: 3.5,
    resell: 16.0,
    colorGrade: 'Grade B (Dark Walnut)',
    flipSpeed: '< 3 Days',
    notes: 'Customer returned un-opened stain. Yellow sticker marked down from $14.98.',
    volume: '1 Quart',
  },
  {
    id: 'paint-7',
    title: 'Zinsser Bulls Eye 1-2-3 Water-Base Primer (Dented Metal Can)',
    store: 'The Home Depot',
    location: 'Clearance Dump Table near Lumber Roll-up',
    buy: 7.0,
    resell: 26.0,
    colorGrade: 'Grade A (Primer)',
    flipSpeed: '< 24 Hours',
    notes: 'Can is slightly dented during forklift unloading. Seal 100% intact. High contractor demand.',
    volume: '1 Gallon',
  },
  {
    id: 'paint-8',
    title: 'Valspar Defense Exterior Semi-Gloss (Mistint - Sage Forest Green)',
    store: "Lowe's Home Improvement",
    location: 'Valspar Tint Counter Bottom Rack',
    buy: 8.0,
    resell: 36.0,
    colorGrade: 'Grade B (Exterior Trim)',
    flipSpeed: '1-3 Days',
    notes: 'Normally $54.98/gal. Popular for front doors, shutters, and outdoor furniture flips.',
    volume: '1 Gallon',
  },
];

export const SourcingRunPlanner: React.FC<SourcingRunPlannerProps> = ({
  zipCode,
  onUpdateZip,
  onAddToCart,
  onLoadIntoCalculator,
  onNotify,
}) => {
  // Current real-world day & hour
  const realTodayDayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  const realCurrentHour = new Date().getHours();

  // Location and Game Plan State
  const [userLocationInput, setUserLocationInput] = useState(zipCode);
  const [selectedRadius, setSelectedRadius] = useState<number>(10);
  const [selectedDay, setSelectedDay] = useState<string>(realTodayDayName);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<'early' | 'midday' | 'evening'>('early');
  const [dealTypeFilter, setDealTypeFilter] = useState<'all' | 'paint' | 'penny' | 'tools' | 'salvage'>('all');
  const [activeTab, setActiveTab] = useState<'itinerary' | 'paint-scoper' | 'penny-clock' | 'tactics'>('itinerary');

  // Dynamic Stop Generation based on Location, Day & Radius
  const generateDynamicStops = useMemo(() => {
    const isTuesday = selectedDay === 'Tuesday';
    const isWednesday = selectedDay === 'Wednesday';
    const isThursday = selectedDay === 'Thursday';
    const isMonday = selectedDay === 'Monday';

    // Base sequence optimized chronologically
    const baseStops: RouteStop[] = [
      {
        id: 'stop-dg',
        storeName: 'Dollar General',
        chain: 'Dollar General',
        branchName: `Dollar General #${Math.floor(1000 + Math.random() * 9000)}`,
        address: `104 County Rd, Near ${userLocationInput}`,
        distanceMiles: Number((1.2 * (selectedRadius / 10)).toFixed(1)),
        estDriveMins: 4,
        bestDay: 'Tuesday',
        isTodayPeakDay: isTuesday,
        timeWindow: '8:00 AM - 8:45 AM (First Strike)',
        clearanceStrategy: isTuesday
          ? '🔥 NATIONWIDE PENNY DROP ACTIVE: Arrive at 8:00 AM sharp before associates pull $0.01 items. Look for Brown Dot & Yellow Star tags.'
          : 'Scout high sky-shelves and register dump bins for lingering penny items from Tuesday.',
        paintScopingTips: 'Check automotive and home aisle for $0.50-$1.00 touch-up spray paint clearance.',
        pokemonDeliveryIntel: {
          vendor: 'MJ Holding / Dry Freight',
          deliveryDays: ['Tuesday', 'Thursday'],
          window: '8:00 AM - 10:30 AM',
          probabilityScore: isTuesday ? 92 : 65,
          probabilityLabel: isTuesday ? 'Very High (Tuesday Freight)' : 'Moderate',
          stashSpot: 'Front register hanging metal clip-strips ($1.25 packs) & Toy Aisle Peg Hook #4',
          hunterTip: 'Check every register lane hanging clip-strip before checking out penny items.',
        },
        aislesToCheck: [
          'Seasonal Clearance Back Wall',
          'Sky-Shelves above paper towels',
          'Toy Aisle Top Shelf Overflow',
          'Wire baskets parked near registers',
        ],
        sampleTargets: [
          {
            name: 'Seasonal Home Decor Ceramic Lantern (1¢ Penny Ring)',
            buy: 0.01,
            resell: 18.5,
            category: 'Dollar General Penny',
            isPenny: true,
            location: 'Seasonal Clearance Wall',
            tagCode: 'Brown Dot / 1¢',
          },
          {
            name: 'Comfort Plush Throw Blanket 50x60 (1¢ Penny Ring)',
            buy: 0.01,
            resell: 16.0,
            category: 'Dollar General Penny',
            isPenny: true,
            location: 'Apparel Clearance Rack',
            tagCode: 'Yellow Dot / 1¢',
          },
          {
            name: 'ArmorAll Multi-Purpose Cleaning Wipes Tub',
            buy: 0.01,
            resell: 8.0,
            category: 'Dollar General Penny',
            isPenny: true,
            location: 'Automotive Endcap',
            tagCode: 'Blue Dot / 1¢',
          },
        ],
        potentialProfit: 42.48,
        status: 'pending',
      },
      {
        id: 'stop-hd',
        storeName: 'The Home Depot',
        chain: 'The Home Depot',
        branchName: `The Home Depot #${Math.floor(2000 + Math.random() * 4000)}`,
        address: `520 Commerce Blvd, Near ${userLocationInput}`,
        distanceMiles: Number((3.1 * (selectedRadius / 10)).toFixed(1)),
        estDriveMins: 8,
        bestDay: 'Monday',
        isTodayPeakDay: isMonday,
        timeWindow: '8:55 AM - 9:45 AM (Paint & Riser Sweep)',
        clearanceStrategy:
          'Scout the Paint Desk "Oops Paint" cart for $9.00 gallons, then sweep overhead cantilever racking for yellow tag .01 and .03 markdown boxes.',
        paintScopingTips:
          '📍 Paint Cart is immediately beside the Behr tint shaker machine. Look for neon orange "Oops" stickers with hand-written $9.00 / $2.00 prices. Whites and grays resell within 24 hours on Facebook Marketplace for $35-$45.',
        aislesToCheck: [
          'Aisle 10: Paint Counter Oops Mistint Cart',
          'Aisles 11-16: Power Tool Cantilever Overhead Risers',
          'The Closet (Clearance Security Cage near Pro Desk)',
          'Outside Garden Center rear clearance patio',
        ],
        sampleTargets: [
          {
            name: 'Behr Marquee Exterior Flat Enamel (Mistint - Greige / Stone)',
            buy: 9.0,
            resell: 42.0,
            category: 'Oops Paint Deal',
            isPaint: true,
            location: 'Paint Desk Oops Cart',
            tagCode: 'Oops $9 Sticker',
          },
          {
            name: 'Ryobi ONE+ 18V 6-Tool Brushless Combo Kit (.01 Penny Ring)',
            buy: 0.01,
            resell: 199.0,
            category: 'Hardware Clearance',
            isPenny: true,
            location: 'Aisle 12 Bay 004 Overhead Riser',
            tagCode: 'Yellow Tag .01 RTV',
          },
          {
            name: 'Rust-Oleum 2X Ultra Cover Spray Paint Discontinued Lot',
            buy: 1.5,
            resell: 6.98,
            category: 'Paint Clearance',
            isPaint: true,
            location: 'Spray Paint Clearance Bin',
            tagCode: 'Clearance Tag',
          },
        ],
        potentialProfit: 278.47,
        status: 'pending',
      },
      {
        id: 'stop-lowes',
        storeName: "Lowe's Home Improvement",
        chain: "Lowe's",
        branchName: `Lowe's #${Math.floor(1000 + Math.random() * 9000)}`,
        address: `450 Commercial Way, Near ${userLocationInput}`,
        distanceMiles: Number((4.6 * (selectedRadius / 10)).toFixed(1)),
        estDriveMins: 11,
        bestDay: 'Wednesday',
        isTodayPeakDay: isWednesday,
        timeWindow: '9:55 AM - 10:45 AM (Yellow Tag & Mistints)',
        clearanceStrategy:
          'Yellow tag markdowns ending in .02 (Phase 2) or .03 (Final Rock Bottom). Check Valspar paint desk for $5-$9 mistint returns and stain returns.',
        paintScopingTips:
          '📍 Lowe’s mistints sit on an endcap near the Valspar tint desk. Marked with yellow "AS-IS / MISTINT" labels. High volume of exterior stains in Spring/Summer and interior whites year-round.',
        aislesToCheck: [
          'Aisle 3/4: Valspar Paint Desk Mistint Endcap',
          'Power Tool clearance cage by contractor lumber exit',
          'Lighting department bottom shelf cubbies',
          'Hardware department rear blind endcaps',
        ],
        sampleTargets: [
          {
            name: 'Sherwin-Williams HGTV Infinity Satin (Mistint - Pure White)',
            buy: 9.0,
            resell: 45.0,
            category: 'Oops Paint Deal',
            isPaint: true,
            location: 'Aisle 3 Paint Endcap',
            tagCode: 'Yellow As-Is $9',
          },
          {
            name: 'DeWalt 20V MAX XR Brushless 2-Tool Combo (.02 Final Cut)',
            buy: 89.02,
            resell: 299.0,
            category: 'Power Tools',
            location: 'Aisle 14 Bay 002',
            tagCode: 'Yellow Tag .02',
          },
          {
            name: 'Minwax Fast-Drying Polyurethane Wood Stain (Special Walnut)',
            buy: 3.5,
            resell: 16.0,
            category: 'Paint & Stain',
            isPaint: true,
            location: 'Stain Aisle Bottom Rack',
            tagCode: 'Clearance Tag',
          },
        ],
        potentialProfit: 258.48,
        status: 'pending',
      },
      {
        id: 'stop-target',
        storeName: 'Target',
        chain: 'Target',
        branchName: `Target Store #${Math.floor(100 + Math.random() * 900)}`,
        address: `800 Target Blvd, Near ${userLocationInput}`,
        distanceMiles: Number((6.2 * (selectedRadius / 10)).toFixed(1)),
        estDriveMins: 14,
        bestDay: 'Thursday',
        isTodayPeakDay: isThursday,
        timeWindow: '11:00 AM - 11:45 AM (Salvage & Toy Consolidation)',
        clearanceStrategy: isThursday
          ? '🔥 THURSDAY TOY & BABY DAY: Walk the rear of Toy aisles G12-G15 for red stickers ending in .04 (salvage) or .98 (70% cut).'
          : 'Check perimeter endcaps facing outer walls for 70% yellow salvage stickers.',
        paintScopingTips: 'Check craft aisle for FolkArt / Apple Barrel 50¢ acrylic clearance bundles.',
        pokemonDeliveryIntel: {
          vendor: 'Excell Marketing',
          deliveryDays: ['Tuesday', 'Thursday', 'Friday'],
          window: '8:00 AM - 11:00 AM (Morning Opening Wave)',
          probabilityScore: isThursday || selectedDay === 'Friday' ? 94 : 72,
          probabilityLabel: isThursday || selectedDay === 'Friday' ? 'Very High' : 'Moderate',
          stashSpot: 'Held behind Guest Services Counter (anti-theft) & Front Register Lane 1 Endcap',
          hunterTip: 'Ask politely at Guest Services desk; strict 2 or 3 item limit enforced per guest.',
        },
        aislesToCheck: [
          'Toy Clearance Consolidation Towers (Aisles G12-G15)',
          'Endcaps facing outer perimeter walls (Blind Endcaps)',
          'Electronics back wall clearance shelf',
          'Home decor top shelf unmarked returns',
        ],
        sampleTargets: [
          {
            name: 'LEGO Star Wars Ghost & Phantom II (.04 Final Salvage)',
            buy: 47.98,
            resell: 179.99,
            category: 'Toys & Collectibles',
            location: 'Toy Consolidation Aisle E14',
            tagCode: 'Red Tag .04 Salvage',
          },
          {
            name: 'Dyson V8 Cordless Vacuum Slim (.04 Salvage Markdown)',
            buy: 125.04,
            resell: 389.0,
            category: 'Home Appliances',
            location: 'Aisle D08 Endcap',
            tagCode: 'Red Tag .04',
          },
        ],
        potentialProfit: 355.97,
        status: 'pending',
      },
      {
        id: 'stop-walmart',
        storeName: 'Walmart Supercenter',
        chain: 'Walmart',
        branchName: `Walmart Supercenter #${Math.floor(1500 + Math.random() * 3000)}`,
        address: `1200 Grand Army Hwy, Near ${userLocationInput}`,
        distanceMiles: Number((7.8 * (selectedRadius / 10)).toFixed(1)),
        estDriveMins: 16,
        bestDay: 'Friday',
        isTodayPeakDay: selectedDay === 'Friday',
        timeWindow: '12:00 PM - 12:45 PM (Hidden Rollback Raid)',
        clearanceStrategy:
          'Scan top-stock boxes with the Walmart app. Shelf stickers frequently display $19.98 while register scanner rings up $1.00-$3.00.',
        paintScopingTips: 'Automotive and hardware paint clearance bin: ColorPlace pints ($1) and Rust-Oleum multi-packs.',
        pokemonDeliveryIntel: {
          vendor: 'MJ Holding Company',
          deliveryDays: ['Thursday', 'Friday'],
          window: '9:30 AM - 1:30 PM (Floor Cart ~10:15 AM)',
          probabilityScore: selectedDay === 'Friday' ? 96 : selectedDay === 'Thursday' ? 88 : 45,
          probabilityLabel: selectedDay === 'Friday' ? 'Very High (Peak Friday Drop)' : selectedDay === 'Thursday' ? 'High' : 'Moderate',
          stashSpot: 'Front Register Lanes 3 & 4 Card Wall & Customer Service desk drawer',
          hunterTip: 'Look for rolling carts with brown boxes sealed with red "MJ HOLDING" tape.',
        },
        aislesToCheck: [
          'Lawn & Garden Seasonal Outdoor Pavilion',
          'Toy Department middle aisle clearance racks',
          'Automotive & Hardware paint clearance shelf',
          'Top stock overhead risers across active aisles',
        ],
        sampleTargets: [
          {
            name: 'Coleman 10x10 Instant Canopy Shelter (Hidden Clearance)',
            buy: 29.0,
            resell: 119.0,
            category: 'Seasonal Clearance',
            location: 'Garden Pavilion Bay 4',
            tagCode: 'Hidden Rollback',
          },
          {
            name: 'ColorPlace Ready-to-Use Interior Paint (White Gallon)',
            buy: 5.0,
            resell: 22.0,
            category: 'Paint Clearance',
            isPaint: true,
            location: 'Hardware Paint Clearance Rack',
            tagCode: 'Yellow Rollback',
          },
        ],
        potentialProfit: 107.0,
        status: 'pending',
      },
    ];

    return baseStops;
  }, [userLocationInput, selectedRadius, selectedDay]);

  const [stops, setStops] = useState<RouteStop[]>(generateDynamicStops);
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);
  const [baggedItems, setBaggedItems] = useState<number>(0);

  // Sync stops when generateDynamicStops updates
  React.useEffect(() => {
    setStops(generateDynamicStops);
  }, [generateDynamicStops]);

  // Aggregate Circuit Metrics
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

  const handleBagTarget = (stop: RouteStop, target: RouteStop['sampleTargets'][0]) => {
    soundFx.playPennyJackpot();
    setBaggedItems((prev) => prev + 1);

    if (onAddToCart) {
      onAddToCart({
        title: target.name,
        buyPrice: target.buy,
        sellPrice: target.resell,
        store: stop.storeName,
        category: target.category,
        notes: `Sourced in Game Plan at ${stop.branchName} (${target.location}) • Tag: ${target.tagCode || 'Clearance'}`,
      });
    }

    onNotify(`Bagged "${target.name}"! Added to Sourcing Cart.`, 'success');
  };

  const handleBagPaintDeal = (deal: typeof CURATED_PAINT_DEALS[0]) => {
    soundFx.playCashRegister();
    setBaggedItems((prev) => prev + 1);

    if (onAddToCart) {
      onAddToCart({
        title: deal.title,
        buyPrice: deal.buy,
        sellPrice: deal.resell,
        store: deal.store,
        category: 'Oops Paint Clearance',
        notes: `Oops Paint Find: ${deal.volume} • ${deal.location} • Color: ${deal.colorGrade} • ${deal.notes}`,
      });
    }

    onNotify(`Bagged Paint Deal: "${deal.title}" ($${deal.buy} -> $${deal.resell})!`, 'success');
  };

  const handleExportItinerary = () => {
    const lines = [
      `========================================================================`,
      `RETAIL ARBITRAGE IN-STORE GAME PLAN & RUN SHEET`,
      `Target Location: ${userLocationInput} | Scheduled Day: ${selectedDay} | Radius: ${selectedRadius} miles`,
      `Estimated Sourcing Circuit Profit: $${totalPotentialProfit.toFixed(2)} | Total Distance: ${totalMiles.toFixed(1)} miles (~${totalDriveMins} mins driving)`,
      `Generated: ${new Date().toLocaleString()}`,
      `========================================================================`,
      '',
      `--- TODAY'S PENNY DROP RADAR (${selectedDay}) ---`,
      `Primary Drop: ${PENNY_DROP_SCHEDULE[selectedDay]?.highlight || 'Standard Cycle'}`,
      `Peak Strike Window: ${PENNY_DROP_SCHEDULE[selectedDay]?.dropHour || '8:00 AM - 11:00 AM'}`,
      `Policy Rule: ${PENNY_DROP_SCHEDULE[selectedDay]?.policySop || ''}`,
      '',
      `--- EXTREME CHEAP & OOPS PAINT SCOPING DIRECTIVE ---`,
      `- The Home Depot: Go straight to Behr Paint Counter. Look for rolling steel rack beside shaker #2. Buy $9.00 gallons (Whites, Greys, Greige) & $1.00 sample quarts.`,
      `- Lowe's: Aisle 3 Valspar Tint Desk endcap marked "AS-IS / MISTINT" for $5-$9.00 Valspar / Sherwin-Williams cans.`,
      `- Resale Velocity: List on Facebook Marketplace / Craigslist for $35-$45/gal. Flips in under 24 hours.`,
      '',
      `--- TIMED STORE ITINERARY & STOPS SEQUENCE ---`,
      ...stops.map((s, idx) => {
        return [
          `[STOP #${idx + 1}] ${s.storeName} (${s.branchName})`,
          `Arrival Window: ${s.timeWindow}`,
          `Address: ${s.address}`,
          `Drive Time: ~${s.estDriveMins} mins (${s.distanceMiles} miles)`,
          `Clearance Strategy: ${s.clearanceStrategy}`,
          `Paint Directives: ${s.paintScopingTips || 'Standard paint clearance aisle'}`,
          `Priority Aisles to Walk:\n${s.aislesToCheck.map((a) => `  * ${a}`).join('\n')}`,
          `High-Spread Targets:\n${s.sampleTargets.map((t) => `  - ${t.name} (Buy: $${t.buy.toFixed(2)} -> Resell: $${t.resell.toFixed(2)}) @ ${t.location}`).join('\n')}`,
          `------------------------------------------------------------------------`,
        ].join('\n');
      }),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sourcing_GamePlan_${userLocationInput.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedDay}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify('Game Plan run sheet exported to text file!', 'success');
  };

  const handleCopyChecklist = async () => {
    const text = stops
      .map(
        (s, i) =>
          `Stop #${i + 1}: ${s.storeName} (${s.timeWindow})\n📍 ${s.address}\n🎯 Strategy: ${s.clearanceStrategy}\n🛒 Aisles: ${s.aislesToCheck.join(', ')}\n`
      )
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      onNotify('Copied Game Plan checklist to clipboard!', 'success');
    } catch {
      onNotify('Failed to copy checklist.', 'error');
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      onNotify('Geolocation is not supported by your browser.', 'error');
      return;
    }

    onNotify('Detecting your GPS location...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(2);
        const lon = pos.coords.longitude.toFixed(2);
        const locLabel = `GPS (${lat}, ${lon})`;
        setUserLocationInput(locLabel);
        if (onUpdateZip) {
          onUpdateZip(zipCode); // keeps current zip or triggers update
        }
        soundFx.playPennyJackpot();
        onNotify(`Located at ${locLabel}! Game Plan recalculated.`, 'success');
      },
      (err) => {
        console.warn(err);
        onNotify('Could not get GPS location. Using ZIP code instead.', 'info');
      },
      { timeout: 8000 }
    );
  };

  const handleApplyLocation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = userLocationInput.trim();
    if (!clean) return;

    soundFx.playStandardScan();
    if (onUpdateZip && /^\d{5}$/.test(clean)) {
      onUpdateZip(clean);
    }
    onNotify(`Game plan generated for ${clean} (${selectedRadius} mi radius)!`, 'success');
  };

  // Filter stops' targets based on dealTypeFilter
  const activeStop = stops[activeStopIndex] || stops[0];
  const filteredActiveStopTargets = activeStop.sampleTargets.filter((t) => {
    if (dealTypeFilter === 'all') return true;
    if (dealTypeFilter === 'paint') return t.isPaint;
    if (dealTypeFilter === 'penny') return t.isPenny;
    if (dealTypeFilter === 'tools') return t.category.toLowerCase().includes('tool') || t.category.toLowerCase().includes('hardware');
    if (dealTypeFilter === 'salvage') return t.tagCode?.toLowerCase().includes('salvage') || t.category.toLowerCase().includes('toys');
    return true;
  });

  // Check if today is a live active penny drop right now
  const isPennyDayNow = realTodayDayName === 'Tuesday';
  const isMorningWindowNow = realCurrentHour >= 6 && realCurrentHour <= 10;

  return (
    <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-3.5 sm:p-5 mb-5 shadow-lg space-y-4">
      {/* Header & Title */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-gradient-to-r from-[#30d158]/20 to-[#ffd60a]/20 text-[#30d158] border border-[#30d158]/30">
              <Navigation className="w-4 h-4 text-[#30d158]" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-[#f5f5f7] tracking-tight">
              Sourcing Game Plan & Penny Clock
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#30d158]/15 text-[#30d158] font-bold border border-[#30d158]/30">
              Live Route Radar
            </span>
          </div>
          <p className="text-xs text-[#92929d] mt-1">
            Input your location to calculate an exact clearance game plan: timed store circuits, Oops paint deals ($1–$9), and precision penny drop schedules.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyChecklist}
            className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#92929d] hover:text-[#f5f5f7] flex items-center gap-1.5 transition-colors cursor-pointer border border-[#2c2c35]"
            title="Copy Checklist to Clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copy Checklist</span>
          </button>

          <button
            type="button"
            onClick={handleExportItinerary}
            className="px-2.5 py-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#ffd60a] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-[#ffd60a]/30 shadow-sm"
            title="Download Run Sheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Run Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStops(generateDynamicStops);
              setBaggedItems(0);
              onNotify('Sourcing game plan reset to beginning', 'info');
            }}
            className="p-1.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] transition-colors cursor-pointer border border-[#2c2c35]"
            title="Reset Game Plan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* LOCATION & SCOPING CONTROLS BAR */}
      <div className="p-3.5 bg-[#121215] rounded-xl border border-[#2c2c35] space-y-3">
        <form onSubmit={handleApplyLocation} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Location Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="w-4 h-4 text-[#ffd60a]" />
            </div>
            <input
              type="text"
              value={userLocationInput}
              onChange={(e) => setUserLocationInput(e.target.value)}
              placeholder="Enter ZIP or City, ST (e.g. 30301, Dallas TX, Miami FL)..."
              className="w-full bg-[#18181c] border border-[#2c2c35] focus:border-[#ffd60a] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[#f5f5f7] placeholder-[#92929d] focus:outline-none"
            />
          </div>

          {/* GPS Detector */}
          <button
            type="button"
            onClick={handleDetectGPS}
            className="px-3 py-2 rounded-xl bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#0a84ff] flex items-center justify-center gap-1.5 border border-[#2c2c35] transition-colors cursor-pointer shrink-0"
            title="Auto-detect current GPS location"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#0a84ff]" />
            <span>Use My GPS</span>
          </button>

          {/* Recalculate Button */}
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ffd60a] to-[#ff9f0a] hover:brightness-110 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Generate Game Plan</span>
          </button>
        </form>

        {/* Radius, Day & Quick Presets */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1 border-t border-[#2c2c35]/60">
          {/* Quick Hub Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[10px] uppercase font-bold text-[#92929d] shrink-0">Hubs:</span>
            {POPULAR_HUBS.map((hub) => (
              <button
                key={hub.zip}
                type="button"
                onClick={() => {
                  setUserLocationInput(hub.zip);
                  if (onUpdateZip) onUpdateZip(hub.zip);
                  soundFx.playStandardScan();
                  onNotify(`Switched hub to ${hub.name} (${hub.zip})`, 'info');
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono shrink-0 transition-colors cursor-pointer border ${
                  userLocationInput === hub.zip
                    ? 'bg-[#ffd60a]/20 text-[#ffd60a] border-[#ffd60a]/40 font-bold'
                    : 'bg-[#18181c] text-[#92929d] border-[#2c2c35] hover:text-white'
                }`}
              >
                {hub.name.split(',')[0]}
              </button>
            ))}
          </div>

          {/* Radius Selector */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] uppercase font-bold text-[#92929d]">Radius:</span>
            {[5, 10, 20].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setSelectedRadius(r);
                  soundFx.playStandardScan();
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                  selectedRadius === r
                    ? 'bg-[#0a84ff] text-white shadow-sm'
                    : 'bg-[#222227] text-[#92929d] hover:text-white'
                }`}
              >
                {r} mi
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LIVE PENNY RADAR TICKER & TIMETABLE STATUS */}
      <div className="p-3 bg-gradient-to-r from-[#ffd60a]/15 via-[#18181c] to-[#30d158]/15 rounded-xl border border-[#ffd60a]/30 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-full bg-[#ffd60a] text-black">
            <Flame className="w-3.5 h-3.5 fill-current" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#f5f5f7] uppercase tracking-wider">
                Target Day: <strong className="text-[#ffd60a]">{selectedDay}</strong>
              </span>
              {selectedDay === realTodayDayName && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#30d158]/20 text-[#30d158] font-bold">
                  TODAY
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#92929d] mt-0.5">
              {PENNY_DROP_SCHEDULE[selectedDay]?.highlight} • Prime Hours: <strong className="text-[#f5f5f7]">{PENNY_DROP_SCHEDULE[selectedDay]?.dropHour}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Day Selector Quick Toggle */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setSelectedDay(d);
                  soundFx.playStandardScan();
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  selectedDay === d
                    ? 'bg-[#ffd60a] text-black shadow-sm font-black'
                    : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7]'
                }`}
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SUB-TABS: ITINERARY vs OOPS PAINT SCOPER vs PENNY CLOCK vs TACTICS */}
      <div className="flex items-center gap-1.5 border-b border-[#2c2c35] pb-2 overflow-x-auto scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('itinerary')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'itinerary'
              ? 'bg-[#30d158] text-black shadow-sm font-black'
              : 'text-[#30d158] hover:bg-[#30d158]/10'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Timed Circuit Game Plan</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono font-black">
            {stops.length} Stops
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('paint-scoper')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'paint-scoper'
              ? 'bg-[#ffd60a] text-black shadow-sm font-black'
              : 'text-[#ffd60a] hover:bg-[#ffd60a]/10 border border-[#ffd60a]/30'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>🎨 Extreme Cheap Paint Scoper ($1–$9)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-[#ffd60a] font-mono font-bold">
            HOT
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('penny-clock')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'penny-clock'
              ? 'bg-[#0a84ff] text-white shadow-sm font-black'
              : 'text-[#0a84ff] hover:bg-[#0a84ff]/10'
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>Penny Deal Clock & Exact Timing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tactics')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'tactics'
              ? 'bg-[#bf5af2] text-white shadow-sm font-black'
              : 'text-[#bf5af2] hover:bg-[#bf5af2]/10'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>In-Store Policies & Cashier Rules</span>
        </button>
      </div>

      {/* VIEW 1: TIMED CIRCUIT GAME PLAN */}
      {activeTab === 'itinerary' && (
        <div className="space-y-4">
          {/* Trip Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 bg-[#121215] rounded-xl border border-[#2c2c35]">
              <span className="text-[10px] text-[#92929d] uppercase font-bold flex items-center gap-1">
                <Car className="w-3 h-3 text-[#0a84ff]" /> Route Distance
              </span>
              <div className="text-base font-mono font-black text-[#f5f5f7] mt-0.5">
                {totalMiles.toFixed(1)} <span className="text-xs text-[#92929d] font-normal">mi</span>
              </div>
              <span className="text-[10px] text-[#92929d]">~{totalDriveMins} mins total driving</span>
            </div>

            <div className="p-2.5 bg-[#121215] rounded-xl border border-[#2c2c35]">
              <span className="text-[10px] text-[#92929d] uppercase font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-[#30d158]" /> Estimated Profit Pool
              </span>
              <div className="text-base font-mono font-black text-[#30d158] mt-0.5">
                ${totalPotentialProfit.toFixed(0)} <span className="text-xs text-[#92929d] font-normal">spread</span>
              </div>
              <span className="text-[10px] text-[#92929d]">{stops.length} major clearance anchors</span>
            </div>

            <div className="p-2.5 bg-[#121215] rounded-xl border border-[#2c2c35]">
              <span className="text-[10px] text-[#92929d] uppercase font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#ffd60a]" /> Day Focus
              </span>
              <div className="text-xs font-black text-[#ffd60a] mt-1 truncate">
                {selectedDay === 'Tuesday' ? 'DG Penny Day!' : selectedDay === 'Thursday' ? 'Target Toys & Baby!' : selectedDay === 'Wednesday' ? "Lowe's .02/.03 Drops!" : 'Regular Markdowns'}
              </div>
              <span className="text-[10px] text-[#92929d]">Priority schedules active</span>
            </div>

            <div className="p-2.5 bg-[#121215] rounded-xl border border-[#2c2c35]">
              <span className="text-[10px] text-[#92929d] uppercase font-bold flex items-center gap-1">
                <ShoppingBag className="w-3 h-3 text-[#ff9f0a]" /> Circuit Progress
              </span>
              <div className="text-base font-mono font-black text-[#f5f5f7] mt-0.5">
                {completedStops} / {stops.length} <span className="text-xs text-[#92929d] font-normal">stops</span>
              </div>
              <span className="text-[10px] text-[#30d158] font-bold">{baggedItems} items bagged</span>
            </div>
          </div>

          {/* Deal Category Quick Filter */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-xs">
              <span className="text-[10px] text-[#92929d] uppercase font-bold mr-1">Scope:</span>
              {[
                { id: 'all', label: 'All Targets' },
                { id: 'paint', label: '🎨 Paint & Mistints ($1-$9)' },
                { id: 'penny', label: '🪙 Penny Items ($0.01)' },
                { id: 'tools', label: '🛠️ Tools & Hardware' },
                { id: 'salvage', label: '🎯 70% Salvage' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDealTypeFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                    dealTypeFilter === f.id
                      ? 'bg-[#222227] text-[#ffd60a] border border-[#ffd60a]/40'
                      : 'bg-[#121215] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
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
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] font-mono flex items-center justify-center font-black ${
                      stop.status === 'completed'
                        ? 'bg-[#30d158] text-black'
                        : isActive
                        ? 'bg-[#0a84ff] text-white'
                        : 'bg-[#222227] text-[#92929d]'
                    }`}
                  >
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
            <div className="p-4 bg-[#121215] border border-[#2c2c35] rounded-xl space-y-3.5">
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#0a84ff]/20 text-[#0a84ff]">
                      ⏰ {activeStop.timeWindow}
                    </span>
                    {activeStop.isTodayPeakDay && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/40">
                        🔥 PEAK TODAY ({selectedDay})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#92929d] mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#ff9800]" />
                    <span>
                      {activeStop.address} • {activeStop.distanceMiles} mi ({activeStop.estDriveMins} mins driving)
                    </span>
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
              <div className="p-3 bg-[#18181c] rounded-xl border border-[#0a84ff]/30 text-xs space-y-1">
                <span className="text-[10px] font-bold text-[#0a84ff] uppercase tracking-wider block">
                  Clearance Hunting Strategy & Timing
                </span>
                <p className="text-[#f5f5f7] leading-relaxed">{activeStop.clearanceStrategy}</p>
              </div>

              {/* Paint Scoping Directive (Highlighted!) */}
              {activeStop.paintScopingTips && (
                <div className="p-3 bg-gradient-to-r from-[#ffd60a]/10 to-[#18181c] rounded-xl border border-[#ffd60a]/30 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-[#ffd60a] uppercase tracking-wider flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-[#ffd60a]" /> Extreme Cheap Paint & Mistint Directive:
                  </span>
                  <p className="text-[#f5f5f7] leading-relaxed">{activeStop.paintScopingTips}</p>
                </div>
              )}

              {/* Spot-On Pokémon & TCG Delivery Intel */}
              {activeStop.pokemonDeliveryIntel && (
                <div className="p-3 bg-gradient-to-r from-[#0a84ff]/10 via-[#18181c] to-[#ffd60a]/10 rounded-xl border border-[#ffd60a]/40 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-black text-[#ffd60a] uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#ffd60a]" /> Spot-On Pokémon & TCG Delivery Intelligence
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black font-mono border ${
                        activeStop.pokemonDeliveryIntel.probabilityScore >= 90
                          ? 'bg-[#30d158]/20 text-[#30d158] border-[#30d158]/40'
                          : 'bg-[#ffd60a]/20 text-[#ffd60a] border-[#ffd60a]/40'
                      }`}
                    >
                      {activeStop.pokemonDeliveryIntel.probabilityScore}% {activeStop.pokemonDeliveryIntel.probabilityLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#f5f5f7]">
                    <div className="bg-[#121215] p-2 rounded-lg border border-[#2c2c35]">
                      <span className="text-[10px] text-[#92929d] font-bold uppercase block">
                        DSD Vendor & Delivery Window:
                      </span>
                      <strong className="text-[#0a84ff]">{activeStop.pokemonDeliveryIntel.vendor}</strong> •{' '}
                      <span>{activeStop.pokemonDeliveryIntel.window}</span>
                    </div>
                    <div className="bg-[#121215] p-2 rounded-lg border border-[#2c2c35]">
                      <span className="text-[10px] text-[#92929d] font-bold uppercase block">
                        Physical Stash Spot:
                      </span>
                      <span className="text-[#ffd60a] font-semibold">{activeStop.pokemonDeliveryIntel.stashSpot}</span>
                    </div>
                  </div>

                  <div className="bg-[#121215] p-2 rounded-lg border border-[#2c2c35]/80 flex items-start gap-1.5 text-[11px] text-[#92929d]">
                    <Zap className="w-3.5 h-3.5 text-[#ff9800] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-[#f5f5f7]">Scout Intel:</strong> {activeStop.pokemonDeliveryIntel.hunterTip}
                    </span>
                  </div>
                </div>
              )}

              {/* High Priority Aisles to Walk */}
              <div>
                <span className="text-[11px] font-bold text-[#92929d] uppercase tracking-wider block mb-1.5">
                  Priority Aisles & Physical Coordinates
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {activeStop.aislesToCheck.map((aisle, i) => (
                    <div
                      key={i}
                      className="p-2 bg-[#18181c] rounded-lg border border-[#2c2c35] text-xs text-[#f5f5f7] flex items-center gap-2"
                    >
                      <Compass className="w-3.5 h-3.5 text-[#ffd60a] shrink-0" />
                      <span className="truncate">{aisle}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Targets List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#30d158] uppercase tracking-wider">
                    High-Spread Targets at this Stop ({filteredActiveStopTargets.length})
                  </span>
                  <span className="text-[10px] text-[#92929d]">Tap Bag It to add to cart</span>
                </div>

                <div className="space-y-2">
                  {filteredActiveStopTargets.map((tgt, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-[#18181c] rounded-xl border border-[#2c2c35] hover:border-[#30d158]/40 transition-colors flex items-center justify-between gap-2 flex-wrap text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {tgt.isPaint && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#ffd60a]/20 text-[#ffd60a] font-bold">
                              🎨 Paint Deal
                            </span>
                          )}
                          {tgt.isPenny && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#30d158]/20 text-[#30d158] font-bold font-mono">
                              🪙 1¢ Penny
                            </span>
                          )}
                          {tgt.tagCode && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#222227] text-[#92929d] font-mono">
                              {tgt.tagCode}
                            </span>
                          )}
                        </div>
                        <h5 className="font-bold text-sm text-[#f5f5f7] mt-0.5">{tgt.name}</h5>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-[#92929d]">
                          <span>
                            Buy: <strong className="text-[#30d158] font-mono">${tgt.buy.toFixed(2)}</strong>
                          </span>
                          <span>
                            Resell: <strong className="text-[#0a84ff] font-mono">${tgt.resell.toFixed(2)}</strong>
                          </span>
                          <span>
                            Net Spread:{' '}
                            <strong className="text-[#ffd60a] font-mono font-bold">
                              +${(tgt.resell * 0.85 - tgt.buy).toFixed(2)}
                            </strong>
                          </span>
                          <span className="text-[#f5f5f7] hidden sm:inline">• 📍 {tgt.location}</span>
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
                            className="p-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[#92929d] hover:text-[#f5f5f7] transition-colors cursor-pointer border border-[#2c2c35]"
                            title="Load into Calculator"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-[#30d158]" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleBagTarget(activeStop, tgt)}
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

              {/* Prev / Next Stop Navigation */}
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
      )}

      {/* VIEW 2: EXTREME CHEAP & OOPS PAINT SCOPER */}
      {activeTab === 'paint-scoper' && (
        <div className="space-y-4">
          {/* Paint Master Intel Banner */}
          <div className="p-4 bg-gradient-to-r from-[#ffd60a]/15 via-[#18181c] to-[#0a84ff]/15 rounded-xl border border-[#ffd60a]/40 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Paintbrush className="w-5 h-5 text-[#ffd60a]" />
                <h3 className="text-sm sm:text-base font-black text-[#f5f5f7]">
                  The "Oops Paint" Arbitrage Blueprint ($1.00 – $9.00 Flips)
                </h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#30d158]/20 text-[#30d158] font-bold font-mono">
                +250% to +400% ROI
              </span>
            </div>

            <p className="text-xs text-[#92929d] leading-relaxed">
              When a store associate makes a tint mistake or a contractor returns the wrong color shade, big-box retailers (The Home Depot, Lowe's, Sherwin-Williams) cannot restock the can. By policy, they slap an <strong>"Oops / As-Is" sticker</strong> on it and slash the price from <strong>$45–$75 down to $9.00 flat</strong> (or $1–$2 for sample quarts).
            </p>

            {/* Quick Rules of Flipping Paint */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-xs">
              <div className="p-2.5 bg-[#121215] rounded-lg border border-[#2c2c35]">
                <span className="text-[10px] font-bold text-[#ffd60a] uppercase tracking-wider block">
                  1. Where to Look in Store
                </span>
                <p className="text-[#f5f5f7] mt-1 text-[11px] leading-relaxed">
                  Walk straight to the paint desk. Look for a rolling wire rack or metal shelf right next to the shaker machines. Often marked with orange/neon green circular "Oops" labels.
                </p>
              </div>

              <div className="p-2.5 bg-[#121215] rounded-xl border border-[#2c2c35]">
                <span className="text-[10px] font-bold text-[#30d158] uppercase tracking-wider block">
                  2. Best Scoping Hours
                </span>
                <p className="text-[#f5f5f7] mt-1 text-[11px] leading-relaxed">
                  <strong>7:00 AM – 9:00 AM Monday through Saturday</strong>. Morning tint technicians purge previous day mistakes, and contractors return mismatches first thing at opening.
                </p>
              </div>

              <div className="p-2.5 bg-[#121215] rounded-xl border border-[#2c2c35]">
                <span className="text-[10px] font-bold text-[#0a84ff] uppercase tracking-wider block">
                  3. The Color Grade Secret
                </span>
                <p className="text-[#f5f5f7] mt-1 text-[11px] leading-relaxed">
                  Focus on <strong>Whites, Off-Whites, Light Grays, Greiges, and Wood Stains</strong>. Handymen and homeowners buy them on Facebook Marketplace for $25–$35 within 24 hours.
                </p>
              </div>
            </div>
          </div>

          {/* Curated Paint Deals List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#f5f5f7] uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-[#ffd60a]" />
                Scouted Paint & Mistint Deals in {userLocationInput}
              </span>
              <span className="text-[10px] text-[#92929d]">8 High-Spread Paint Targets Mapped</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {CURATED_PAINT_DEALS.map((deal) => (
                <div
                  key={deal.id}
                  className="p-3 bg-[#121215] border border-[#2c2c35] hover:border-[#ffd60a]/40 rounded-xl space-y-2 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#222227] text-[#ffd60a] font-mono font-bold">
                          {deal.store.split(' ')[0]}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#30d158]/20 text-[#30d158] font-bold">
                          {deal.colorGrade}
                        </span>
                        <span className="text-[10px] text-[#92929d] font-mono">{deal.volume}</span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-black text-[#30d158]">
                          Buy ${deal.buy.toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-[#0a84ff] font-bold">
                          Resell ${deal.resell.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-bold text-xs sm:text-sm text-[#f5f5f7] mt-1.5">
                      {deal.title}
                    </h4>

                    <div className="text-[11px] text-[#ffd60a] flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-[#ffd60a] shrink-0" />
                      <span>{deal.location}</span>
                    </div>

                    <p className="text-[11px] text-[#92929d] mt-1 leading-relaxed">{deal.notes}</p>
                  </div>

                  <div className="pt-2 border-t border-[#2c2c35] flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] text-[#30d158] font-bold">
                      ⚡ Flip Velocity: {deal.flipSpeed}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {onLoadIntoCalculator && (
                        <button
                          type="button"
                          onClick={() =>
                            onLoadIntoCalculator({
                              title: deal.title,
                              buyPrice: deal.buy,
                              sellPrice: deal.resell,
                              store: deal.store,
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
                        onClick={() => handleBagPaintDeal(deal)}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#ffd60a] to-[#ff9f0a] hover:brightness-110 text-black text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>Bag Paint</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PENNY DEAL MASTER CLOCK & TIMETABLE */}
      {activeTab === 'penny-clock' && (
        <div className="space-y-4">
          {/* Live Status Card */}
          <div className="p-3.5 bg-[#121215] rounded-xl border border-[#0a84ff]/30 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0a84ff]" />
                <span className="text-xs font-black text-[#f5f5f7] uppercase tracking-wider">
                  Live Penny Drop Chrono-Matrix
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-[#ffd60a]">
                Today is {realTodayDayName} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <p className="text-xs text-[#92929d] leading-relaxed">
              Penny drops are not random. Big-box inventory management systems run automated batch scripts overnight on set days of the week. Below is the exact timetable of when prices ring up at $0.01 across every chain.
            </p>
          </div>

          {/* 7-Day Matrix Table */}
          <div className="space-y-2">
            {DAYS_OF_WEEK.map((day) => {
              const sched = PENNY_DROP_SCHEDULE[day];
              const isSelected = selectedDay === day;
              const isRealToday = realTodayDayName === day;

              return (
                <div
                  key={day}
                  onClick={() => {
                    setSelectedDay(day);
                    soundFx.playStandardScan();
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#18181c] border-[#ffd60a] ring-1 ring-[#ffd60a]/40 shadow-md'
                      : 'bg-[#121215] border-[#2c2c35] hover:border-[#ffd60a]/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-lg font-black ${
                          isRealToday ? 'bg-[#30d158] text-black' : 'bg-[#222227] text-[#f5f5f7]'
                        }`}
                      >
                        {day}
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-[#f5f5f7]">
                        {sched.primaryFocus}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#ffd60a] bg-[#222227] px-2 py-0.5 rounded-md border border-[#2c2c35]">
                        ⏰ {sched.dropHour}
                      </span>
                      <span className="text-[10px] text-[#92929d]">{sched.store}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#92929d] mt-1.5 leading-relaxed pl-1">
                    {sched.policySop}
                  </p>

                  <div className="mt-2 pt-2 border-t border-[#2c2c35] grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px] text-[#f5f5f7]">
                    {sched.tactics.map((t, idx) => (
                      <div key={idx} className="flex items-start gap-1">
                        <span className="text-[#30d158] shrink-0 font-bold">•</span>
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: IN-STORE POLICIES & CASHIER RULES */}
      {activeTab === 'tactics' && (
        <div className="space-y-3">
          <div className="p-3.5 bg-[#121215] rounded-xl border border-[#2c2c35] text-xs space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#ffd60a]" />
              <h3 className="font-black text-sm text-[#f5f5f7]">
                Golden Rules of Penny Sourcing: How to Checkout Without Getting Confiscated
              </h3>
            </div>
            <p className="text-[#92929d] leading-relaxed">
              When an item hits $0.01, it is technically an internal corporate code for "Return to Vendor / Salvage." If you approach a regular cashier yelling "I found a penny item!", they will take it and send it to the compactor. Follow these strict battle-tested protocols:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Rule 1 */}
            <div className="p-3 bg-[#121215] border border-[#2c2c35] rounded-xl space-y-1.5">
              <span className="text-xs font-black text-[#ffd60a] uppercase tracking-wider block">
                Rule 1: Always Use Self-Checkout First
              </span>
              <p className="text-[#92929d] leading-relaxed">
                At Home Depot and Walmart, scan penny items directly at self-checkout machines. The register will ring it up as $0.01 without triggering an alert or requiring manager intervention. Slide your card and print the receipt.
              </p>
            </div>

            {/* Rule 2 */}
            <div className="p-3 bg-[#121215] border border-[#2c2c35] rounded-xl space-y-1.5">
              <span className="text-xs font-black text-[#30d158] uppercase tracking-wider block">
                Rule 2: Dollar General SOP 14 Law
              </span>
              <p className="text-[#92929d] leading-relaxed">
                Dollar General has an explicit written corporate policy: <em>"If a penny item is on the shelf and rings $0.01, the cashier MUST sell it to the customer."</em> If a cashier refuses, politely ask them to scan it or cite SOP 14.
              </p>
            </div>

            {/* Rule 3 */}
            <div className="p-3 bg-[#121215] border border-[#2c2c35] rounded-xl space-y-1.5">
              <span className="text-xs font-black text-[#0a84ff] uppercase tracking-wider block">
                Rule 3: Never Ask Staff to Check Backroom for Pennies
              </span>
              <p className="text-[#92929d] leading-relaxed">
                Employees are strictly prohibited from retrieving penny items from the back stockroom. Only items already on the sales floor shelves are eligible for customer purchase.
              </p>
            </div>

            {/* Rule 4 */}
            <div className="p-3 bg-[#121215] border border-[#2c2c35] rounded-xl space-y-1.5">
              <span className="text-xs font-black text-[#bf5af2] uppercase tracking-wider block">
                Rule 4: Buying Oops Paint Smoothly
              </span>
              <p className="text-[#92929d] leading-relaxed">
                Oops paint is 100% official and legal. Take the can directly to any register. The barcode or yellow sticker will ring up as $9.00 or $1.00 automatically. No questions asked.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
