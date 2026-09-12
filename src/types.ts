export interface SourcingItem {
  id: string;
  date: string;
  timestamp: number;
  label: string;
  buy: number;
  sell: number;
  ship: number;
  feePct: number;
  profit: string;
  roi: string;
  store?: string;
  category?: string;
  notes?: string;
}

export interface WatchlistTopic {
  id: string;
  season: string;
  title: string;
  description: string;
  recommendedStore?: string;
  hotItems?: string[];
}

export type DGPennyCategory =
  | 'All'
  | 'Seasonal & Holiday'
  | 'Home & Decor'
  | 'Apparel & Shoes'
  | 'Toys & Games'
  | 'Health & Beauty'
  | 'Food & Candy'
  | 'Cleaning & Household';

export interface DGPennyItem {
  id: string;
  name: string;
  upc: string;
  tagSymbol: string;
  category: string;
  origPrice: number;
  estResell: number;
  dropDate: string;
  notes?: string;
  verified: boolean;
  isFound?: boolean;
}

export type DealSeekStore =
  | 'Amazon'
  | 'Walmart'
  | 'Target'
  | 'Best Buy'
  | 'Dollar General'
  | 'Home Depot'
  | 'Other';

export type DealSeekType =
  | 'promo_code'
  | 'clippable_coupon'
  | 'price_drop'
  | 'glitch_deal'
  | 'clearance_stack';

export interface DealSeekItem {
  id: string;
  title: string;
  store: DealSeekStore;
  category: string;
  dealType: DealSeekType;
  origPrice: number;
  dealPrice: number;
  discountPct: number;
  promoCode?: string;
  clippableCouponText?: string;
  dealUrl: string;
  estResellPrice: number;
  verifiedTime: string;
  isStaffPick?: boolean;
  isGlitch?: boolean;
  upvotes: number;
  downvotes: number;
  isExpired?: boolean;
  userVoted?: 'up' | 'down';
  notes?: string;
}

export type DealSoldierStore =
  | 'Home Depot'
  | "Lowe's"
  | 'Walmart'
  | 'Target'
  | 'Costco'
  | 'Dollar General';

export interface StoreLocationInventory {
  storeName: string;
  storeNumber: string;
  address: string;
  distanceMiles: number;
  driveTimeMinutes?: number;
  stockQuantity: number;
  stockStatus: 'In Stock' | 'Limited Stock' | 'Out of Stock' | 'Phantom Stock';
  aisleBay?: string;
  lastVerifiedByHunter?: string;
  userReportedCorrection?: {
    correctedCount: number;
    correctedAisleBay?: string;
    status: 'In Stock' | 'Out of Stock' | 'Phantom Stock';
    notes?: string;
    timestamp: string;
  };
}

export interface DealSoldierItem {
  id: string;
  title: string;
  sku: string;
  upc?: string;
  internetNumber?: string;
  store: DealSoldierStore;
  category: string;
  price: number;
  origPrice: number;
  discountPct: number;
  markdownCode: '.01 Penny' | '.03 Final Clearance' | '.06 Clearance' | '.02 Manager Markdown' | 'Yellow Tag Clearance';
  yellowTagDate?: string;
  estResellPrice: number;
  closestStore: StoreLocationInventory;
  otherNearbyStores: StoreLocationInventory[];
  aisleBayHint: string;
  verifiedDate: string;
  isPenny: boolean;
  isClosetItem?: boolean;
  hunterNotes: string;
  userCorrection?: {
    realCount: number;
    realAisleBay: string;
    stockStatus: 'In Stock' | 'Out of Stock' | 'Phantom Stock';
    note: string;
    correctedAt: string;
  };
}

export interface ClosetInventoryItem {
  id: string;
  name: string;
  sku?: string;
  store: string;
  quantity: number;
  purchasePrice: number;
  targetListPrice: number;
  closetLocation: string; // e.g. "Closet Shelf 2", "Bin B", "Master Closet", "Garage Rack"
  status: 'In Closet' | 'Listed on eBay' | 'Listed on FB Marketplace' | 'Listed on Mercari' | 'Sold';
  dateAdded: string;
  notes?: string;
}

export type WalmartMarkdownStage =
  | '.00 Floor Price'
  | '.01 / .02 Salvage Penny'
  | '.03 / .04 Deep Cut'
  | '.05 First Markdown'
  | 'Hidden Scan Drop';

