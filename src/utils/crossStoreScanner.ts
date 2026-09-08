import { CrossStoreComparison, StorePricePoint } from '../types';
import { readStoreCatalogsForStock } from './storeCatalogReader';

export function buildStoreSearchUrls(title: string, upc?: string) {
  const q = upc || title;
  const encoded = encodeURIComponent(q);
  const titleEncoded = encodeURIComponent(title);

  return {
    amazon: `https://www.amazon.com/s?k=${encoded}`,
    ebaySolds: `https://www.ebay.com/sch/i.html?_nkw=${encoded}&LH_Sold=1&LH_Complete=1`,
    walmart: `https://www.walmart.com/search?q=${encoded}`,
    target: `https://www.target.com/s?searchTerm=${encoded}`,
    homeDepot: `https://www.homedepot.com/s/${titleEncoded}`,
    lowes: `https://www.lowes.com/search?searchTerm=${encoded}`,
    googleShopping: `https://www.google.com/search?tbm=shop&q=${encoded}`,
    tcgPlayer: `https://www.tcgplayer.com/search/all/product?q=${titleEncoded}`,
  };
}

export const KNOWN_CROSS_STORE_BENCHMARKS: CrossStoreComparison[] = [
  {
    id: 'bench-dewalt-20v',
    title: 'DeWalt 20V MAX XR Brushless 2-Tool Hammerdrill & Impact Driver Kit',
    upc: '885911478294',
    sku: 'DCK299P2',
    brand: 'DeWalt',
    category: 'Power Tools',
    sourceStore: "Lowe's Yellow Tag (.02 RTV)",
    sourcePrice: 89.02,
    prices: [
      {
        storeName: 'Amazon FBA',
        storeType: 'Online Marketplace',
        price: 299.00,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 49.35,
        netPayout: 249.65,
        directUrl: 'https://www.amazon.com/s?k=885911478294',
        notes: 'BSR #1,420 in Power Tools • 400+ bought/mo • Fast Buy Box flip',
        isHighestSell: true,
      },
      {
        storeName: 'eBay Solds',
        storeType: 'Online Marketplace',
        price: 269.00,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 35.64,
        netPayout: 233.36,
        directUrl: 'https://www.ebay.com/sch/i.html?_nkw=885911478294&LH_Sold=1&LH_Complete=1',
        notes: '92% Sell-Through • 18 solds in last 7 days',
      },
      {
        storeName: 'The Home Depot',
        storeType: 'Retail MSRP',
        price: 399.00,
        condition: 'New / Sealed',
        availability: 'In Stock',
        directUrl: 'https://www.homedepot.com/s/DCK299P2',
        notes: 'Full regular retail MSRP • Standard tool aisle price',
      },
      {
        storeName: 'Walmart.com',
        storeType: 'Online Marketplace',
        price: 329.99,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 49.50,
        netPayout: 280.49,
        directUrl: 'https://www.walmart.com/search?q=885911478294',
        notes: 'Pro Seller Marketplace listing with standard delivery',
      },
      {
        storeName: "Lowe's In-Store",
        storeType: 'In-Store Clearance',
        price: 89.02,
        condition: 'In-Store Clearance',
        availability: 'Limited Stock',
        directUrl: 'https://www.lowes.com/search?searchTerm=885911478294',
        notes: 'Yellow Tag ending in .02 (Phase 2 RTV final clearance)',
        isLowestBuy: true,
      },
    ],
    lowestBuyStore: "Lowe's (.02 Yellow Tag)",
    lowestBuyPrice: 89.02,
    highestSellStore: 'Amazon FBA',
    highestSellPrice: 299.00,
    grossSpread: 209.98,
    estNetProfit: 160.63,
    estRoi: 180,
    salesVelocity: 'Very High (Hours)',
    arbitrageVerdict: '🔥 S-TIER ARBITRAGE: Buy at Lowe’s for $89.02, sell on Amazon FBA for $299. Instant $160+ net profit per unit.',
  },
  {
    id: 'bench-pokemon-151-bundle',
    title: 'Pokémon TCG: Scarlet & Violet 151 Booster Bundle (6 Booster Packs)',
    upc: '820650853753',
    sku: 'POK-151-BUNDLE',
    brand: 'The Pokémon Company',
    category: 'Trading Cards',
    sourceStore: 'Walmart In-Store MSRP',
    sourcePrice: 26.98,
    prices: [
      {
        storeName: 'Amazon FBA',
        storeType: 'Online Marketplace',
        price: 54.95,
        condition: 'New / Sealed',
        availability: 'OOS / Scalped',
        feeEst: 11.24,
        netPayout: 43.71,
        directUrl: 'https://www.amazon.com/s?k=820650853753',
        notes: 'Amazon direct sold out • 3P sellers controlling Buy Box',
        isHighestSell: true,
      },
      {
        storeName: 'eBay Solds',
        storeType: 'Online Marketplace',
        price: 49.99,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 7.02,
        netPayout: 42.97,
        directUrl: 'https://www.ebay.com/sch/i.html?_nkw=820650853753&LH_Sold=1&LH_Complete=1',
        notes: '150+ solds in 48 hours • Instant flip velocity',
      },
      {
        storeName: 'TCGPlayer',
        storeType: 'Online Marketplace',
        price: 48.50,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 6.45,
        netPayout: 42.05,
        directUrl: 'https://www.tcgplayer.com/search/all/product?q=151+booster+bundle',
        notes: 'Market price pegged to high collector nostalgia demand',
      },
      {
        storeName: 'Target.com',
        storeType: 'Retail MSRP',
        price: 26.99,
        condition: 'New / Sealed',
        availability: 'Out of Stock',
        directUrl: 'https://www.target.com/s?searchTerm=820650853753',
        notes: 'Street dated • Excell Marketing vendor stock pulled instantly',
      },
      {
        storeName: 'Walmart In-Store',
        storeType: 'Retail MSRP',
        price: 26.98,
        condition: 'New / Sealed',
        availability: 'Limited Stock',
        directUrl: 'https://www.walmart.com/search?q=820650853753',
        notes: 'Restocked by MJ Holding Thursdays/Fridays in locked card alcove',
        isLowestBuy: true,
      },
    ],
    lowestBuyStore: 'Walmart In-Store',
    lowestBuyPrice: 26.98,
    highestSellStore: 'Amazon FBA',
    highestSellPrice: 54.95,
    grossSpread: 27.97,
    estNetProfit: 16.73,
    estRoi: 62,
    salesVelocity: 'Very High (Hours)',
    arbitrageVerdict: '⚡ HIGH VELOCITY FLIP: Buys at $26.98, sells within 4 hours on eBay/Mercari/Amazon at $50-$55.',
  },
  {
    id: 'bench-lego-star-wars-salvage',
    title: 'LEGO Star Wars Ghost & Phantom II Building Set (75357)',
    upc: '673419376976',
    sku: '6427702',
    brand: 'LEGO',
    category: 'Toys & Collectibles',
    sourceStore: 'Target 70% Floor Salvage (.04 Ending)',
    sourcePrice: 47.98,
    prices: [
      {
        storeName: 'Amazon FBA',
        storeType: 'Online Marketplace',
        price: 179.99,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 31.50,
        netPayout: 148.49,
        directUrl: 'https://www.amazon.com/s?k=673419376976',
        notes: 'BSR #3,210 in Toys & Games • High collector investment index',
        isHighestSell: true,
      },
      {
        storeName: 'eBay Solds',
        storeType: 'Online Marketplace',
        price: 159.00,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 21.07,
        netPayout: 137.93,
        directUrl: 'https://www.ebay.com/sch/i.html?_nkw=673419376976&LH_Sold=1&LH_Complete=1',
        notes: 'Consistent $155-$165 sold comp range with buyer-paid shipping',
      },
      {
        storeName: 'Walmart.com',
        storeType: 'Online Marketplace',
        price: 159.99,
        condition: 'New / Sealed',
        availability: 'In Stock',
        directUrl: 'https://www.walmart.com/search?q=673419376976',
        notes: 'Online full retail price through Walmart Marketplace',
      },
      {
        storeName: 'Target In-Store',
        storeType: 'In-Store Clearance',
        price: 47.98,
        condition: 'In-Store Clearance',
        availability: 'Limited Stock',
        directUrl: 'https://www.target.com/s?searchTerm=673419376976',
        notes: 'DPCI 204-00-1849 • Ending in .04 floor salvage or .98 70% cut',
        isLowestBuy: true,
      },
    ],
    lowestBuyStore: 'Target Clearance',
    lowestBuyPrice: 47.98,
    highestSellStore: 'Amazon FBA',
    highestSellPrice: 179.99,
    grossSpread: 132.01,
    estNetProfit: 100.51,
    estRoi: 209,
    salesVelocity: 'High (1-3 Days)',
    arbitrageVerdict: '🚀 MASSIVE TOY SPREAD: Target clearance at $47.98 versus Amazon FBA $180. Net profit exceeds $100 per box.',
  },
  {
    id: 'bench-dyson-v8',
    title: 'Dyson V8 Cordless Vacuum Cleaner with Fluffy Optic Cleaner Head',
    upc: '885609028912',
    sku: 'DYS-V8-SLIM',
    brand: 'Dyson',
    category: 'Home Appliances',
    sourceStore: 'Target Secret Clearance',
    sourcePrice: 125.04,
    prices: [
      {
        storeName: 'Amazon FBA',
        storeType: 'Online Marketplace',
        price: 389.00,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 64.18,
        netPayout: 324.82,
        directUrl: 'https://www.amazon.com/s?k=885609028912',
        notes: 'High BSR velocity in Vacuums • Instant Buy Box buy',
        isHighestSell: true,
      },
      {
        storeName: 'eBay Solds',
        storeType: 'Online Marketplace',
        price: 329.00,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 43.59,
        netPayout: 285.41,
        directUrl: 'https://www.ebay.com/sch/i.html?_nkw=885609028912&LH_Sold=1&LH_Complete=1',
        notes: 'Top searched vacuum model with fast 48h turnaround',
      },
      {
        storeName: 'The Home Depot',
        storeType: 'Retail MSRP',
        price: 419.00,
        condition: 'New / Sealed',
        availability: 'In Stock',
        directUrl: 'https://www.homedepot.com/s/885609028912',
        notes: 'Full home improvement retail pricing',
      },
      {
        storeName: 'Target In-Store',
        storeType: 'In-Store Clearance',
        price: 125.04,
        condition: 'In-Store Clearance',
        availability: 'Limited Stock',
        directUrl: 'https://www.target.com/s?searchTerm=885609028912',
        notes: 'Secret tag ending in .04 final salvage write-off',
        isLowestBuy: true,
      },
    ],
    lowestBuyStore: 'Target (.04 Salvage)',
    lowestBuyPrice: 125.04,
    highestSellStore: 'Amazon FBA',
    highestSellPrice: 389.00,
    grossSpread: 263.96,
    estNetProfit: 199.78,
    estRoi: 160,
    salesVelocity: 'High (1-3 Days)',
    arbitrageVerdict: '💎 PREMIUM FLIP: $125 Target .04 salvage into $389 Amazon Buy Box yields ~$200 clean margin.',
  },
  {
    id: 'bench-closetmaid-penny',
    title: 'ClosetMaid 6-Cube Storage Organizer with Fabric Bins (Dark Cherry)',
    upc: '075381028394',
    sku: '1004829104',
    brand: 'ClosetMaid',
    category: 'Storage & Organization',
    sourceStore: 'The Home Depot (1¢ Penny Ring)',
    sourcePrice: 0.01,
    prices: [
      {
        storeName: 'Amazon FBA',
        storeType: 'Online Marketplace',
        price: 58.99,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 15.35,
        netPayout: 43.64,
        directUrl: 'https://www.amazon.com/s?k=075381028394',
        notes: 'Furniture shipping fees apply; recommended for Amazon Merchant Fulfilled or Local Pickup',
      },
      {
        storeName: 'eBay Solds',
        storeType: 'Online Marketplace',
        price: 49.95,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 7.02,
        netPayout: 42.93,
        directUrl: 'https://www.ebay.com/sch/i.html?_nkw=075381028394&LH_Sold=1&LH_Complete=1',
        notes: 'Solid local pickup or regional shipping comp',
        isHighestSell: true,
      },
      {
        storeName: 'Walmart.com',
        storeType: 'Retail MSRP',
        price: 44.88,
        condition: 'New / Sealed',
        availability: 'In Stock',
        directUrl: 'https://www.walmart.com/search?q=075381028394',
        notes: 'Comparable Mainstays 6-cube benchmark',
      },
      {
        storeName: 'The Home Depot In-Store',
        storeType: 'Penny Drop',
        price: 0.01,
        condition: 'Clearance As-Is',
        availability: 'Limited Stock',
        directUrl: 'https://www.homedepot.com/s/1004829104',
        notes: 'Verified 1¢ penny list item. SKU dropped to $0.01 at register.',
        isLowestBuy: true,
      },
    ],
    lowestBuyStore: 'The Home Depot (1¢ Penny)',
    lowestBuyPrice: 0.01,
    highestSellStore: 'Amazon / eBay',
    highestSellPrice: 58.99,
    grossSpread: 58.98,
    estNetProfit: 43.63,
    estRoi: 436300,
    salesVelocity: 'Medium (1-2 Weeks)',
    arbitrageVerdict: '🎯 1¢ PENNY ARBITRAGE: Paid one single cent at Home Depot. Pure profit flip of $40+ on Facebook Marketplace or eBay.',
  },
  {
    id: 'bench-shark-robot',
    title: 'Shark ION Robot Vacuum Wi-Fi Connected with Multi-Surface Brushroll',
    upc: '622356592810',
    sku: '59281029',
    brand: 'Shark',
    category: 'Home Appliances',
    sourceStore: 'Walmart Secret Markdown',
    sourcePrice: 89.00,
    prices: [
      {
        storeName: 'Amazon FBA',
        storeType: 'Online Marketplace',
        price: 229.99,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 39.50,
        netPayout: 190.49,
        directUrl: 'https://www.amazon.com/s?k=622356592810',
        notes: 'Steady everyday seller on Amazon • High buyer demand',
        isHighestSell: true,
      },
      {
        storeName: 'eBay Solds',
        storeType: 'Online Marketplace',
        price: 189.00,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 25.04,
        netPayout: 163.96,
        directUrl: 'https://www.ebay.com/sch/i.html?_nkw=622356592810&LH_Sold=1&LH_Complete=1',
        notes: 'Strong sales velocity with free shipping listings',
      },
      {
        storeName: 'Target.com',
        storeType: 'Retail MSRP',
        price: 249.99,
        condition: 'New / Sealed',
        availability: 'In Stock',
        directUrl: 'https://www.target.com/s?searchTerm=622356592810',
        notes: 'Target regular shelf retail price',
      },
      {
        storeName: 'Walmart In-Store',
        storeType: 'In-Store Clearance',
        price: 89.00,
        condition: 'In-Store Clearance',
        availability: 'Limited Stock',
        directUrl: 'https://www.walmart.com/search?q=622356592810',
        notes: 'Shelf tag says $199, scanner rings $89 secret markdown in aisle',
        isLowestBuy: true,
      },
    ],
    lowestBuyStore: 'Walmart Hidden Scan',
    lowestBuyPrice: 89.00,
    highestSellStore: 'Amazon FBA',
    highestSellPrice: 229.99,
    grossSpread: 140.99,
    estNetProfit: 101.49,
    estRoi: 114,
    salesVelocity: 'High (1-3 Days)',
    arbitrageVerdict: '📦 SOLID HOME ARBITRAGE: Walmart secret $89 drop leaves over $100 clean net spread against Amazon FBA.',
  },
  {
    id: 'bench-kobalt-saw',
    title: 'Kobalt 24V Brushless 7-1/4-in Cordless Circular Saw',
    upc: '850005471923',
    sku: '0854319',
    brand: 'Kobalt',
    category: 'Power Tools',
    sourceStore: "Lowe's Final Clearance (.03 Ending)",
    sourcePrice: 29.03,
    prices: [
      {
        storeName: 'Amazon FBA',
        storeType: 'Online Marketplace',
        price: 119.00,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 21.85,
        netPayout: 97.15,
        directUrl: 'https://www.amazon.com/s?k=850005471923',
        notes: 'Contractors buy as replacement backup tools',
        isHighestSell: true,
      },
      {
        storeName: 'eBay Solds',
        storeType: 'Online Marketplace',
        price: 95.00,
        condition: 'New / Sealed',
        availability: 'In Stock',
        feeEst: 12.99,
        netPayout: 82.01,
        directUrl: 'https://www.ebay.com/sch/i.html?_nkw=850005471923&LH_Sold=1&LH_Complete=1',
        notes: '22 completed sales this month',
      },
      {
        storeName: 'The Home Depot',
        storeType: 'Retail MSRP',
        price: 139.00,
        condition: 'New / Sealed',
        availability: 'In Stock',
        directUrl: 'https://www.homedepot.com/s/Kobalt%20circular%20saw',
        notes: 'Comparison against Ryobi/Ridgid brushless tier',
      },
      {
        storeName: "Lowe's In-Store",
        storeType: 'In-Store Clearance',
        price: 29.03,
        condition: 'In-Store Clearance',
        availability: 'Limited Stock',
        directUrl: 'https://www.lowes.com/search?searchTerm=850005471923',
        notes: 'Phase 2 .03 ending. Rock bottom RTV pull price.',
        isLowestBuy: true,
      },
    ],
    lowestBuyStore: "Lowe's (.03 Final Tag)",
    lowestBuyPrice: 29.03,
    highestSellStore: 'Amazon FBA',
    highestSellPrice: 119.00,
    grossSpread: 89.97,
    estNetProfit: 68.12,
    estRoi: 235,
    salesVelocity: 'High (1-3 Days)',
    arbitrageVerdict: '⚡ 235% ROI SPREAD: Lowe’s $29.03 clearance flip into $95-$119 online resale comp.',
  },
];

