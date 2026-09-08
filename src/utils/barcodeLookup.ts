import { DEFAULT_WALMART_SECRET_DEALS } from '../data/defaultWalmartDeals';
import { DEFAULT_DEALSOLDIER_DEALS, DEFAULT_CLOSET_INVENTORY } from '../data/defaultDealSoldierDeals';
import { DEFAULT_POKEMON_DROPS } from '../data/defaultPokemonDrops';
import { DEFAULT_DG_PENNY_DEALS } from '../data/dgPennyDeals';
import { DEFAULT_TARGET_DEALS } from '../data/defaultTargetDeals';
import { DEFAULT_LOWES_DEALS } from '../data/defaultLowesDeals';

export interface BarcodeScanMatch {
  matched: boolean;
  source: 'Walmart' | 'Home Depot' | 'Lowe\'s' | 'Pokemon / TCG' | 'Target' | 'Dollar General' | 'Personal Closet' | 'Generic Barcode';
  title: string;
  sku?: string;
  upc: string;
  store: string;
  category: string;
  regularPrice: number;
  actualPrice: number;
  marketPrice: number;
  discountPct: number;
  isPenny: boolean;
  statusBadge: string;
  locationHint: string;
  tagIntel: string;
  hunterNotes: string;
  stockStatus?: string;
}