export interface WalmartSecretItem {
  id: string;
  title: string;
  sku: string;
  upc: string;
  category: string;
  shelfTagPrice: number; // Deceptive physical shelf tag (e.g. $49.97)
  actualScanPrice: number; // Real price in Walmart App / self checkout (e.g. $5.00)
  discountPct: number;
  markdownStage: WalmartMarkdownStage;
  estResellPrice: number;
  department: string;
  hiddenLocationType:
    | 'Top Stock Riser'
    | 'Unmarked Endcap'
    | 'Electronics Cage'
    | 'Garden Center Patio'
    | 'Action Alley Bin'
    | 'Clearance Aisle';
  aisleHint: string;
  tagDateHint?: string;
  hunterTip: string;
  verifiedAt: string;
  closestStore?: {
    storeName: string;
    storeNumber: string;
    address?: string;
    distanceMiles: number;
    driveTimeMinutes?: number;
    stockQty: number;
  };
  inStockStoresNearZip: {
    storeName: string;
    storeNumber: string;
    address?: string;
    distanceMiles: number;
    driveTimeMinutes?: number;
    stockQty: number;
  }[];
}

export type PokemonDropStatus =
  | 'VENDOR IN-STORE NOW'
  | 'RESTOCK DROP TODAY'
  | 'HIDDEN CLEARANCE'
  | 'ONLINE QUEUE LIVE'
  | 'STORE RESET WATCH';

export type TCGProductType =
  | 'Booster Bundle'
  | 'Elite Trainer Box (ETB)'
  | 'Booster Box / Case'
  | 'Collection Box'
  | 'Mini Tin / Stacking Tin'
  | 'Blister Pack / 3-Pack'
  | 'UPC / Premium Collection'
  | 'Mystery Power Box / Repack';

export interface PokemonDropItem {
  id: string;
  name: string;
  series: string; // e.g., '151', 'Prismatic Evolutions', 'Paldean Fates', 'Crown Zenith', 'Surging Sparks', 'Temporal Forces'
  productType: TCGProductType;
  store: 'Walmart' | 'Target' | 'Costco' | 'Best Buy' | 'GameStop' | 'Dollar General' | 'Sam’s Club' | 'Pokemon Center';
  vendorName: 'MJ Holding' | 'Excell Marketing' | 'Direct Distributor' | 'Store Direct' | 'Store Direct / Clip Strips';
  sku: string;
  upc: string;
  msrp: number;
  actualPrice: number; // Price to pay (e.g. $26.94 MSRP or $9.00 hidden clearance)
  marketPrice: number; // TCGPlayer / eBay Market resale value
  dropStatus: PokemonDropStatus;
  restockSchedule: string; // e.g. "Thursday 8 AM - 11 AM (MJ Holding Vendor window)"
  inStoreLocation: string; // e.g. "Front Register Aisle 4 Card Wall & locked Customer Service cabinet"
  hunterTips: string;
  purchaseLimit: string; // e.g. "2 per customer strictly enforced"
  closestStoreStock: {
    storeName: string;
    distanceMiles: number;
    stockStatus: 'In Stock' | 'Limited Stock' | 'Out of Stock' | 'Restock Reported';
    reportedAt: string;
    verifiedBy: string;
  };
  isHiddenClearance?: boolean;
}

export type TargetDayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Weekend';

export interface TargetMarkdownDaySchedule {
  day: TargetDayOfWeek;
  departments: string[];
  bestTimeToHunt: string;
  tagStickerFocus: string;
  hunterTips: string;
}

export interface TargetClearanceItem {
  id: string;
  title: string;
  dpci: string; // Target DPCI format e.g. 204-00-1849
  upc: string;
  department: string;
  markdownDay: TargetDayOfWeek;
  originalPrice: number;
  currentPrice: number;
  priceEnding: '.99' | '.98' | '.04' | string;
  clearancePercent: 15 | 30 | 50 | 70 | 90 | number;
  isSalvage: boolean; // True if .04 price ending or 70%+ clearance
  stickerCode: string; // The number printed in the top right corner of red tag
  aisleEndcap: string;
  estResale: number;
  stockStatus: 'In Stock' | 'Limited Stock' | 'Floor Salvage Watch' | 'Clearance Endcap';
  hunterNotes: string;
  closestStore?: {
    storeName: string;
    storeNumber: string;
    address: string;
    distanceMiles: number;
    driveTimeMinutes?: number;
    stockQty: number;
  };
  inStockStoresNearZip?: {
    storeName: string;
    storeNumber: string;
    address: string;
    distanceMiles: number;
    driveTimeMinutes?: number;
    stockQty: number;
  }[];
}