/**
 * Generates an intelligent cross-store comparison for any scanned code, UPC, or custom title.
 */
export function generateCrossStoreComparison(
  title: string,
  upc: string,
  sourceStore = 'In-Store Scan',
  sourcePrice?: number,
  category = 'General Merchandise',
  brand = 'Retail Brand',
  zipCode = '02745'
): CrossStoreComparison {
  // 1. Check if we match an exact benchmark
  const found = KNOWN_CROSS_STORE_BENCHMARKS.find(
    (b) =>
      (upc && (b.upc === upc || upc.includes(b.upc) || b.upc.includes(upc))) ||
      (b.sku && upc && b.sku.toLowerCase() === upc.toLowerCase()) ||
      b.title.toLowerCase().includes(title.toLowerCase()) ||
      title.toLowerCase().includes(b.title.toLowerCase())
  );

  if (found) {
    const catalogStocks = readStoreCatalogsForStock(
      {
        title: found.title,
        upc: found.upc,
        sku: found.sku,
        category: found.category,
        basePrice: sourcePrice && sourcePrice > 0 ? sourcePrice : found.lowestBuyPrice,
      },
      zipCode
    );

    // If the caller provided a specific purchase price, adjust
    if (sourcePrice && sourcePrice > 0) {
      const gross = found.highestSellPrice - sourcePrice;
      const net = gross - found.highestSellPrice * 0.15 - 5.0;
      const roi = Math.round((net / sourcePrice) * 100);
      return {
        ...found,
        sourcePrice,
        catalogStocks,
        grossSpread: Math.max(0, gross),
        estNetProfit: Math.max(0, net),
        estRoi: roi,
        timestamp: Date.now(),
      };
    }
    return { ...found, catalogStocks, timestamp: Date.now() };
  }

  // 2. Synthesize dynamic realistic cross-store comparisons based on baseline price
  const buyPrice = sourcePrice && sourcePrice > 0 ? sourcePrice : 14.99;
  const urls = buildStoreSearchUrls(title, upc);

  // Reasonable multiplier for clearance sourcing
  const estMSRP = Math.round(buyPrice * (buyPrice < 1 ? 40 : 2.6) * 100) / 100;
  const amazonPrice = Math.round(estMSRP * 0.95 * 100) / 100;
  const ebayPrice = Math.round(estMSRP * 0.82 * 100) / 100;
  const walmartPrice = estMSRP;
  const targetPrice = Math.round(estMSRP * 0.98 * 100) / 100;
  const hdPrice = Math.round(estMSRP * 1.02 * 100) / 100;
  const lowesPrice = Math.round(estMSRP * 1.01 * 100) / 100;

  const amazonFees = Math.round((amazonPrice * 0.15 + 4.5) * 100) / 100;
  const amazonNet = Math.round((amazonPrice - amazonFees) * 100) / 100;

  const ebayFees = Math.round((ebayPrice * 0.1325 + 0.4) * 100) / 100;
  const ebayNet = Math.round((ebayPrice - ebayFees) * 100) / 100;

  const prices: StorePricePoint[] = [
    {
      storeName: 'Amazon FBA',
      storeType: 'Online Marketplace',
      price: amazonPrice,
      condition: 'New / Sealed',
      availability: 'In Stock',
      feeEst: amazonFees,
      netPayout: amazonNet,
      directUrl: urls.amazon,
      notes: 'Estimated Buy Box price & FBA fulfillment fees',
      isHighestSell: true,
    },
    {
      storeName: 'eBay Solds',
      storeType: 'Online Marketplace',
      price: ebayPrice,
      condition: 'New / Sealed',
      availability: 'In Stock',
      feeEst: ebayFees,
      netPayout: ebayNet,
      directUrl: urls.ebaySolds,
      notes: 'Estimated recent 90-day completed sold comp',
    },
    {
      storeName: 'Walmart.com',
      storeType: 'Retail MSRP',
      price: walmartPrice,
      condition: 'New / Sealed',
      availability: 'In Stock',
      directUrl: urls.walmart,
      notes: 'Online national shelf price',
    },
    {
      storeName: 'Target.com',
      storeType: 'Retail MSRP',
      price: targetPrice,
      condition: 'New / Sealed',
      availability: 'In Stock',
      directUrl: urls.target,
      notes: 'Target regular online pricing',
    },
    {
      storeName: 'The Home Depot',
      storeType: 'Retail MSRP',
      price: hdPrice,
      condition: 'New / Sealed',
      availability: 'In Stock',
      directUrl: urls.homeDepot,
      notes: 'Home Depot online catalog',
    },
    {
      storeName: "Lowe's",
      storeType: 'Retail MSRP',
      price: lowesPrice,
      condition: 'New / Sealed',
      availability: 'In Stock',
      directUrl: urls.lowes,
      notes: "Lowe's online catalog",
    },
  ];

  // Add source store entry if known
  prices.push({
    storeName: sourceStore,
    storeType: buyPrice <= 0.04 ? 'Penny Drop' : 'In-Store Clearance',
    price: buyPrice,
    condition: 'In-Store Clearance',
    availability: 'Limited Stock',
    directUrl: urls.googleShopping,
    notes: 'Current local in-store clearance buy price',
    isLowestBuy: true,
  });

  const grossSpread = Math.max(0, Math.round((amazonPrice - buyPrice) * 100) / 100);
  const netProfit = Math.max(0, Math.round((amazonNet - buyPrice) * 100) / 100);
  const roi = Math.round((netProfit / (buyPrice || 1)) * 100);

  const catalogStocks = readStoreCatalogsForStock(
    {
      title,
      upc,
      category,
      basePrice: buyPrice,
    },
    zipCode
  );

  return {
    id: `dyn-scan-${Date.now()}`,
    title,
    upc: upc || 'N/A',
    brand,
    category,
    sourceStore,
    sourcePrice: buyPrice,
    prices,
    catalogStocks,
    lowestBuyStore: sourceStore,
    lowestBuyPrice: buyPrice,
    highestSellStore: 'Amazon FBA',
    highestSellPrice: amazonPrice,
    grossSpread,
    estNetProfit: netProfit,
    estRoi: roi,
    salesVelocity: roi > 100 ? 'High (1-3 Days)' : 'Medium (1-2 Weeks)',
    arbitrageVerdict:
      roi > 70
        ? `🔥 STRONG ARBITRAGE SPREAD: Buy at ${sourceStore} for $${buyPrice.toFixed(2)}, sell on Amazon/eBay for ~$${amazonPrice.toFixed(2)} (+${roi}% ROI).`
        : `⚖️ MODERATE SPREAD: Buy for $${buyPrice.toFixed(2)} against $${amazonPrice.toFixed(2)} market price. Verify shipping weight before purchasing.`,
    timestamp: Date.now(),
  };
}

export function saveScanToHistory(comparison: CrossStoreComparison) {
  try {
    const raw = localStorage.getItem('crossStoreScanHistory');
    const history: CrossStoreComparison[] = raw ? JSON.parse(raw) : [];
    // Deduplicate by title or upc
    const filtered = history.filter(
      (h) => h.upc !== comparison.upc || h.title !== comparison.title
    );
    const updated = [comparison, ...filtered].slice(0, 25);
    localStorage.setItem('crossStoreScanHistory', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save cross store history', e);
  }
}

export function getScanHistory(): CrossStoreComparison[] {
  try {
    const raw = localStorage.getItem('crossStoreScanHistory');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