export function lookupBarcode(rawCode: string): BarcodeScanMatch | null {
  const code = rawCode.trim().replace(/\s+/g, '');
  if (!code) return null;

  // 1. Check Pokémon TCG Drops
  try {
    const customPoke = localStorage.getItem('dealSoldierPokemonDrops');
    const pokeList = customPoke ? JSON.parse(customPoke) : DEFAULT_POKEMON_DROPS;
    const pokeMatch = pokeList.find(
      (p: any) => p.upc === code || p.sku === code || code.includes(p.upc) || p.upc.includes(code)
    );
    if (pokeMatch) {
      const isClearance = pokeMatch.isHiddenClearance || pokeMatch.dropStatus === 'HIDDEN CLEARANCE';
      return {
        matched: true,
        source: 'Pokemon / TCG',
        title: pokeMatch.name,
        sku: pokeMatch.sku,
        upc: pokeMatch.upc,
        store: pokeMatch.store,
        category: 'Trading Cards',
        regularPrice: pokeMatch.msrp,
        actualPrice: pokeMatch.actualPrice,
        marketPrice: pokeMatch.marketPrice,
        discountPct: Math.round(((pokeMatch.msrp - pokeMatch.actualPrice) / pokeMatch.msrp) * 100) || 0,
        isPenny: false,
        statusBadge: pokeMatch.dropStatus,
        locationHint: pokeMatch.inStoreLocation,
        tagIntel: `Vendor: ${pokeMatch.vendorName} • Rule: ${pokeMatch.purchaseLimit}`,
        hunterNotes: pokeMatch.hunterTips,
        stockStatus: pokeMatch.closestStoreStock?.stockStatus,
      };
    }
  } catch (e) {
    console.error('Error searching pokemon drops', e);
  }

  // 2. Check Walmart Secret Deals
  try {
    const customWm = localStorage.getItem('walmartSecretDeals');
    const wmList = customWm ? JSON.parse(customWm) : DEFAULT_WALMART_SECRET_DEALS;
    const wmMatch = wmList.find(
      (w: any) => w.upc === code || w.sku === code || code.includes(w.upc) || w.upc.includes(code)
    );
    if (wmMatch) {
      return {
        matched: true,
        source: 'Walmart',
        title: wmMatch.title,
        sku: wmMatch.sku,
        upc: wmMatch.upc,
        store: 'Walmart',
        category: wmMatch.category,
        regularPrice: wmMatch.shelfTagPrice,
        actualPrice: wmMatch.actualScanPrice,
        marketPrice: wmMatch.estResellPrice,
        discountPct: wmMatch.discountPct,
        isPenny: wmMatch.actualScanPrice <= 0.03,
        statusBadge: wmMatch.markdownStage,
        locationHint: wmMatch.aisleHint,
        tagIntel: `Hidden markdown: Floor tag says $${wmMatch.shelfTagPrice.toFixed(2)}, system scans at $${wmMatch.actualScanPrice.toFixed(2)}`,
        hunterNotes: wmMatch.hunterTip,
        stockStatus: wmMatch.inStockStoresNearZip?.[0] ? `${wmMatch.inStockStoresNearZip[0].stockQty} in stock` : 'Verified on Floor',
      };
    }
  } catch (e) {
    console.error('Error searching walmart deals', e);
  }

  // 3. Check Home Depot / Deal Soldier
  try {
    const customHd = localStorage.getItem('dealSoldierItems');
    const hdList = customHd ? JSON.parse(customHd) : DEFAULT_DEALSOLDIER_DEALS;
    const hdMatch = hdList.find(
      (h: any) => (h.upc && (h.upc === code || code.includes(h.upc))) || (h.sku && (h.sku === code || code.includes(h.sku)))
    );
    if (hdMatch) {
      return {
        matched: true,
        source: 'Home Depot',
        title: hdMatch.title,
        sku: hdMatch.sku,
        upc: hdMatch.upc || code,
        store: hdMatch.store || 'Home Depot',
        category: hdMatch.category,
        regularPrice: hdMatch.origPrice,
        actualPrice: hdMatch.price,
        marketPrice: hdMatch.estResellPrice,
        discountPct: hdMatch.discountPct,
        isPenny: hdMatch.isPenny || hdMatch.price <= 0.03,
        statusBadge: hdMatch.markdownCode,
        locationHint: hdMatch.aisleBayHint || 'Overhead Top Riser or Clearance Bay',
        tagIntel: `Home Depot Tag Ending: ${hdMatch.markdownCode} (RTV Clearance Phase)`,
        hunterNotes: hdMatch.hunterNotes,
        stockStatus: hdMatch.closestStore?.stockStatus || 'In Stock',
      };
    }
  } catch (e) {
    console.error('Error searching home depot deals', e);
  }

  // 4. Check Target Markdown & Clearance Deals
  try {
    const customTgt = localStorage.getItem('targetClearanceDeals');
    const tgtList = customTgt ? JSON.parse(customTgt) : DEFAULT_TARGET_DEALS;
    const tgtMatch = tgtList.find(
      (t: any) =>
        (t.upc && (t.upc === code || code.includes(t.upc) || t.upc.includes(code))) ||
        (t.dpci && (t.dpci.replace(/-/g, '') === code.replace(/-/g, '') || code.includes(t.dpci)))
    );
    if (tgtMatch) {
      return {
        matched: true,
        source: 'Target',
        title: tgtMatch.title,
        sku: `DPCI: ${tgtMatch.dpci}`,
        upc: tgtMatch.upc,
        store: 'Target',
        category: tgtMatch.department,
        regularPrice: tgtMatch.originalPrice,
        actualPrice: tgtMatch.currentPrice,
        marketPrice: tgtMatch.estResale,
        discountPct: tgtMatch.clearancePercent,
        isPenny: tgtMatch.currentPrice <= 0.04,
        statusBadge: `${tgtMatch.clearancePercent}% OFF (${tgtMatch.priceEnding})`,
        locationHint: tgtMatch.aisleEndcap,
        tagIntel: `Red Sticker Corner: "${tgtMatch.stickerCode}" • Markdown Day: ${tgtMatch.markdownDay} • Ending: ${tgtMatch.priceEnding}`,
        hunterNotes: tgtMatch.hunterNotes,
        stockStatus: tgtMatch.stockStatus,
      };
    }
  } catch (e) {
    console.error('Error searching Target deals', e);
  }

  // 5. Check Lowe's Secret Yellow Tag Clearance
  try {
    const customLowes = localStorage.getItem('lowesClearanceDeals');
    const lowesList = customLowes ? JSON.parse(customLowes) : DEFAULT_LOWES_DEALS;
    const lowesMatch = lowesList.find(
      (l: any) =>
        (l.upc && (l.upc === code || code.includes(l.upc) || l.upc.includes(code))) ||
        (l.itemNumber && (l.itemNumber === code || code.includes(l.itemNumber) || l.itemNumber.includes(code)))
    );
    if (lowesMatch) {
      const isRtv = lowesMatch.priceEnding === '.02' || lowesMatch.priceEnding === '.03';
      return {
        matched: true,
        source: 'Lowe\'s',
        title: lowesMatch.title,
        sku: `Item #${lowesMatch.itemNumber} • Model: ${lowesMatch.modelNumber || 'N/A'}`,
        upc: lowesMatch.upc,
        store: 'Lowe\'s',
        category: lowesMatch.category,
        regularPrice: lowesMatch.originalPrice,
        actualPrice: lowesMatch.currentPrice,
        marketPrice: lowesMatch.estResale,
        discountPct: lowesMatch.discountPct,
        isPenny: false,
        statusBadge: isRtv
          ? `PHASE 2 FINAL RTV (${lowesMatch.priceEnding})`
          : `PHASE 1 CLEARANCE (${lowesMatch.priceEnding})`,
        locationHint: lowesMatch.bayAisle,
        tagIntel: `Yellow Tag: Ends in ${lowesMatch.priceEnding} • Brand: ${lowesMatch.brand} • ${isRtv ? 'Imminent RTV pull!' : 'Active Markdown'}`,
        hunterNotes: lowesMatch.hunterNotes,
        stockStatus: lowesMatch.stockStatus,
      };
    }
  } catch (e) {
    console.error('Error searching Lowe\'s deals', e);
  }

  // 6. Check Dollar General Penny Deals
  try {
    const dgMatch = DEFAULT_DG_PENNY_DEALS.find(
      (d) => d.upc === code || code.includes(d.upc) || d.upc.includes(code)
    );
    if (dgMatch) {
      return {
        matched: true,
        source: 'Dollar General',
        title: dgMatch.name,
        upc: dgMatch.upc,
        store: 'Dollar General',
        category: dgMatch.category,
        regularPrice: dgMatch.origPrice,
        actualPrice: 0.01,
        marketPrice: dgMatch.estResell,
        discountPct: 99,
        isPenny: true,
        statusBadge: `1¢ Penny (${dgMatch.tagSymbol})`,
        locationHint: 'Overhead sky-shelves, back clearance cart, or bottom toy risers',
        tagIntel: `Dollar General Penny Marker: ${dgMatch.tagSymbol}. Register drops to $0.01.`,
        hunterNotes: 'Do not ask employees to price-check. Cashier must honor 1¢ ring-up per DG policy.',
        stockStatus: 'Tuesday Penny Target',
      };
    }
  } catch (e) {
    console.error('Error searching dg penny deals', e);
  }

  // 5. Check Personal Closet
  try {
    const customCloset = localStorage.getItem('dealSoldierCloset');
    const closetList = customCloset ? JSON.parse(customCloset) : DEFAULT_CLOSET_INVENTORY;
    const closetMatch = closetList.find(
      (c: any) => (c.upc && c.upc === code) || (c.sku && c.sku === code)
    );
    if (closetMatch) {
      return {
        matched: true,
        source: 'Personal Closet',
        title: closetMatch.title,
        sku: closetMatch.sku,
        upc: closetMatch.upc || code,
        store: closetMatch.sourceStore || 'My Inventory',
        category: closetMatch.category,
        regularPrice: closetMatch.estValue,
        actualPrice: closetMatch.purchaseCost,
        marketPrice: closetMatch.targetSalePrice,
        discountPct: Math.round(((closetMatch.estValue - closetMatch.purchaseCost) / closetMatch.estValue) * 100) || 0,
        isPenny: closetMatch.purchaseCost <= 0.03,
        statusBadge: `In Closet (${closetMatch.storageBinLocation})`,
        locationHint: `Your Storage Bin: ${closetMatch.storageBinLocation}`,
        tagIntel: `Condition: ${closetMatch.condition} • Purchased at: ${closetMatch.sourceStore}`,
        hunterNotes: closetMatch.notes || 'From personal inventory.',
        stockStatus: `${closetMatch.quantity} in inventory`,
      };
    }
  } catch (e) {
    console.error('Error searching personal closet', e);
  }

  // Unmatched Barcode - Generate intelligent analysis based on UPC length & prefix
  return {
    matched: false,
    source: 'Generic Barcode',
    title: `Scanned Item (UPC: ${code})`,
    upc: code,
    store: 'Unknown Retailer',
    category: 'Scanned Merchandise',
    regularPrice: 0,
    actualPrice: 0,
    marketPrice: 0,
    discountPct: 0,
    isPenny: false,
    statusBadge: 'Unindexed Barcode',
    locationHint: 'Check shelf tag for price ending (.01, .02, .03, .00)',
    tagIntel: 'Not in local penny database. Use online comp buttons below to lookup sold comps.',
    hunterNotes: 'You can quickly log this item as a new find into your Sourcing Cart or Closet.',
  };
}