export type LowesMarkdownStage = 'phase1_markdown' | 'phase2_final_rtv' | 'manager_special';

export interface LowesClearanceItem {
  id: string;
  title: string;
  itemNumber: string; // Lowe's 6 or 7-digit item number, e.g. 1489201
  modelNumber?: string;
  upc: string;
  brand: string;
  category: string;
  originalPrice: number;
  currentPrice: number;
  priceEnding: '.06' | '.07' | '.02' | '.03' | string;
  stage: LowesMarkdownStage;
  discountPct: number;
  isFinalRtv: boolean; // true if .02 or .03 ending (75% - 90% off, imminent RTV return)
  bayAisle: string; // e.g. Aisle 14 Bay 6 Top Stock
  estResale: number;
  stockStatus: 'In Stock' | 'Limited Stock' | 'Final Unit / Display' | 'RTV Pull Pending';
  hunterNotes: string;
  closestStore?: {
    storeName: string;
    storeNumber: string;
    address: string;
    distanceMiles: number;
    driveTimeMinutes?: number;
    stockQty: number;
  };
  inStockStoresNearZip?: {
    storeName: string;
    storeNumber: string;
    address: string;
    distanceMiles: number;
    driveTimeMinutes?: number;
    stockQty: number;
  }[];
}

export type StoreChannel = 'Amazon FBA' | 'eBay Solds' | 'Walmart' | 'Target' | 'Home Depot' | 'Lowe\'s' | 'Dollar General' | 'Google Shopping' | 'TCGPlayer' | 'Mercari';

export interface StorePricePoint {
  storeName: StoreChannel | string;
  storeType: 'Online Marketplace' | 'In-Store Clearance' | 'Retail MSRP' | 'Penny Drop';
  price: number;
  condition: 'New / Sealed' | 'Refurbished' | 'In-Store Clearance' | 'Clearance As-Is';
  availability: 'In Stock' | 'Limited Stock' | 'Clearance / Floor' | 'Out of Stock' | 'OOS / Scalped';
  stockCount?: number;
  aisleLocation?: string;
  catalogItemNumber?: string;
  feeEst?: number;
  netPayout?: number;
  directUrl: string;
  notes?: string;
  isLowestBuy?: boolean;
  isHighestSell?: boolean;
  badgeColor?: string;
}

export interface StoreCatalogStock {
  storeId: string;
  storeName: 'Walmart' | 'Target' | 'The Home Depot' | "Lowe's" | 'Dollar General' | 'Amazon FBA' | 'eBay' | string;
  storeNumber?: string;
  branchName: string;
  distanceMiles?: number;
  catalogStatus: 'In Stock' | 'Limited Stock' | 'Floor Display / Clearance Only' | 'Overhead / Backroom' | 'Out of Stock';
  stockQuantity: number;
  aisleBayLocation?: string;
  catalogItemNumber?: string; // DPCI, SKU, or Item Number
  onlineCatalogUrl: string;
  inStorePrice: number;
  onlinePrice?: number;
  lastInventorySync: string;
  canReserveForPickup: boolean;
  notes?: string;
}

export type StoreChain =
  | 'Home Depot'
  | "Lowe's"
  | 'Walmart'
  | 'Target'
  | 'Dollar General'
  | 'Harbor Freight'
  | 'Tractor Supply'
  | "Ollie's Bargain"
  | 'Best Buy'
  | 'Ace Hardware'
  | 'Costco'
  | "Sam's Club"
  | 'TJ Maxx / Marshalls'
  | 'CVS / Walgreens';

export interface StoreDealItem {
  id: string;
  title: string;
  sku: string;
  upc?: string;
  category: string;
  clearancePrice: number;
  origPrice: number;
  discountPct: number;
  markdownType: string;
  tagColor?: string;
  estResellPrice: number;
  stockQty: number;
  stockStatus: 'In Stock' | 'Limited Stock' | 'Out of Stock' | 'Phantom Stock';
  aisleBay: string;
  verifiedAt: string;
  isPenny: boolean;
  notes: string;
}

export interface StoreProfile {
  id: string;
  chain: StoreChain;
  storeName: string;
  storeNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  distanceMiles: number;
  driveTimeMinutes: number;
  hours: string;
  clearanceResetSchedule: string;
  primaryMarkdownDays: string[];
  secretHotspots: string[];
  clearancePolicyTips: string[];
  selfCheckoutFriendly: boolean;
  activeClearanceCount: number;
  activePennyCount: number;
  inventory: StoreDealItem[];
  brandColor: string;
  brandBg: string;
  brandBorder: string;
  tags?: string[];
}


export interface CrossStoreComparison {
  id: string;
  title: string;
  upc: string;
  sku?: string;
  brand?: string;
  category: string;
  sourceStore: string;
  sourcePrice: number;
  prices: StorePricePoint[];
  catalogStocks?: StoreCatalogStock[];
  lowestBuyStore: string;
  lowestBuyPrice: number;
  highestSellStore: string;
  highestSellPrice: number;
  grossSpread: number;
  estNetProfit: number;
  estRoi: number;
  salesVelocity: 'Very High (Hours)' | 'High (1-3 Days)' | 'Medium (1-2 Weeks)' | 'Slow';
  arbitrageVerdict: string;
  timestamp?: number;
}

export type CouponTierType =
  | 'Store Digital Coupon'
  | 'Manufacturer Digital Coupon'
  | 'Cashback Rebate (Ibotta/Fetch)'
  | 'Tool Return Proration Hack'
  | 'Store Card 5% / Pro Perk'
  | 'Saturday Spend Multiplier'
  | 'Glitch Overage';

export interface AppliedCouponLayer {
  id: string;
  name: string;
  type: CouponTierType;
  discountValue: number;
  discountType: 'flat' | 'percentage';
  codeOrClip?: string;
  appSource: string; // e.g., 'Target Circle', 'DG App', 'Ibotta', 'Home Depot Pro', 'Lowe's MVP'
  terms?: string;
}

export interface AutoCoupledDeal {
  id: string;
  title: string;
  brand?: string;
  skuOrUpc: string;
  store: StoreChain | string;
  category: string;
  originalRetailPrice: number;
  clearancePrice: number;
  coupledCoupons: AppliedCouponLayer[];
  totalCouponSavings: number;
  finalNetBuyCost: number;
  estResalePrice: number;
  estNetProfit: number;
  roiPct: number;
  isMoneymaker: boolean;
  hackType?: 'Tool Return Hack' | 'Saturday Glitch' | 'Multi-Tier Stack' | 'Rebate Moneymaker';
  hackDetails?: {
    primaryItemName: string;
    primaryRetail: number;
    freeBonusItemName: string;
    freeBonusRetail: number;
    receiptReturnRefundValue: number;
    netKeptItemCost: number;
    resaleMarket: string;
    stepByStepInstructions: string[];
  };
  hunterVerifiedDate: string;
  popularityScore: number;
}

export interface StoreCouponOffer {
  id: string;
  store: StoreChain | string;
  title: string;
  code?: string;
  discountDescription: string;
  categoryScope: string;
  minimumSpend?: number;
  expiresOn: string;
  clipUrl?: string;
  isStackableWithClearance: boolean;
  isStackableWithManufacturer: boolean;
  hunterNotes: string;
}

export type WholesaleClubName = 'Costco Wholesale' | "Sam's Club" | "BJ's Wholesale";

export interface WholesaleDeathMarkDeal {
  id: string;
  club: WholesaleClubName;
  title: string;
  category: string;
  itemNumber: string;
  upc: string;
  originalPrice: number;
  markdownPrice: number;
  discountPct: number;
  tagEnding: string;
  hasAsterisk: boolean;
  hasDiscontinuedLetter: boolean;
  statusLabel: string;
  tagDecodedMeaning: string;
  actionRecommendation: 'BUY OUT PALLET' | 'HEAVY FLIP BUY' | 'MONITOR NEXT CUT' | 'RISKY SPECULATION';
  marketResaleComps: {
    source: 'eBay Sold' | 'Amazon BuyBox' | 'FB Marketplace' | 'Mercari';
    soldAvgPrice: number;
    sellThroughRatePct: number;
    velocity: 'Fast (1-3 days)' | 'Moderate (1-2 wks)' | 'Slow (30+ days)';
    netProfit: number;
    roiPct: number;
  };
  warehouseLocationAisle: string;
  reportedWarehouse: {
    clubName: string;
    distanceMiles: number;
    stockOnHand: number;
    reportedAt: string;
  };
  hunterProTips: string;
  isManagerDiscretion?: boolean;
}




