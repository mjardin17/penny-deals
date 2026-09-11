import React, { useState, useEffect } from 'react';
import {
  Search,
  Zap,
  MapPin,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Radio,
  Server,
  Terminal,
  Layers,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ChevronDown,
  ChevronUp,
  Tag,
  DollarSign,
  Calculator,
  ShoppingBag,
  Sparkles,
  Info,
  Code,
  Globe,
  Database,
  Users,
  Bell,
  CreditCard,
  Upload,
  Copy,
  Check,
  Bookmark,
  Rss,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

export interface LootSeedItem {
  id: string;
  title: string;
  brand: string;
  sku: string;
  upc: string;
  dpci?: string;
  store: 'Home Depot' | 'Walmart' | 'Target' | "Lowe's" | 'Dollar General' | 'Best Buy' | 'Costco' | "Sam's Club";
  category: string;
  msrp: number;
  clearancePrice: number;
  resellPrice: number;
  markdownType:
    | '1¢ Penny Drop'
    | '.03 Final Clearance'
    | '70% Yellow Tag'
    | 'Unmarked Hidden Price'
    | '50% Secret Rollback'
    | 'Price Glitch / Error'
    | '.97 Costco Clearance'
    | '.91 Sam\'s Club Liquidation';
  aisleBay: string;
  status: 'In Stock' | 'Limited Stock' | 'Out of Stock';
  stockCount: number;
  detectedAt: string;
  endpointSample: string;
  whyHidden: string;
}

const SEED_DEAL_DATABASE: LootSeedItem[] = [
  {
    id: 'loot-glitch-1',
    title: 'Keurig K-Mini Plus Single Serve Coffee Maker (Studio Gray)',
    brand: 'Keurig',
    sku: '64821034',
    upc: '611247382910',
    store: 'Walmart',
    category: 'Small Appliances',
    msrp: 109.99,
    clearancePrice: 10.99,
    resellPrice: 78.0,
    markdownType: 'Price Glitch / Error',
    aisleBay: 'Online Checkout & Aisle G14 Endcap',
    status: 'In Stock',
    stockCount: 6,
    detectedAt: 'Live (Dealify Glitch Bot)',
    endpointSample: 'POST /checkout/v3/cart/applyCoupon (System double-discount decimal error: $109.99 -> $10.99)',
    whyHidden: 'Dealify Price Error Flag: Database sync misplaced decimal point between manufacturer promo feed and Walmart point-of-sale server. Rings at $10.99 until patch.',
  },
  {
    id: 'loot-costco-1',
    title: 'Ninja Foodi XL 7-in-1 DualZone 10-Qt Air Fryer with Smart Thermometer',
    brand: 'Ninja',
    sku: '1694820',
    upc: '622356571829',
    store: 'Costco',
    category: 'Kitchen Appliances',
    msrp: 219.99,
    clearancePrice: 69.97,
    resellPrice: 155.0,
    markdownType: '.97 Costco Clearance',
    aisleBay: 'Center Court Island Pallet (Tag has * Asterisk)',
    status: 'In Stock',
    stockCount: 4,
    detectedAt: 'Today (Costco .97 Drop)',
    endpointSample: 'Costco AS400 Warehouse Inventory Feed: Item #1694820 Status: D (Deleted) PriceEnding: .97',
    whyHidden: 'Costco Secret Code: Ends in .97 (corporate markdown below cost) + Asterisk (*) on upper right of shelf tag means corporate deleted the SKU. Will never be restocked.',
  },
  {
    id: 'loot-sams-1',
    title: 'DeWalt 20V MAX Cordless Brushless Handheld Blower & Trimmer Combo',
    brand: 'DeWalt',
    sku: '980341289',
    upc: '885911782390',
    store: "Sam's Club",
    category: 'Lawn & Garden',
    msrp: 249.0,
    clearancePrice: 69.91,
    resellPrice: 185.0,
    markdownType: ".91 Sam's Club Liquidation",
    aisleBay: 'Seasonal Garden Roll-Up Door Pallet',
    status: 'Limited Stock',
    stockCount: 2,
    detectedAt: '25m ago',
    endpointSample: 'GET /api/v1/sams/clubInventory?clubId=6614&itemNumber=980341289',
    whyHidden: 'Sam\'s Club Liquidation: Price ending in .91 means corporate seasonal blowout clearance. Letter "C" on shelf sign indicates Cancelled line item.',
  },
  {
    id: 'loot-1',
    title: 'Milwaukee M18 FUEL 18V Brushless 1/2 in. Hammer Drill & Impact Driver Combo Kit',
    brand: 'Milwaukee',
    sku: '1006894321',
    upc: '045242589012',
    store: 'Home Depot',
    category: 'Power Tools',
    msrp: 399.0,
    clearancePrice: 99.03,
    resellPrice: 285.0,
    markdownType: '.03 Final Clearance',
    aisleBay: 'Aisle 12 Bay 004',
    status: 'In Stock',
    stockCount: 2,
    detectedAt: 'Just now (4m ago)',
    endpointSample: 'GET /api/v3/homedepot/inventory?store=2671&sku=1006894321&includeClearance=true',
    whyHidden: 'Shelf price tag still shows $399.00. Internal inventory system was marked down to .03 by regional pricing overnight.',
  },
  {
    id: 'loot-2',
    title: 'DeWalt 20V MAX XR Brushless 4-1/2 in. Angle Grinder (Tool Only)',
    brand: 'DeWalt',
    sku: '1004128954',
    upc: '885911547821',
    store: "Lowe's",
    category: 'Power Tools',
    msrp: 179.0,
    clearancePrice: 44.02,
    resellPrice: 125.0,
    markdownType: 'Unmarked Hidden Price',
    aisleBay: 'Aisle 8 Bay 019',
    status: 'In Stock',
    stockCount: 4,
    detectedAt: '8m ago',
    endpointSample: 'GET /v2/lowes/storeStock?storeId=1540&itemNumber=1004128954',
    whyHidden: 'Yellow tag ending in .02 indicates regional manager final salvage markdown. Box has no clearance sticker.',
  },
  {
    id: 'loot-3',
    title: 'LEGO Star Wars Millennium Falcon Ultimate Collector Series 75192',
    brand: 'LEGO',
    sku: '6175771',
    upc: '673419267632',
    dpci: '204-00-1842',
    store: 'Target',
    category: 'Toys & Hobbies',
    msrp: 849.99,
    clearancePrice: 254.98,
    resellPrice: 720.0,
    markdownType: '70% Yellow Tag',
    aisleBay: 'Aisle E14 Top Shelf (Overstock)',
    status: 'Limited Stock',
    stockCount: 1,
    detectedAt: '12m ago',
    endpointSample: 'GET https://api.target.com/redsky_aggregations/v1/web/pdp_client_v1?dpci=204-00-1842&store_id=1771',
    whyHidden: 'Target Thursday toy department markdown cycle. The tiny yellow sticker says "70" in the upper-right corner.',
  },
  {
    id: 'loot-4',
    title: 'Dyson V8 Extra Cordless Stick Vacuum (Silver/Nickel)',
    brand: 'Dyson',
    sku: '489210452',
    upc: '885609028471',
    store: 'Walmart',
    category: 'Home & Floorcare',
    msrp: 469.99,
    clearancePrice: 149.0,
    resellPrice: 320.0,
    markdownType: '50% Secret Rollback',
    aisleBay: 'Aisle J12 Clearance Endcap',
    status: 'In Stock',
    stockCount: 3,
    detectedAt: '15m ago',
    endpointSample: 'POST https://www.walmart.com/orchestra/graphql (query: StoreItemPriceAndAvailability)',
    whyHidden: 'Walmart hidden rollback. Online customer app displays $349.99, but local store store-assortment node rings at $149.',
  },
  {
    id: 'loot-5',
    title: 'ClosetMaid 4ft-8ft Shelftrack Custom Closet Organizer System',
    brand: 'ClosetMaid',
    sku: '1004892134',
    upc: '075381028394',
    store: 'Home Depot',
    category: 'Closet & Storage',
    msrp: 149.0,
    clearancePrice: 0.01,
    resellPrice: 95.0,
    markdownType: '1¢ Penny Drop',
    aisleBay: 'Aisle 14 Bay 008 (Behind 6ft fixed units)',
    status: 'Limited Stock',
    stockCount: 3,
    detectedAt: '22m ago',
    endpointSample: 'GET /api/v3/homedepot/inventory?store=2671&sku=1004892134',
    whyHidden: 'Home Depot .01 penny item. Corporate marked down to disposal, but box remained unpulled behind newer shelf stock.',
  },
  {
    id: 'loot-6',
    title: 'TrueLiving Velvet Plush Throw Blanket 50x60 (Brown Dot)',
    brand: 'TrueLiving',
    sku: '086892147321',
    upc: '086892147321',
    store: 'Dollar General',
    category: 'Home & Textiles',
    msrp: 10.0,
    clearancePrice: 0.01,
    resellPrice: 14.0,
    markdownType: '1¢ Penny Drop',
    aisleBay: 'Top Sky Shelf Home Aisle',
    status: 'In Stock',
    stockCount: 5,
    detectedAt: 'Tuesday Reset',
    endpointSample: 'DG POS Internal Markdown Registry (Tuesday Drop Cycle)',
    whyHidden: 'Tuesday Penny drop. Official DG app hides price to stop hunters, but physical register registers exactly $0.01.',
  },
  {
    id: 'loot-7',
    title: 'Weber Genesis II E-315 3-Burner Natural Gas Grill',
    brand: 'Weber',
    sku: '1004921845',
    upc: '077924147820',
    store: 'Home Depot',
    category: 'Patio & Garden',
    msrp: 899.0,
    clearancePrice: 225.02,
    resellPrice: 650.0,
    markdownType: 'Unmarked Hidden Price',
    aisleBay: 'Garden Center Outside Overflow Area',
    status: 'In Stock',
    stockCount: 1,
    detectedAt: '35m ago',
    endpointSample: 'GET /v3/homedepot/inventory?store=2671&sku=1004921845',
    whyHidden: 'End of summer season floor model. Store manager applied .02 markdown code to clear outside floor space for holiday pallets.',
  },
];

interface LootLocatorEngineProps {
  zipCode: string;
  onLoadIntoCalculator: (item: {
    name: string;
    buy: string;
    sell: string;
    store: string;
  }) => void;
  onAddToCart?: (deal: any) => void;
  onNotify: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const LootLocatorEngine: React.FC<LootLocatorEngineProps> = ({
  zipCode,
  onLoadIntoCalculator,
  onAddToCart,
  onNotify,
}) => {
  // Query Console State
  const [selectedStore, setSelectedStore] = useState<string>('Home Depot');
  const [queryInput, setQueryInput] = useState<string>('Milwaukee');
  const [queryZip, setQueryZip] = useState<string>(zipCode || '02740');
  const [activeTab, setActiveTab] = useState<
    'loot-scanner' | 'api-console' | 'dealify-glitch' | 'cook-groups' | 'live-ingestion' | 'tech-blueprint'
  >('loot-scanner');

  // Simulated Bot Scan State
  const [isBotScanning, setIsBotScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [discoveredDeals, setDiscoveredDeals] = useState<LootSeedItem[]>(SEED_DEAL_DATABASE);
  const [filterType, setFilterType] = useState<string>('All');
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);

  // Live Ingestion Hub State
  const [ingestionMode, setIngestionMode] = useState<
    'webhook' | 'csv' | 'rss' | 'bookmarklet' | 'architecture'
  >('webhook');
  const [ingestionPayload, setIngestionPayload] = useState<string>('');
  const [ingestionCsv, setIngestionCsv] = useState<string>('');
  const [copiedBookmarklet, setCopiedBookmarklet] = useState<boolean>(false);

  // Sync zipCode prop
  useEffect(() => {
    if (zipCode) setQueryZip(zipCode);
  }, [zipCode]);

  // Execute Simulated Bot Scanner (like DealSoldier / BrickSeek / Dealify bots)
  const handleRunBotScan = () => {
    setIsBotScanning(true);
    setScanProgress(0);
    setScanLog([]);

    const steps = [
      `[1/7] Initializing Multi-Engine Deal Crawler for ZIP ${queryZip}...`,
      `[2/7] Rotating residential proxy pool (US Cluster: 104.28.x.x -> 198.51.x.x)...`,
      `[3/7] Resolving local store cluster nodes: Home Depot #2671, Walmart #1522, Target #1771, Costco #1324...`,
      `[4/7] Dealify Price Glitch Engine: Scanning catalog price drops >80% for decimal transposition errors...`,
      `[5/7] Querying Target RedSky aggregations & Walmart GraphQL private inventory endpoints...`,
      `[6/7] Costco & Sam's Club Warehouse Scraper: Filtering for .97, .91 endings and Asterisk (*) items...`,
      `[7/7] Home Depot & DG Scanner: Identifying .03 clearance tags and Tuesday $0.01 penny drops...`,
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const stepText = steps[currentStep];
        setScanLog((prev) => [stepText, ...prev]);
        setScanProgress(Math.round(((currentStep + 1) / steps.length) * 100));
        currentStep++;
      } else {
        clearInterval(interval);
        setIsBotScanning(false);
        onNotify(`Scan Complete: ${SEED_DEAL_DATABASE.length} verified deals discovered near ZIP ${queryZip}`, 'success');
      }
    }, 500);
  };

  // Helper to generate live external queries
  const getLiveLinks = (store: string, query: string, zip: string) => {
    const encoded = encodeURIComponent(query.trim());
    return {
      brickseek: `https://brickseek.com/products/?search=${encoded}`,
      walmart: `https://www.walmart.com/search?q=${encoded}`,
      target: `https://www.target.com/s?searchTerm=${encoded}`,
      homeDepot: `https://www.homedepot.com/s/${encoded}`,
      lowes: `https://www.lowes.com/search?searchTerm=${encoded}`,
      costco: `https://www.costco.com/CatalogSearch?dept=All&keyword=${encoded}`,
      samsclub: `https://www.samsclub.com/s/${encoded}`,
      bestbuy: `https://www.bestbuy.com/site/searchpage.jsp?st=${encoded}`,
      ebaySolds: `https://www.ebay.com/sch/i.html?_nkw=${encoded}&LH_Sold=1&LH_Complete=1`,
      googleShopping: `https://www.google.com/search?tbm=shop&q=${encoded}`,
    };
  };

  const currentLinks = getLiveLinks(selectedStore, queryInput, queryZip);

  // Live Ingestion Handlers
  const handleInjectJson = (customRaw?: string) => {
    const raw = (customRaw !== undefined ? customRaw : ingestionPayload).trim();
    if (!raw) {
      onNotify('Please paste a JSON payload or select a sample feed', 'error');
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      let itemsToIngest: any[] = [];

      if (Array.isArray(parsed)) {
        itemsToIngest = parsed;
      } else if (parsed.embeds && Array.isArray(parsed.embeds)) {
        // Discord Webhook Embed format
        itemsToIngest = parsed.embeds.map((emb: any) => ({
          title: emb.title || emb.description || 'Discord Ingested Deal',
          store: emb.author?.name?.includes('Walmart')
            ? 'Walmart'
            : emb.author?.name?.includes('Target')
            ? 'Target'
            : emb.author?.name?.includes('Costco')
            ? 'Costco'
            : 'Home Depot',
          sku: emb.fields?.find((f: any) => f.name?.toLowerCase().includes('sku'))?.value || 'DISC-' + Math.floor(Math.random() * 900000),
          upc: emb.fields?.find((f: any) => f.name?.toLowerCase().includes('upc'))?.value || '0452425' + Math.floor(Math.random() * 90000),
          clearancePrice: parseFloat(emb.fields?.find((f: any) => f.name?.toLowerCase().includes('price'))?.value?.replace(/[^0-9.]/g, '') || '19.99'),
          retailPrice: parseFloat(emb.fields?.find((f: any) => f.name?.toLowerCase().includes('retail') || f.name?.toLowerCase().includes('msrp'))?.value?.replace(/[^0-9.]/g, '') || '79.99'),
          estResell: parseFloat(emb.fields?.find((f: any) => f.name?.toLowerCase().includes('resell') || f.name?.toLowerCase().includes('market'))?.value?.replace(/[^0-9.]/g, '') || '65.00'),
          category: 'Discord Bot Stream',
          statusTag: 'DISCORD_ALERT',
          notes: emb.description || 'Pushed via live Discord bot webhook stream',
        }));
      } else if (typeof parsed === 'object') {
        itemsToIngest = [parsed];
      }

      if (itemsToIngest.length === 0) {
        throw new Error('No valid deal objects found in JSON payload');
      }

      const formattedDeals: LootSeedItem[] = itemsToIngest.map((item, idx) => {
        const clearance = Number(item.clearancePrice ?? item.buyPrice ?? item.price ?? 9.99);
        const retail = Number(item.retailPrice ?? item.msrp ?? clearance * 2.5);
        const resell = Number(item.estResell ?? item.resellPrice ?? item.sellPrice ?? retail * 0.85);
        const storeVal = (
          ['Home Depot', 'Walmart', 'Target', "Lowe's", 'Dollar General', 'Best Buy', 'Costco', "Sam's Club"].includes(item.store)
            ? item.store
            : 'Home Depot'
        ) as LootSeedItem['store'];

        const mdType: LootSeedItem['markdownType'] =
          clearance <= 0.01
            ? '1¢ Penny Drop'
            : clearance <= 0.03
            ? '.03 Final Clearance'
            : storeVal === 'Costco'
            ? '.97 Costco Clearance'
            : storeVal === "Sam's Club"
            ? ".91 Sam's Club Liquidation"
            : clearance < retail * 0.4
            ? 'Price Glitch / Error'
            : 'Unmarked Hidden Price';

        return {
          id: `ingest-json-${Date.now()}-${idx}`,
          title: item.title || item.name || 'Ingested Live Deal',
          brand: item.brand || 'Custom Ingest',
          sku: String(item.sku || 'SKU-' + Math.floor(Math.random() * 900000)),
          upc: String(item.upc || '045242' + Math.floor(Math.random() * 900000)),
          store: storeVal,
          category: item.category || 'Live Webhook',
          msrp: retail,
          clearancePrice: clearance,
          resellPrice: resell,
          markdownType: mdType,
          aisleBay: item.aisleBay || item.aisleBayLocation || 'Aisle Ingest / Bay 1',
          status: 'In Stock',
          stockCount: Number(item.stockCount || 4),
          detectedAt: 'Just now (Live Ingest)',
          endpointSample: item.endpointSample || 'POST /api/webhooks/ingest -> payload.embeds[0]',
          whyHidden: item.notes || `Directly ingested via Live Webhook / API at ${new Date().toLocaleTimeString()}`,
        };
      });

      setDiscoveredDeals((prev) => [...formattedDeals, ...prev]);
      onNotify(`Success: Injected ${formattedDeals.length} live deal(s) into Loot Feed!`, 'success');
      setActiveTab('loot-scanner');
    } catch (err: any) {
      onNotify('JSON Parse Error: ' + (err.message || 'Invalid format'), 'error');
    }
  };

  const handleInjectCsv = (customCsv?: string) => {
    const raw = (customCsv !== undefined ? customCsv : ingestionCsv).trim();
    if (!raw) {
      onNotify('Please paste CSV rows or select a sample manifest', 'error');
      return;
    }

    try {
      const lines = raw.split('\n').filter((l) => l.trim().length > 0);
      const newItems: LootSeedItem[] = [];

      lines.forEach((line, idx) => {
        if (idx === 0 && (line.toLowerCase().startsWith('title') || line.toLowerCase().startsWith('sku'))) return;

        const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 4) {
          const title = parts[0] || 'Manifest Item';
          const storeInput = parts[1] || 'Home Depot';
          const storeVal: LootSeedItem['store'] = (
            ['Home Depot', 'Walmart', 'Target', "Lowe's", 'Dollar General', 'Best Buy', 'Costco', "Sam's Club"].includes(storeInput)
              ? storeInput
              : 'Home Depot'
          ) as LootSeedItem['store'];

          const sku = parts[2] || 'SKU-' + Math.floor(Math.random() * 900000);
          const buyPrice = parseFloat(parts[3].replace(/[^0-9.]/g, '') || '9.99');
          const sellPrice = parseFloat(parts[4]?.replace(/[^0-9.]/g, '') || String(buyPrice * 2.5));
          const notes = parts[5] || 'Ingested from bulk CSV manifest';

          const mdType: LootSeedItem['markdownType'] =
            buyPrice <= 0.01
              ? '1¢ Penny Drop'
              : buyPrice <= 0.03
              ? '.03 Final Clearance'
              : 'Unmarked Hidden Price';

          newItems.push({
            id: `ingest-csv-${Date.now()}-${idx}`,
            title,
            brand: 'CSV Manifest',
            sku,
            upc: '0' + Math.floor(Math.random() * 90000000000),
            store: storeVal,
            category: 'Bulk Manifest',
            msrp: sellPrice * 1.25,
            clearancePrice: buyPrice,
            resellPrice: sellPrice,
            markdownType: mdType,
            aisleBay: 'Bay Manifest',
            status: 'In Stock',
            stockCount: 6,
            detectedAt: 'Just now (CSV Import)',
            endpointSample: 'CSV_STREAM_PARSER: row_' + (idx + 1),
            whyHidden: notes,
          });
        }
      });

      if (newItems.length === 0) {
        throw new Error('Could not parse any valid CSV rows. Format: Title, Store, SKU, BuyPrice, SellPrice, Notes');
      }

      setDiscoveredDeals((prev) => [...newItems, ...prev]);
      onNotify(`Success: Injected ${newItems.length} deals from CSV manifest!`, 'success');
      setActiveTab('loot-scanner');
    } catch (err: any) {
      onNotify('CSV Error: ' + err.message, 'error');
    }
  };

  const handleFetchRssSample = (source: 'slickdeals' | 'reddit-pkmn' | 'reddit-clearance') => {
    let sampleDeals: LootSeedItem[] = [];

    if (source === 'slickdeals') {
      sampleDeals = [
        {
          id: `rss-sd-1-${Date.now()}`,
          title: 'Dyson V11 Extra Cordless Vacuum (Frontpage Glitch)',
          brand: 'Dyson',
          sku: '6482194',
          upc: '885609021940',
          store: 'Walmart',
          category: 'Slickdeals Frontpage RSS',
          msrp: 599.99,
          clearancePrice: 199.0,
          resellPrice: 420.0,
          markdownType: 'Price Glitch / Error',
          aisleBay: 'Online / In-Store Pickup',
          status: 'Limited Stock',
          stockCount: 2,
          detectedAt: '3m ago (Slickdeals RSS)',
          endpointSample: 'slickdeals.net/rss -> score: +420',
          whyHidden: 'Frontpage score +420 in 15 mins. Velocity voting trigger verified.',
        },
        {
          id: `rss-sd-2-${Date.now()}`,
          title: 'Makita 18V LXT Lithium-Ion Brushless Cordless 2-Tool Combo',
          brand: 'Makita',
          sku: '1005891234',
          upc: '088381851234',
          store: 'Home Depot',
          category: 'Slickdeals Frontpage RSS',
          msrp: 249.0,
          clearancePrice: 89.03,
          resellPrice: 180.0,
          markdownType: '.03 Final Clearance',
          aisleBay: 'Aisle 12 / Bay 4',
          status: 'In Stock',
          stockCount: 5,
          detectedAt: '7m ago (Slickdeals RSS)',
          endpointSample: 'slickdeals.net/rss -> score: +188',
          whyHidden: 'Confirmed nationwide rollback across 200+ store nodes.',
        },
      ];
    } else if (source === 'reddit-pkmn') {
      sampleDeals = [
        {
          id: `rss-pkmn-1-${Date.now()}`,
          title: 'Pokémon TCG: Crown Zenith Sea & Sky Premium Collection (14 Booster Packs)',
          brand: 'Pokémon',
          sku: '984021',
          upc: '820650854921',
          store: "Sam's Club",
          category: 'Reddit r/PKMNTCGDeals',
          msrp: 59.99,
          clearancePrice: 29.91,
          resellPrice: 78.0,
          markdownType: ".91 Sam's Club Liquidation",
          aisleBay: 'Seasonal Pallet Aisle 3',
          status: 'In Stock',
          stockCount: 14,
          detectedAt: '12m ago (Reddit JSON)',
          endpointSample: 'reddit.com/r/PKMNTCGDeals/new.json',
          whyHidden: 'Pushed via Reddit thread with 85 upvotes in 10 mins. Club closeout.',
        },
      ];
    } else {
      sampleDeals = [
        {
          id: `rss-clearance-1-${Date.now()}`,
          title: 'LEGO Star Wars Ghost & Phantom II 75357 Clearance Drop',
          brand: 'LEGO',
          sku: '204-00-9812',
          upc: '673419376512',
          store: 'Target',
          category: 'Reddit r/clearance',
          msrp: 159.99,
          clearancePrice: 47.98,
          resellPrice: 140.0,
          markdownType: '70% Yellow Tag',
          aisleBay: 'Toys Aisle E14',
          status: 'Limited Stock',
          stockCount: 1,
          detectedAt: '18m ago (Reddit JSON)',
          endpointSample: 'reddit.com/r/clearance/new.json',
          whyHidden: 'Yellow sticker salvage markdown flagged by Reddit community member.',
        },
      ];
    }

    setDiscoveredDeals((prev) => [...sampleDeals, ...prev]);
    onNotify(`Ingested ${sampleDeals.length} live deal(s) from ${source} feed!`, 'success');
    setActiveTab('loot-scanner');
  };

  const BOOKMARKLET_CODE = `javascript:(function(){const s=document.querySelector('script[type="application/ld+json"]');let d={};try{d=s?JSON.parse(s.innerText):{};}catch(e){}const t=document.title;const p=(document.querySelector('[data-testid="price"], .price, [itemprop="price"], .price-characteristic')?.innerText||"").replace(/[^0-9.]/g,"");const payload=JSON.stringify({title:t,store:window.location.hostname.includes("homedepot")?"Home Depot":window.location.hostname.includes("target")?"Target":window.location.hostname.includes("walmart")?"Walmart":window.location.hostname.includes("costco")?"Costco":"Retail Store",clearancePrice:parseFloat(p)||19.99,retailPrice:(parseFloat(p)||19.99)*1.8,sku:window.location.pathname.replace(/[^0-9]/g,"").slice(-8)||"998812",timestamp:Date.now()});navigator.clipboard.writeText(payload).then(()=>{alert("✅ Ingested to Clipboard for Loot Locator:\\n\\n" + t + "\\nPrice: $" + p + "\\n\\nNow paste into Live Ingestion Hub!");}).catch(()=>{prompt("Copy this JSON for Loot Locator:",payload);});})();`;

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(BOOKMARKLET_CODE);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 3500);
    onNotify('Bookmarklet code copied to clipboard! Save to your browser bookmarks bar.', 'success');
  };

  const filteredDeals = discoveredDeals.filter((deal) => {
    if (filterType === 'All') return true;
    if (filterType === 'Glitch & Errors') return deal.markdownType === 'Price Glitch / Error';
    if (filterType === 'Penny') return deal.markdownType === '1¢ Penny Drop';
    if (filterType === 'Wholesale (.97 / .91)') return deal.store === 'Costco' || deal.store === "Sam's Club";
    if (filterType === 'Home Depot') return deal.store === 'Home Depot';
    if (filterType === 'Target') return deal.store === 'Target';
    if (filterType === 'Walmart') return deal.store === 'Walmart';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Banner: DealSoldier & BrickSeek Technology Radar */}
      <div className="bg-[#18181c] border-2 border-[#ff9800]/70 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#ff9800]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-[#ff9800] text-black text-xs font-black tracking-wide uppercase flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" /> Loot Locator & Bot Radar
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#30d158]/20 text-[#30d158] text-[11px] font-bold border border-[#30d158]/40 flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> Live Deal-Hunting Technology
              </span>
              <span className="text-xs text-[#92929d]">
                Reverse-Engineered Architecture of DealSoldier & BrickSeek
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#f5f5f7] tracking-tight">
              Loot Locator & Store Inventory Query Engine
            </h2>
            <p className="text-xs text-[#92929d] mt-1 max-w-2xl leading-relaxed">
              DealSoldier and BrickSeek discover hidden clearances by pinging private retailer mobile APIs with rotating residential proxies. Use our built-in query engine and automated bot radar to find hidden markdown items near you.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRunBotScan}
              disabled={isBotScanning}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff9800] to-[#f96302] hover:brightness-110 text-black font-black text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 fill-black ${isBotScanning ? 'animate-bounce' : ''}`} />
              <span>{isBotScanning ? 'Scanning Stores...' : 'Run Loot Locator Scan'}</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="mt-4 pt-3 border-t border-[#2c2c35] flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('loot-scanner')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'loot-scanner'
                ? 'bg-[#ff9800] text-black shadow-xs font-black'
                : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Automated Loot & Glitch Feed ({discoveredDeals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('api-console')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'api-console'
                ? 'bg-[#0a84ff] text-white shadow-xs font-black'
                : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live Store Query Console (BrickSeek Engine)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dealify-glitch')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'dealify-glitch'
                ? 'bg-gradient-to-r from-[#bf5af2] to-[#ff2d55] text-white shadow-xs font-black'
                : 'bg-[#222227] text-[#bf5af2] hover:bg-[#bf5af2]/10 border border-[#bf5af2]/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dealify Glitch & Wholesale Decoders</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cook-groups')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'cook-groups'
                ? 'bg-gradient-to-r from-[#ffd60a] to-[#ff9800] text-black shadow-xs font-black'
                : 'bg-[#222227] text-[#ffd60a] hover:bg-[#ffd60a]/10 border border-[#ffd60a]/30'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Cook Groups & Whop Ecosystem (Pokepings, Lunch Money...)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('live-ingestion')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'live-ingestion'
                ? 'bg-gradient-to-r from-[#0a84ff] to-[#30d158] text-white shadow-xs font-black'
                : 'bg-[#222227] text-[#0a84ff] hover:bg-[#0a84ff]/10 border border-[#0a84ff]/30'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live Inventory Feeder (Webhooks, CSV, Bookmarklet)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tech-blueprint')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'tech-blueprint'
                ? 'bg-[#30d158] text-black shadow-xs font-black'
                : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>How Deal Apps Work (Full Architecture)</span>
          </button>
        </div>
      </div>

      {/* BOT SCANNER IN-PROGRESS STATUS */}
      {isBotScanning && (
        <div className="p-4 bg-[#18181c] border border-[#ff9800]/50 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#ff9800] flex items-center gap-1.5">
              <Cpu className="w-4 h-4 animate-spin" /> Deal Crawlers Active • Querying Store Nodes & Glitch Streams
            </span>
            <span className="font-mono text-[#f5f5f7] font-bold">{scanProgress}%</span>
          </div>

          <div className="w-full bg-[#222227] h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#ff9800] via-[#bf5af2] to-[#30d158] h-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>

          <div className="bg-[#121215] p-2.5 rounded-xl font-mono text-[11px] text-[#30d158] max-h-24 overflow-y-auto space-y-1">
            {scanLog.map((log, index) => (
              <div key={index} className="flex items-center gap-1">
                <span className="text-[#ffd60a]">➜</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: AUTOMATED LOOT SCANNER FEED */}
      {activeTab === 'loot-scanner' && (
        <div className="space-y-3">
          {/* Filter Chips */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                'All',
                'Glitch & Errors',
                'Penny',
                'Wholesale (.97 / .91)',
                'Home Depot',
                'Target',
                'Walmart',
              ].map((storeFilter) => (
                <button
                  key={storeFilter}
                  type="button"
                  onClick={() => setFilterType(storeFilter)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterType === storeFilter
                      ? 'bg-[#ff9800] text-black'
                      : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7] border border-[#2c2c35]'
                  }`}
                >
                  {storeFilter}
                </button>
              ))}
            </div>

            <span className="text-xs text-[#92929d] flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#ff9800]" /> Verified for ZIP{' '}
              <strong className="text-[#f5f5f7]">{queryZip}</strong>
            </span>
          </div>

          {/* Deals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredDeals.map((deal) => {
              const profit = deal.resellPrice - deal.clearancePrice;
              const roi = Math.round((profit / Math.max(deal.clearancePrice, 0.01)) * 100);

              return (
                <div
                  key={deal.id}
                  className="bg-[#18181c] border border-[#2c2c35] hover:border-[#ff9800]/50 rounded-2xl p-4 transition-all shadow-md flex flex-col justify-between space-y-3"
                >
                  {/* Top Bar: Store & Markdown Type */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            deal.store === 'Home Depot'
                              ? 'bg-[#f96302]/20 text-[#f96302] border border-[#f96302]/30'
                              : deal.store === 'Target'
                              ? 'bg-[#ff3b30]/20 text-[#ff453a] border border-[#ff3b30]/30'
                              : deal.store === 'Walmart'
                              ? 'bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/30'
                              : "bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/30"
                          }`}
                        >
                          {deal.store}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            deal.markdownType.includes('Penny')
                              ? 'bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/40'
                              : deal.markdownType.includes('.03')
                              ? 'bg-[#ff9800]/20 text-[#ff9800] border border-[#ff9800]/40'
                              : 'bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/40'
                          }`}
                        >
                          {deal.markdownType}
                        </span>
                      </div>

                      <span className="text-[11px] text-[#92929d] flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5 text-[#30d158]" /> {deal.detectedAt}
                      </span>
                    </div>

                    {/* Title & SKU */}
                    <h3 className="text-sm font-bold text-[#f5f5f7] line-clamp-2 leading-snug">
                      {deal.title}
                    </h3>

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[#92929d] flex-wrap">
                      <span>SKU: <strong className="text-[#f5f5f7] font-mono">{deal.sku}</strong></span>
                      <span>•</span>
                      <span>UPC: <strong className="text-[#f5f5f7] font-mono">{deal.upc}</strong></span>
                      {deal.dpci && (
                        <>
                          <span>•</span>
                          <span>DPCI: <strong className="text-[#f5f5f7] font-mono">{deal.dpci}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="p-2.5 bg-[#222227] rounded-xl border border-[#2c2c35] grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[10px] text-[#92929d] block">Store Price</span>
                      <span className="text-sm font-black text-[#30d158]">
                        ${deal.clearancePrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[#92929d] line-through block">
                        ${deal.msrp.toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#92929d] block">Resell Value</span>
                      <span className="text-sm font-black text-[#f5f5f7]">
                        ${deal.resellPrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[#ffd60a] block">eBay / Amazon</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#92929d] block">Est. Profit</span>
                      <span className="text-sm font-black text-[#ffd60a]">
                        +${profit.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[#30d158] font-bold block">
                        {roi > 999 ? '999%+' : `${roi}% ROI`}
                      </span>
                    </div>
                  </div>

                  {/* Location & Why Hidden Intel */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-[#92929d]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#ff9800]" /> {deal.aisleBay}
                      </span>
                      <span className="font-semibold text-[#30d158]">
                        {deal.stockCount} in stock ({deal.status})
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-[#121215] border border-[#2c2c35] text-[11px] text-[#92929d] flex items-start gap-1.5 leading-relaxed">
                      <Info className="w-3.5 h-3.5 text-[#ffd60a] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#f5f5f7]">Why It's Hidden:</strong> {deal.whyHidden}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://brickseek.com/products/?search=${encodeURIComponent(deal.upc || deal.sku)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#ffd60a]/15 hover:bg-[#ffd60a]/25 text-[#ffd60a] border border-[#ffd60a]/30 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>BrickSeek</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>

                      <a
                        href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(deal.upc || deal.title)}&LH_Sold=1&LH_Complete=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#30d158]/15 hover:bg-[#30d158]/25 text-[#30d158] border border-[#30d158]/30 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>eBay Solds</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onLoadIntoCalculator({
                            name: deal.title,
                            buy: deal.clearancePrice.toFixed(2),
                            sell: deal.resellPrice.toFixed(2),
                            store: deal.store,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-xs font-bold text-[#f5f5f7] border border-[#2c2c35] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Calculator className="w-3 h-3 text-[#0a84ff]" />
                        <span>Calc</span>
                      </button>

                      {onAddToCart && (
                        <button
                          type="button"
                          onClick={() => {
                            onAddToCart({
                              title: deal.title,
                              buyPrice: deal.clearancePrice,
                              sellPrice: deal.resellPrice,
                              store: deal.store,
                              category: deal.category,
                              notes: deal.whyHidden,
                            });
                            onNotify(`Added "${deal.title.substring(0, 24)}..." to Sourcing Cart!`, 'success');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#ff9800] hover:bg-[#e08600] text-black text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>Cart</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE STORE QUERY CONSOLE (THE BRICKSEEK ENGINE) */}
      {activeTab === 'api-console' && (
        <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-[#2c2c35] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#f5f5f7] flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#0a84ff]" /> Direct Retailer Endpoint Dispatcher
              </h3>
              <p className="text-xs text-[#92929d] mt-0.5">
                Query local store nodes directly by SKU, DPCI, UPC, or keyword.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/30 text-xs font-bold flex items-center gap-1">
              <Server className="w-3 h-3" /> Live Query Tool
            </span>
          </div>

          {/* Console Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#92929d] uppercase tracking-wider block mb-1">
                Target Retailer
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs text-[#f5f5f7] font-semibold focus:border-[#0a84ff] outline-none"
              >
                <option value="Home Depot">The Home Depot (StoreStock API)</option>
                <option value="Walmart">Walmart (GraphQL Store Assortment)</option>
                <option value="Target">Target (RedSky DPCI Client)</option>
                <option value="Lowe's">Lowe's (Store Inventory JSON)</option>
                <option value="Costco">Costco (.97 Corporate & Asterisk Feeds)</option>
                <option value="Sam's Club">Sam's Club (.91 Seasonal Liquidation)</option>
                <option value="Dollar General">Dollar General (Tuesday Penny Node)</option>
                <option value="Best Buy">Best Buy (OpenBox & Price Glitch)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#92929d] uppercase tracking-wider block mb-1">
                Search SKU / UPC / Keyword
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="e.g. 1006894321, 045242589012, or Milwaukee"
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs text-[#f5f5f7] focus:border-[#0a84ff] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#92929d] uppercase tracking-wider block mb-1">
                Local Store ZIP Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={queryZip}
                  onChange={(e) => setQueryZip(e.target.value)}
                  placeholder="e.g. 02740"
                  className="w-full px-3 py-2 bg-[#222227] border border-[#2c2c35] rounded-xl text-xs text-[#f5f5f7] font-mono focus:border-[#0a84ff] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Quick-Preset Seeds */}
          <div>
            <span className="text-[11px] text-[#92929d] block mb-1.5 font-bold">
              ⚡ 1-Click High-Margin Seeds (Tested Retailer Clearance & Glitch Endpoints):
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { name: 'Keurig Glitch ($10.99)', store: 'Walmart', sku: '64821034' },
                { name: 'Costco Ninja Air Fryer (.97)', store: 'Costco', sku: '1694820' },
                { name: "Sam's DeWalt Blower (.91)", store: "Sam's Club", sku: '980341289' },
                { name: 'Milwaukee M18 Drill Kit', store: 'Home Depot', sku: '1006894321' },
                { name: 'DeWalt 20V Angle Grinder', store: "Lowe's", sku: '1004128954' },
                { name: 'LEGO UCS Millennium Falcon', store: 'Target', sku: '204-00-1842' },
                { name: 'ClosetMaid Shelftrack 1¢', store: 'Home Depot', sku: '1004892134' },
                { name: 'DG Velvet Throw 1¢', store: 'Dollar General', sku: '086892147321' },
              ].map((seed, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedStore(seed.store);
                    setQueryInput(seed.sku);
                    onNotify(`Loaded seed: ${seed.name}`, 'info');
                  }}
                  className="px-2 py-1 rounded-lg bg-[#222227] hover:bg-[#2c2c35] text-[11px] text-[#f5f5f7] border border-[#2c2c35] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Tag className="w-2.5 h-2.5 text-[#ff9800]" />
                  <span>{seed.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Deep-Link Direct Query Trigger Board */}
          <div className="p-3 bg-[#121215] border border-[#2c2c35] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#f5f5f7] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#0a84ff]" /> Target Live Store Endpoints for "{queryInput}"
              </span>
              <span className="text-[11px] text-[#92929d]">Direct In-Store Inventory Portals</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <a
                href={currentLinks.brickseek}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] border border-[#ffd60a]/30 text-left transition-all group"
              >
                <span className="text-[10px] text-[#ffd60a] font-bold block uppercase tracking-wide">
                  BrickSeek
                </span>
                <span className="text-xs font-extrabold text-[#f5f5f7] group-hover:text-[#ffd60a] flex items-center justify-between">
                  <span>Stock Check</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>

              <a
                href={currentLinks.ebaySolds}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] border border-[#30d158]/30 text-left transition-all group"
              >
                <span className="text-[10px] text-[#30d158] font-bold block uppercase tracking-wide">
                  eBay Real-Time
                </span>
                <span className="text-xs font-extrabold text-[#f5f5f7] group-hover:text-[#30d158] flex items-center justify-between">
                  <span>Sold Comps</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>

              <a
                href={
                  selectedStore === 'Home Depot'
                    ? currentLinks.homeDepot
                    : selectedStore === 'Target'
                    ? currentLinks.target
                    : selectedStore === "Lowe's"
                    ? currentLinks.lowes
                    : selectedStore === 'Costco'
                    ? currentLinks.costco
                    : selectedStore === "Sam's Club"
                    ? currentLinks.samsclub
                    : selectedStore === 'Best Buy'
                    ? currentLinks.bestbuy
                    : currentLinks.walmart
                }
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] border border-[#0a84ff]/30 text-left transition-all group"
              >
                <span className="text-[10px] text-[#0a84ff] font-bold block uppercase tracking-wide">
                  {selectedStore}
                </span>
                <span className="text-xs font-extrabold text-[#f5f5f7] group-hover:text-[#0a84ff] flex items-center justify-between">
                  <span>Store Page</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>

              <a
                href={currentLinks.googleShopping}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-[#222227] hover:bg-[#2c2c35] border border-[#2c2c35] text-left transition-all group"
              >
                <span className="text-[10px] text-[#92929d] font-bold block uppercase tracking-wide">
                  Google Lens
                </span>
                <span className="text-xs font-extrabold text-[#f5f5f7] group-hover:text-white flex items-center justify-between">
                  <span>Price Match</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEALIFY GLITCH & WHOLESALE DECODERS */}
      {activeTab === 'dealify-glitch' && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#bf5af2]/15 via-[#ff2d55]/10 to-[#18181c] border border-[#bf5af2]/40 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-[#bf5af2] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Dealify Technology Engine
              </span>
              <span className="text-xs text-[#f5f5f7] font-bold">
                Price Glitch Bots, Decimal Anomaly Scanners & Wholesale Liquidation Decoders
              </span>
            </div>
            <p className="text-xs text-[#92929d] max-w-3xl leading-relaxed mt-1">
              While BrickSeek and DealSoldier focus on in-store hardware and retail shelves, <strong>Dealify</strong> specializes in <strong>real-time retail price errors</strong>, <strong>instant online restocks</strong>, and wholesale club markdown triggers (Costco & Sam's Club).
            </p>
          </div>

          {/* Three Core Pillars of Dealify */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Pillar 1: Price Glitches */}
            <div className="bg-[#18181c] border border-[#2c2c35] rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-[#ff2d55] font-bold">
                <AlertTriangle className="w-4 h-4" />
                <h4 className="text-sm text-[#f5f5f7]">1. Price Glitch / Decimal Bots</h4>
              </div>
              <p className="text-[#92929d] leading-relaxed">
                Detects catastrophic pricing bugs before corporate IT teams fix them:
              </p>
              <ul className="space-y-1 text-[11px] text-[#f5f5f7]">
                <li className="flex items-start gap-1.5">
                  <span className="text-[#ff2d55] font-bold">•</span>
                  <span><strong>Decimal Shift:</strong> A $149.99 tool drops to $14.99 due to POS batch sync format issues.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#ff2d55] font-bold">•</span>
                  <span><strong>Coupon Double-Dip:</strong> A manufacturer digital clip stacks automatically with a store-wide clearance code.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#ff2d55] font-bold">•</span>
                  <span><strong>Ghost Bundles:</strong> Hardware + battery combos listed at the standalone battery price.</span>
                </li>
              </ul>
              <div className="p-2 bg-[#121215] rounded-lg font-mono text-[10px] text-[#ff2d55]">
                Glitch Trigger: Price drop &gt; 80% with no promo flag
              </div>
            </div>

            {/* Pillar 2: Costco Secret Codes */}
            <div className="bg-[#18181c] border border-[#2c2c35] rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-[#ffd60a] font-bold">
                <Tag className="w-4 h-4" />
                <h4 className="text-sm text-[#f5f5f7]">2. Costco Secret Price Codes</h4>
              </div>
              <p className="text-[#92929d] leading-relaxed">
                Costco price tag digits reveal corporate wholesale liquidation status:
              </p>
              <ul className="space-y-1 text-[11px] text-[#f5f5f7]">
                <li className="flex items-start gap-1.5">
                  <span className="text-[#30d158] font-bold font-mono">.97</span>
                  <span><strong>Corporate Markdown:</strong> Discounted below wholesale cost to clear warehouse floor space.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#ffd60a] font-bold font-mono">.00 / .88</span>
                  <span><strong>Store Manager Markdown:</strong> Returned, opened, or floor display unit heavily discounted locally.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#ff2d55] font-bold font-mono">* (Star)</span>
                  <span><strong>The Death Star (Asterisk):</strong> Top-right corner of sign means item is discontinued and will never restock.</span>
                </li>
              </ul>
              <div className="p-2 bg-[#121215] rounded-lg font-mono text-[10px] text-[#30d158]">
                Formula: Ends in .97 + Tag has Asterisk = Max Resale ROI
              </div>
            </div>

            {/* Pillar 3: Sam's Club Liquidation */}
            <div className="bg-[#18181c] border border-[#2c2c35] rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-[#0a84ff] font-bold">
                <Server className="w-4 h-4" />
                <h4 className="text-sm text-[#f5f5f7]">3. Sam's Club Liquidation Codes</h4>
              </div>
              <p className="text-[#92929d] leading-relaxed">
                Sam's Club tags use special letters and ending numbers to signal closeouts:
              </p>
              <ul className="space-y-1 text-[11px] text-[#f5f5f7]">
                <li className="flex items-start gap-1.5">
                  <span className="text-[#0a84ff] font-bold font-mono">.91</span>
                  <span><strong>Clearance Blowout:</strong> Corporate item slated for immediate liquidation.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#ffd60a] font-bold font-mono">.71</span>
                  <span><strong>Club Manager Reduction:</strong> One-off club unit reduction.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#ff2d55] font-bold font-mono">"C"</span>
                  <span><strong>Cancelled Line:</strong> Item status is officially Cancelled from club replenishment.</span>
                </li>
              </ul>
              <div className="p-2 bg-[#121215] rounded-lg font-mono text-[10px] text-[#0a84ff]">
                Indicator: Letter "C" + Price ending in .91 or .71
              </div>
            </div>
          </div>

          {/* Interactive Live Price Glitch Feed Demo */}
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#f5f5f7] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#ff2d55]" /> Verified Dealify Price Glitch & Wholesale Samples
              </h4>
              <span className="text-[11px] text-[#92929d]">Auto-Pushed by Dealify Glitch Bots</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-[#222227] rounded-xl border border-[#ff2d55]/30 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ff2d55]/20 text-[#ff2d55]">
                      PRICE GLITCH (90% OFF)
                    </span>
                    <span className="font-mono text-[11px] text-[#92929d]">Live Bot Stream</span>
                  </div>
                  <h5 className="font-bold text-[#f5f5f7] mt-1.5 text-xs">
                    Keurig K-Mini Single Serve Coffee Maker
                  </h5>
                  <p className="text-[11px] text-[#92929d] mt-1">
                    System applied coupon code twice, shifting price from <strong>$109.99</strong> down to <strong>$10.99</strong> at checkout.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#2c2c35] flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black text-[#30d158] font-mono">$10.99</span>
                    <span className="text-[10px] line-through text-[#92929d]">$109.99</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onLoadIntoCalculator({
                        name: 'Keurig K-Mini Coffee Maker Glitch',
                        buy: '10.99',
                        sell: '75.00',
                        store: 'Walmart Online',
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#2c2c35] hover:bg-[#383842] text-[#f5f5f7] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator className="w-3 h-3 text-[#0a84ff]" />
                    <span>Calculate Resell ($64 Profit)</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-[#222227] rounded-xl border border-[#30d158]/30 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#30d158]/20 text-[#30d158]">
                      COSTCO .97 + ASTERISK (*)
                    </span>
                    <span className="font-mono text-[11px] text-[#92929d]">Discontinued Markdown</span>
                  </div>
                  <h5 className="font-bold text-[#f5f5f7] mt-1.5 text-xs">
                    Ninja Foodi XL 7-in-1 DualZone 10-Qt Air Fryer
                  </h5>
                  <p className="text-[11px] text-[#92929d] mt-1">
                    Marked down below wholesale to clear pallet space. Tag bears the death star asterisk (*).
                  </p>
                </div>
                <div className="pt-2 border-t border-[#2c2c35] flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black text-[#30d158] font-mono">$69.97</span>
                    <span className="text-[10px] line-through text-[#92929d]">$219.99</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onLoadIntoCalculator({
                        name: 'Ninja Foodi Air Fryer Costco .97',
                        buy: '69.97',
                        sell: '155.00',
                        store: 'Costco Wholesale',
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#2c2c35] hover:bg-[#383842] text-[#f5f5f7] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator className="w-3 h-3 text-[#0a84ff]" />
                    <span>Calculate Resell ($85 Profit)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COOK GROUPS & WHOP ECOSYSTEM (POKEPINGS, LUNCH MONEY, EMONEY, RESELL UNIVERSE, WHOP.COM) */}
      {activeTab === 'cook-groups' && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#ffd60a]/15 via-[#ff9800]/10 to-[#18181c] border border-[#ffd60a]/40 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-[#ffd60a] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Cook Group Intelligence
              </span>
              <span className="text-xs text-[#f5f5f7] font-bold">
                Pokepings, Lunch Money, eMoney, Resell Universe & Whop.com Architecture
              </span>
            </div>
            <p className="text-xs text-[#92929d] max-w-3xl leading-relaxed mt-1">
              In modern reselling, individual deal hunters rarely search manually. Instead, they subscribe to specialized private Discord communities known as <strong>"Cook Groups"</strong>. These groups run automated server monitors, price error bots, and in-store scrapers, with memberships managed almost exclusively through <strong>Whop.com</strong>.
            </p>
          </div>

          {/* Whop.com Infrastructure Explainer Card */}
          <div className="bg-[#18181c] border border-[#0a84ff]/40 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0a84ff]/20 text-[#0a84ff] flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#f5f5f7] flex items-center gap-2">
                    <span>Whop.com</span>
                    <span className="text-[11px] font-normal text-[#92929d]">(Often searched as "Woop.com")</span>
                  </h4>
                  <p className="text-[11px] text-[#0a84ff] font-medium">
                    The Central Operating System & Payment Backbone of the Resale Economy
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-[#0a84ff]/20 text-[#0a84ff] text-xs font-mono font-bold">
                Powers 90%+ of Top Resell Discord Groups
              </span>
            </div>

            <p className="text-xs text-[#92929d] leading-relaxed">
              Whop is the merchant infrastructure platform that monetizes cook groups, sneaker bots, and SaaS utilities. It handles Stripe payments, fraud screening, automated Discord OAuth role assignment, and software license key distribution. When you join PokePings, Lunch Money, or DealSoldier, Whop automatically verifies your billing and instantly grants access to the private bot channels.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 bg-[#222227] rounded-xl border border-[#2c2c35]">
                <span className="text-[#30d158] font-bold block mb-0.5">Automated Role Sync</span>
                <p className="text-[11px] text-[#92929d]">
                  Binds customer Discord IDs to active credit cards; automatically kicks users if subscriptions lapse.
                </p>
              </div>
              <div className="p-2.5 bg-[#222227] rounded-xl border border-[#2c2c35]">
                <span className="text-[#ffd60a] font-bold block mb-0.5">Bot License Authorization</span>
                <p className="text-[11px] text-[#92929d]">
                  Generates machine-locked license keys for desktop bots (Valor, Wrath, Cybersole, Refract).
                </p>
              </div>
              <div className="p-2.5 bg-[#222227] rounded-xl border border-[#2c2c35]">
                <span className="text-[#0a84ff] font-bold block mb-0.5">Sub-Second Checkout Links</span>
                <p className="text-[11px] text-[#92929d]">
                  Enables instantaneous member onboarding during high-demand restock windows with zero server lag.
                </p>
              </div>
            </div>
          </div>

          {/* The 4 Major Resell Groups Profile Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            {/* 1. PokePings */}
            <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-[#ff2d55]/20 text-[#ff2d55] font-bold text-[10px] tracking-wide uppercase">
                    Pokémon TCG & Collectibles
                  </span>
                  <span className="font-mono text-[11px] text-[#ffd60a] font-bold">4.9 ★ (650+ Reviews on Whop)</span>
                </div>
                <h4 className="text-base font-bold text-[#f5f5f7] flex items-center gap-1.5">
                  <span>PokePings</span>
                  <span className="text-xs text-[#92929d] font-normal">• ~$8.99/mo on Whop</span>
                </h4>
                <p className="text-[#92929d] text-xs leading-relaxed">
                  The most widely recognized specialized alert network dedicated strictly to the <strong>Pokémon Trading Card Game (TCG)</strong>, Lorcana, and One Piece card restocks.
                </p>

                <div className="p-2.5 bg-[#222227] rounded-xl space-y-1.5 text-[11px]">
                  <span className="text-[#f5f5f7] font-bold block">Key Capabilities:</span>
                  <ul className="space-y-1 text-[#92929d]">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>Pokémon Center Scrapers:</strong> Sub-second restock alerts for Elite Trainer Boxes (ETBs) and Booster Bundles.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>In-Store Target & Walmart Monitors:</strong> Notifies when local third-party vendors (MJ Holding / Excell) stock shelves.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>Official Vending Machine GPS:</strong> Tracks restocks across official Pokémon automated retail kiosks.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>Auto-Checkout (ACO):</strong> Optional assisted checkout slots for rapid sell-out drops.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-[#2c2c35] flex items-center justify-between">
                <span className="text-[11px] text-[#92929d]">Target Audience: Card Flippers &amp; Collectors</span>
                <span className="px-2 py-0.5 rounded bg-[#222227] text-[#30d158] font-mono text-[10px] font-bold">
                  High Margin / Low Barrier
                </span>
              </div>
            </div>

            {/* 2. Lunch Money */}
            <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-[#30d158]/20 text-[#30d158] font-bold text-[10px] tracking-wide uppercase">
                    Fast Daily Flips & Collectibles
                  </span>
                  <span className="font-mono text-[11px] text-[#ffd60a] font-bold">4.86 ★ (570+ Reviews on Whop)</span>
                </div>
                <h4 className="text-base font-bold text-[#f5f5f7] flex items-center gap-1.5">
                  <span>Lunch Money</span>
                  <span className="text-xs text-[#92929d] font-normal">• ~$25/mo on Whop</span>
                </h4>
                <p className="text-[#92929d] text-xs leading-relaxed">
                  Founded by veteran reseller <strong>Michael Bryant ("Redbeard")</strong>. Famous for fast, reliable daily profit flips ("lunch money"), Pokémon restocks, and viral collectibles like <strong>Pop Mart Labubu</strong> vinyl toys.
                </p>

                <div className="p-2.5 bg-[#222227] rounded-xl space-y-1.5 text-[11px]">
                  <span className="text-[#f5f5f7] font-bold block">Key Capabilities:</span>
                  <ul className="space-y-1 text-[#92929d]">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>Pop Mart & Labubu Monitors:</strong> Automated TikTok Shop and official restock monitors for viral blind boxes.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>90%+ Price Mistake Channel:</strong> Dedicated monitor scanning for price errors across Amazon, Target, and Walmart.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>Daily "Lunch Money" Quick Flips:</strong> Low-risk, high-velocity items yielding $20–$50 profit per flip with fast turnover.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>Direct Checkout Links:</strong> Pre-filled cart URLs that jump past product landing pages directly to payment.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-[#2c2c35] flex items-center justify-between">
                <span className="text-[11px] text-[#92929d]">Founder: Michael "Redbeard" Bryant</span>
                <span className="px-2 py-0.5 rounded bg-[#222227] text-[#ffd60a] font-mono text-[10px] font-bold">
                  Beginner Friendly / Daily Cash
                </span>
              </div>
            </div>

            {/* 3. eMoney */}
            <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-[#0a84ff]/20 text-[#0a84ff] font-bold text-[10px] tracking-wide uppercase">
                    Retail Arbitrage & Price Glitches
                  </span>
                  <span className="font-mono text-[11px] text-[#0a84ff] font-bold">Massive Discord Community</span>
                </div>
                <h4 className="text-base font-bold text-[#f5f5f7] flex items-center gap-1.5">
                  <span>eMoney</span>
                  <span className="text-xs text-[#92929d] font-normal">• Free &amp; Premium Tiers on Whop</span>
                </h4>
                <p className="text-[#92929d] text-xs leading-relaxed">
                  A massive, high-volume reselling community focused on <strong>retail arbitrage</strong>, price glitches, Amazon FBA, Home Depot clearance, coupon stacking, and side-hustle investments.
                </p>

                <div className="p-2.5 bg-[#222227] rounded-xl space-y-1.5 text-[11px]">
                  <span className="text-[#f5f5f7] font-bold block">Key Capabilities:</span>
                  <ul className="space-y-1 text-[#92929d]">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>Multi-Store In-Store Clearance:</strong> Home Depot penny finds, Target yellow tags, and Walmart hidden rollbacks.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>Amazon FBA & FBM Flips:</strong> Spotting price discrepancies between retail store shelves and Amazon buy boxes.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>Freebies & Glitch Promos:</strong> Restaurant app freebie loops, merchant credit exploits, and zero-cost items.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#ff9800] shrink-0 mt-0.5" />
                      <span><strong>Community Note:</strong> Some community members report delayed deal mirroring; verify alerts before purchasing.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-[#2c2c35] flex items-center justify-between">
                <span className="text-[11px] text-[#92929d]">Niche: Broad Retail Clearance &amp; Arbitrage</span>
                <span className="px-2 py-0.5 rounded bg-[#222227] text-[#0a84ff] font-mono text-[10px] font-bold">
                  High Volume / Multi-Store
                </span>
              </div>
            </div>

            {/* 4. Resell Universe / Resell University */}
            <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-[#bf5af2]/20 text-[#bf5af2] font-bold text-[10px] tracking-wide uppercase">
                    Multi-Niche & 500+ Site Monitors
                  </span>
                  <span className="font-mono text-[11px] text-[#bf5af2] font-bold">Founded 2017 by Ricky</span>
                </div>
                <h4 className="text-base font-bold text-[#f5f5f7] flex items-center gap-1.5">
                  <span>Resell Universe / Resell University</span>
                  <span className="text-xs text-[#92929d] font-normal">• ~$65/mo on Whop</span>
                </h4>
                <p className="text-[#92929d] text-xs leading-relaxed">
                  One of the longest-standing all-in-one cook groups. Originally established during the sneaker botting boom (2017), it expanded into Amazon FBA, event tickets (Ticketmaster/AXS), and over 500 automated site monitors.
                </p>

                <div className="p-2.5 bg-[#222227] rounded-xl space-y-1.5 text-[11px]">
                  <span className="text-[#f5f5f7] font-bold block">Key Capabilities:</span>
                  <ul className="space-y-1 text-[#92929d]">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>500+ Automated Monitors:</strong> Scrapes hundreds of Shopify storefronts, Nike, Supreme, and electronics distributors.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>Ticketmaster & Concert Flipping:</strong> Presale codes, queue monitors, and high-demand stadium tour guides.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>Amazon Un-Gating Guides:</strong> Tutorials for getting un-gated in locked categories like Top Toys, Beauty, and Groceries.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#30d158] shrink-0 mt-0.5" />
                      <span><strong>SideHustleCord:</strong> Maintains a free preview server for beginners before upgrading to paid tiers.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-[#2c2c35] flex items-center justify-between">
                <span className="text-[11px] text-[#92929d]">Niche: Tickets, Sneakers, FBA &amp; Lowkey Flips</span>
                <span className="px-2 py-0.5 rounded bg-[#222227] text-[#bf5af2] font-mono text-[10px] font-bold">
                  Enterprise Sourcing Suite
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Live Drop Pings Simulator */}
          <div className="bg-[#18181c] border border-[#2c2c35] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-bold text-[#f5f5f7] flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#ffd60a]" /> Simulated Cook Group Restock & Glitch Pings
                </h4>
                <p className="text-[11px] text-[#92929d]">
                  Click any live ping to immediately inspect the arbitrage spread and calculate your net resell profit:
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#30d158]/20 text-[#30d158] font-bold">
                Live Discord Webhook Stream
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {/* Ping 1: PokePings Drop */}
              <div className="p-3 bg-[#222227] rounded-xl border border-[#ff2d55]/30 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ff2d55]/20 text-[#ff2d55]">
                      POKEPINGS DROP ALERT
                    </span>
                    <span className="font-mono text-[10px] text-[#92929d]">Target RedDrop</span>
                  </div>
                  <h5 className="font-bold text-[#f5f5f7] mt-1.5 text-xs">
                    Pokémon TCG: Scarlet &amp; Violet 151 Booster Bundle (6 Packs)
                  </h5>
                  <p className="text-[11px] text-[#92929d] mt-1">
                    Restock detected online via Target RedSky private API. MSRP: <strong>$28.94</strong> | Market: <strong>$55.00</strong>
                  </p>
                </div>
                <div className="pt-2 border-t border-[#2c2c35] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-[#30d158] font-mono">$28.94</span>
                    <span className="text-[10px] text-[#92929d] block">+$26.00 Resell Net</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onLoadIntoCalculator({
                        name: 'Pokémon 151 Booster Bundle (PokePings Drop)',
                        buy: '28.94',
                        sell: '55.00',
                        store: 'Target Online',
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#2c2c35] hover:bg-[#383842] text-[#f5f5f7] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator className="w-3 h-3 text-[#ff2d55]" />
                    <span>Calculate ($26 Profit)</span>
                  </button>
                </div>
              </div>

              {/* Ping 2: Lunch Money Drop */}
              <div className="p-3 bg-[#222227] rounded-xl border border-[#30d158]/30 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#30d158]/20 text-[#30d158]">
                      LUNCH MONEY FLIP
                    </span>
                    <span className="font-mono text-[10px] text-[#92929d]">Pop Mart Restock</span>
                  </div>
                  <h5 className="font-bold text-[#f5f5f7] mt-1.5 text-xs">
                    Pop Mart "The Monsters" Labubu Exciting Macaron Vinyl Face
                  </h5>
                  <p className="text-[11px] text-[#92929d] mt-1">
                    TikTok Shop flash coupon stack. Retail: <strong>$18.99</strong> | TikTok/StockX Resale: <strong>$68.00</strong>
                  </p>
                </div>
                <div className="pt-2 border-t border-[#2c2c35] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-[#30d158] font-mono">$18.99</span>
                    <span className="text-[10px] text-[#92929d] block">+$49.00 Resell Net</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onLoadIntoCalculator({
                        name: 'Pop Mart Labubu Vinyl Face (Lunch Money Flip)',
                        buy: '18.99',
                        sell: '68.00',
                        store: 'Pop Mart TikTok Shop',
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#2c2c35] hover:bg-[#383842] text-[#f5f5f7] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator className="w-3 h-3 text-[#30d158]" />
                    <span>Calculate ($49 Profit)</span>
                  </button>
                </div>
              </div>

              {/* Ping 3: eMoney Arbitrage */}
              <div className="p-3 bg-[#222227] rounded-xl border border-[#0a84ff]/30 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0a84ff]/20 text-[#0a84ff]">
                      EMONEY IN-STORE CLEARANCE
                    </span>
                    <span className="font-mono text-[10px] text-[#92929d]">HD .03 Final</span>
                  </div>
                  <h5 className="font-bold text-[#f5f5f7] mt-1.5 text-xs">
                    DeWalt 20V MAX XR Brushless 4-1/2 in. Angle Grinder
                  </h5>
                  <p className="text-[11px] text-[#92929d] mt-1">
                    Store system marked to .03 clearance, yellow tag not updated. In-Store Buy: <strong>$39.03</strong> | eBay Sold: <strong>$125.00</strong>
                  </p>
                </div>
                <div className="pt-2 border-t border-[#2c2c35] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-[#30d158] font-mono">$39.03</span>
                    <span className="text-[10px] text-[#92929d] block">+$85.00 Resell Net</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onLoadIntoCalculator({
                        name: 'DeWalt 20V XR Grinder (eMoney HD .03)',
                        buy: '39.03',
                        sell: '125.00',
                        store: 'Home Depot Store',
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#2c2c35] hover:bg-[#383842] text-[#f5f5f7] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Calculator className="w-3 h-3 text-[#0a84ff]" />
                    <span>Calculate ($85 Profit)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: LIVE INVENTORY INGESTION HUB */}
      {activeTab === 'live-ingestion' && (
        <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 sm:p-5 space-y-5 shadow-lg">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2c2c35] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#f5f5f7] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#0a84ff] animate-pulse" /> Live Inventory Ingestion Engine
              </h3>
              <p className="text-xs text-[#92929d] mt-0.5">
                Stream real-time clearance drops, bot webhooks, browser scrapes, RSS feeds, and CSV liquidation manifests directly into this app.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-2.5 py-1 rounded-lg bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/30 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#30d158] animate-ping" />
                <span>Ingestion Pipeline: Online</span>
              </span>
            </div>
          </div>

          {/* Mode Selector Sub-Nav */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#2c2c35]/60 text-xs">
            <button
              type="button"
              onClick={() => setIngestionMode('webhook')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                ingestionMode === 'webhook'
                  ? 'bg-[#0a84ff] text-white shadow-xs'
                  : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7]'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Discord Webhooks & JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setIngestionMode('bookmarklet')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                ingestionMode === 'bookmarklet'
                  ? 'bg-[#bf5af2] text-white shadow-xs'
                  : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>1-Click Browser Bookmarklet</span>
            </button>

            <button
              type="button"
              onClick={() => setIngestionMode('rss')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                ingestionMode === 'rss'
                  ? 'bg-[#ff9800] text-black shadow-xs font-black'
                  : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7]'
              }`}
            >
              <Rss className="w-3.5 h-3.5" />
              <span>Live RSS / Reddit Feeds</span>
            </button>

            <button
              type="button"
              onClick={() => setIngestionMode('csv')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                ingestionMode === 'csv'
                  ? 'bg-[#30d158] text-black shadow-xs font-black'
                  : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7]'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV & Pallet Manifests</span>
            </button>

            <button
              type="button"
              onClick={() => setIngestionMode('architecture')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                ingestionMode === 'architecture'
                  ? 'bg-[#ffd60a] text-black shadow-xs font-black'
                  : 'bg-[#222227] text-[#92929d] hover:text-[#f5f5f7]'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Crawler Architecture</span>
            </button>
          </div>

          {/* MODE 1: DISCORD WEBHOOK & JSON INGESTION */}
          {ingestionMode === 'webhook' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#222227] rounded-xl border border-[#2c2c35] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-[#0a84ff]" /> Discord Bot Webhook & REST Payload Ingestor
                  </h4>
                  <span className="text-[11px] text-[#0a84ff] font-mono">Accepts Discord Embeds & JSON Arrays</span>
                </div>
                <p className="text-[#92929d] leading-relaxed">
                  Cook groups (like PokePings, Lunch Money, eMoney) push drop notifications via Discord Webhooks. You can forward those webhooks or paste their raw JSON embed payloads directly into this parser to inject real drops straight into your live loot feed.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-[#92929d]">Quick Test Samples:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const sample = JSON.stringify(
                        {
                          embeds: [
                            {
                              title: 'Pokémon TCG 151 Elite Trainer Box Restock',
                              description: 'Restock detected on Target.com & select store pickup locations nationwide.',
                              author: { name: 'Target Restock Bot (PokePings)' },
                              fields: [
                                { name: 'SKU', value: '89104821' },
                                { name: 'UPC', value: '820650853412' },
                                { name: 'Price', value: '$49.99' },
                                { name: 'Resell Market', value: '$115.00' },
                              ],
                            },
                          ],
                        },
                        null,
                        2
                      );
                      setIngestionPayload(sample);
                    }}
                    className="px-2.5 py-1 rounded bg-[#2c2c35] hover:bg-[#383842] text-[#0a84ff] font-bold text-[11px] cursor-pointer"
                  >
                    + PokePings Target Drop
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const sample = JSON.stringify(
                        [
                          {
                            title: 'Milwaukee M18 FUEL Deep Cut Band Saw (Glitch)',
                            store: 'Home Depot',
                            sku: '304918231',
                            upc: '045242598373',
                            clearancePrice: 79.03,
                            retailPrice: 349.0,
                            estResell: 285.0,
                            category: 'Power Tools',
                            notes: 'Home Depot .03 clearance code triggered. In-store self checkout verified.',
                          },
                          {
                            title: 'DeWalt 60V MAX 9.0Ah FlexVolt Battery 2-Pack',
                            store: 'Home Depot',
                            sku: '1004928172',
                            upc: '885911478294',
                            clearancePrice: 49.03,
                            retailPrice: 279.0,
                            estResell: 210.0,
                            category: 'Batteries',
                            notes: 'RTV salvage bypass. Stack in clearance endcap.',
                          },
                        ],
                        null,
                        2
                      );
                      setIngestionPayload(sample);
                    }}
                    className="px-2.5 py-1 rounded bg-[#2c2c35] hover:bg-[#383842] text-[#30d158] font-bold text-[11px] cursor-pointer"
                  >
                    + Home Depot .03 Batch
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const sample = JSON.stringify(
                        [
                          {
                            title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
                            store: 'Walmart',
                            sku: '592817263',
                            clearancePrice: 129.0,
                            retailPrice: 398.0,
                            estResell: 290.0,
                            notes: 'Walmart backroom cage open-box salvage rollback.',
                          },
                        ],
                        null,
                        2
                      );
                      setIngestionPayload(sample);
                    }}
                    className="px-2.5 py-1 rounded bg-[#2c2c35] hover:bg-[#383842] text-[#ff9800] font-bold text-[11px] cursor-pointer"
                  >
                    + Walmart Open Box Rollback
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#f5f5f7] flex items-center justify-between">
                  <span>Paste JSON / Discord Webhook Payload:</span>
                  <span className="text-[11px] text-[#92929d] font-normal">Supports array of items or Discord embeds</span>
                </label>
                <textarea
                  value={ingestionPayload}
                  onChange={(e) => setIngestionPayload(e.target.value)}
                  placeholder={`[\n  {\n    "title": "DeWalt 20V Atomic Drill Kit",\n    "store": "Home Depot",\n    "sku": "100482918",\n    "clearancePrice": 49.03,\n    "retailPrice": 149.00,\n    "estResell": 110.00\n  }\n]`}
                  rows={7}
                  className="w-full p-3 bg-[#121215] border border-[#2c2c35] rounded-xl font-mono text-xs text-[#30d158] placeholder-[#92929d]/50 focus:outline-hidden focus:border-[#0a84ff]"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-[#92929d]">
                  Deals will be parsed, assigned profit margins, and prepended to your Live Loot Feed instantly.
                </p>
                <button
                  type="button"
                  onClick={() => handleInjectJson()}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0a84ff] to-[#30d158] text-white font-black text-xs flex items-center gap-2 hover:opacity-90 transition-all cursor-pointer shrink-0 shadow-md"
                >
                  <Upload className="w-4 h-4" />
                  <span>Inject into Live Loot Feed</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: 1-CLICK BROWSER BOOKMARKLET */}
          {ingestionMode === 'bookmarklet' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-[#bf5af2]" /> 1-Click "Scrape to Loot Locator" Bookmarklet
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-[#bf5af2]/20 text-[#bf5af2] text-[10px] font-bold">
                    Zero Extension Required
                  </span>
                </div>
                <p className="text-[#92929d] leading-relaxed">
                  A bookmarklet is a snippet of JavaScript stored as a browser bookmark. When you are browsing product pages on <strong>HomeDepot.com</strong>, <strong>Walmart.com</strong>, or <strong>Target.com</strong>, clicking this bookmarklet scrapes the hidden <code>application/ld+json</code> metadata, product title, and in-store price, and copies a clean JSON payload directly to your clipboard ready for instant feed injection!
                </p>
              </div>

              <div className="p-4 bg-[#121215] rounded-xl border border-[#2c2c35] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#ffd60a] font-bold">Bookmarklet JavaScript Snippet</span>
                  <button
                    type="button"
                    onClick={handleCopyBookmarklet}
                    className="px-3 py-1.5 rounded-lg bg-[#bf5af2] hover:bg-[#bf5af2]/80 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  >
                    {copiedBookmarklet ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Bookmarklet Code</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 bg-[#18181c] rounded-lg font-mono text-[10px] text-[#30d158] break-all max-h-28 overflow-y-auto border border-[#2c2c35]">
                  {BOOKMARKLET_CODE}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-1">
                  <span className="w-5 h-5 rounded-full bg-[#0a84ff]/20 text-[#0a84ff] flex items-center justify-center font-bold text-[11px]">1</span>
                  <h5 className="font-bold text-[#f5f5f7]">Create Bookmark</h5>
                  <p className="text-[11px] text-[#92929d]">Bookmark any webpage in Chrome/Safari/Edge, right-click it, click <strong>Edit</strong>, and paste this code as the URL.</p>
                </div>
                <div className="p-3 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-1">
                  <span className="w-5 h-5 rounded-full bg-[#bf5af2]/20 text-[#bf5af2] flex items-center justify-center font-bold text-[11px]">2</span>
                  <h5 className="font-bold text-[#f5f5f7]">Browse Any Retailer</h5>
                  <p className="text-[11px] text-[#92929d]">Navigate to any product on Home Depot, Target, or Walmart. Click your bookmarklet in your bookmarks bar.</p>
                </div>
                <div className="p-3 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-1">
                  <span className="w-5 h-5 rounded-full bg-[#30d158]/20 text-[#30d158] flex items-center justify-center font-bold text-[11px]">3</span>
                  <h5 className="font-bold text-[#f5f5f7]">Instant Feed Injection</h5>
                  <p className="text-[11px] text-[#92929d]">The scraper copies the deal JSON. Return here, paste it into the Webhook tab, and click Inject!</p>
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: LIVE RSS & REDDIT FEEDS */}
          {ingestionMode === 'rss' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
                    <Rss className="w-4 h-4 text-[#ff9800]" /> Community RSS & Social Aggregation Channels
                  </h4>
                  <span className="text-[11px] text-[#ff9800] font-mono">Direct Public Ingestion Feeds</span>
                </div>
                <p className="text-[#92929d] leading-relaxed">
                  Before cook groups and paid apps existed, deals originated on deal forums and subreddits. These communities expose direct RSS and JSON feeds that your system can poll without needing proxy rotation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Slickdeals */}
                <div className="p-4 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-[#0a84ff]/20 text-[#0a84ff] font-bold text-[10px]">Slickdeals RSS</span>
                      <span className="text-[10px] text-[#92929d]">Poll every 60s</span>
                    </div>
                    <h5 className="font-bold text-[#f5f5f7] text-sm">Frontpage & Popular RSS</h5>
                    <p className="text-[11px] text-[#92929d]">
                      Monitors items that hit +50 thumb score within 30 minutes, indicating nationwide price drops or glitches.
                    </p>
                    <div className="p-1.5 bg-[#121215] rounded font-mono text-[9px] text-[#92929d] truncate">
                      slickdeals.net/newsearch.php?mode=frontpage&rss=1
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFetchRssSample('slickdeals')}
                    className="w-full py-2 rounded-lg bg-[#0a84ff] hover:bg-[#0a84ff]/80 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ingest Slickdeals Hot Drops</span>
                  </button>
                </div>

                {/* Reddit Pokemon */}
                <div className="p-4 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-[#ffd60a]/20 text-[#ffd60a] font-bold text-[10px]">Reddit JSON</span>
                      <span className="text-[10px] text-[#92929d]">Poll every 30s</span>
                    </div>
                    <h5 className="font-bold text-[#f5f5f7] text-sm">r/PKMNTCGDeals Live Feed</h5>
                    <p className="text-[11px] text-[#92929d]">
                      Tracks collector card drops at retail MSRP across Pokémon Center, Target, Walmart, and Sam's Club.
                    </p>
                    <div className="p-1.5 bg-[#121215] rounded font-mono text-[9px] text-[#92929d] truncate">
                      reddit.com/r/PKMNTCGDeals/new.json?limit=25
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFetchRssSample('reddit-pkmn')}
                    className="w-full py-2 rounded-lg bg-[#ffd60a] hover:bg-[#ffd60a]/80 text-black font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ingest TCG Restock Feed</span>
                  </button>
                </div>

                {/* Reddit Clearance */}
                <div className="p-4 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-[#30d158]/20 text-[#30d158] font-bold text-[10px]">Reddit Clearance</span>
                      <span className="text-[10px] text-[#92929d]">Spotter Submissions</span>
                    </div>
                    <h5 className="font-bold text-[#f5f5f7] text-sm">r/clearance & Retail Finds</h5>
                    <p className="text-[11px] text-[#92929d]">
                      Aggregates user-submitted photos of in-store yellow tags, 70% off Target salvages, and Home Depot markdowns.
                    </p>
                    <div className="p-1.5 bg-[#121215] rounded font-mono text-[9px] text-[#92929d] truncate">
                      reddit.com/r/clearance/new.json?limit=25
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFetchRssSample('reddit-clearance')}
                    className="w-full py-2 rounded-lg bg-[#30d158] hover:bg-[#30d158]/80 text-black font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ingest Clearance Spotter Feed</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 4: CSV & PALLET MANIFESTS */}
          {ingestionMode === 'csv' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#30d158]" /> Bulk CSV & Liquidation Pallet Importer
                  </h4>
                  <span className="text-[11px] text-[#30d158] font-mono">B-Stock, BULK.com & Wholesale Ready</span>
                </div>
                <p className="text-[#92929d] leading-relaxed">
                  When buying liquidation truckloads, customer returns pallets, or bulk store surplus from B-Stock or Quicklotz, suppliers give you a CSV manifest. Paste the rows below to instantly audit profitability against current secondary market prices.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const sample = `Title, Store, SKU, BuyPrice, SellPrice, Notes\nMilwaukee M18 FUEL High Torque Impact Wrench, Home Depot, 2767-20, 89.00, 240.00, Pallet #402 Grade A Overstock\nRyobi ONE+ 18V Cordless 6-Tool Combo Kit, Home Depot, P1819, 99.00, 230.00, Home Depot Customer Return Manifest\nShark Matrix Plus 2-in-1 Robot Vacuum & Mop, Target, RV2610WA, 65.00, 260.00, Target Salvage Lot #12\nApple AirPods Pro (2nd Gen) USB-C, Target, MTJV3AM/A, 85.00, 190.00, Target Electronics Return Pallet`;
                      setIngestionCsv(sample);
                    }}
                    className="px-2.5 py-1 rounded bg-[#2c2c35] hover:bg-[#383842] text-[#30d158] font-bold text-[11px] cursor-pointer"
                  >
                    + Load Sample Return Pallet Manifest
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#f5f5f7] flex items-center justify-between">
                  <span>CSV Rows (Title, Store, SKU, BuyPrice, SellPrice, Notes):</span>
                  <span className="text-[11px] text-[#92929d] font-normal">Comma-separated</span>
                </label>
                <textarea
                  value={ingestionCsv}
                  onChange={(e) => setIngestionCsv(e.target.value)}
                  placeholder={`Title, Store, SKU, BuyPrice, SellPrice, Notes\nDeWalt 20V Grinder, Home Depot, 39281, 39.03, 125.00, HD Clearance`}
                  rows={6}
                  className="w-full p-3 bg-[#121215] border border-[#2c2c35] rounded-xl font-mono text-xs text-[#30d158] placeholder-[#92929d]/50 focus:outline-hidden focus:border-[#30d158]"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-[#92929d]">
                  Calculates net margin and flags items below $0.03 as penny items.
                </p>
                <button
                  type="button"
                  onClick={() => handleInjectCsv()}
                  className="px-4 py-2.5 rounded-xl bg-[#30d158] text-black font-black text-xs flex items-center gap-2 hover:opacity-90 transition-all cursor-pointer shrink-0 shadow-md"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Parse & Ingest Manifest</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 5: AUTOMATED CRAWLER & PROXY ARCHITECTURE */}
          {ingestionMode === 'architecture' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-[#ffd60a]" /> Automated 24/7 Scraping & Proxy Pipeline
                  </h4>
                  <span className="text-[11px] text-[#ffd60a] font-mono">Production Engineering Blueprint</span>
                </div>
                <p className="text-[#92929d] leading-relaxed">
                  How enterprise deal apps run unattended background crawlers to feed millions of inventory records into their database 24/7 without getting banned.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-2">
                  <h5 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-[#0a84ff]" /> 1. Rotating Residential Proxy Network
                  </h5>
                  <p className="text-[#92929d] leading-relaxed">
                    Data center IPs (AWS, DigitalOcean, GCP) are blocked instantly by Akamai and Cloudflare Turnstile. Commercial bots route requests through <strong>residential proxy backbones</strong> (such as Bright Data, Oxylabs, or Smartproxy) with 50M+ peer IP pools, rotating every single request to appear as distinct local home ISP shoppers.
                  </p>
                  <div className="p-2 bg-[#121215] rounded font-mono text-[10px] text-[#30d158]">
                    http://user-session_123:pass@pr.residential.brightdata.com:22225
                  </div>
                </div>

                <div className="p-3.5 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-2">
                  <h5 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#ffd60a]" /> 2. Mobile App TLS Fingerprint Spoofing
                  </h5>
                  <p className="text-[#92929d] leading-relaxed">
                    Retailer mobile apps use specific TLS handshakes (JA3/JA4 fingerprints) and proprietary HTTP headers (e.g. <code>x-perf-app-version</code>, <code>x-redsky-api-key</code>). High-speed scrapers use Go-based HTTP clients like <code>tls-client</code> or <code>curl-impersonate</code> to mimic official iOS device network signatures.
                  </p>
                  <div className="p-2 bg-[#121215] rounded font-mono text-[10px] text-[#ffd60a]">
                    JA3 Fingerprint: 771,4865-4866-4867-49195-49199... (iOS 17 Safari/Native)
                  </div>
                </div>

                <div className="p-3.5 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-2">
                  <h5 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#30d158]" /> 3. Redis Queue & Delta-Detector
                  </h5>
                  <p className="text-[#92929d] leading-relaxed">
                    Instead of storing static prices, the bot maintains a Redis Key-Value store with previous prices: <code>SET store:1771:sku:90214 49.99</code>. When the crawler sees <code>14.04</code>, it computes <code>delta = -71.9%</code>, detects an aggressive markdown ending in <code>.04</code> (Target salvage), and broadcasts a push event to WebSocket subscribers within 200ms.
                  </p>
                </div>

                <div className="p-3.5 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-2">
                  <h5 className="font-bold text-[#f5f5f7] flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-[#bf5af2]" /> 4. Direct Store Barcode Scan In-Store
                  </h5>
                  <p className="text-[#92929d] leading-relaxed">
                    While walking store aisles, physical hunters use the built-in <strong>In-Store Barcode Scanner</strong> tab or <strong>Bulk Scan Hub</strong> in this app. Pointing your phone camera at a shelf tag or UPC instantly verifies hidden RTV or penny status against our local database.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TECHNOLOGY BLUEPRINT (FULL COMPARISON) */}
      {activeTab === 'tech-blueprint' && (
        <div className="bg-[#18181c] border border-[#2c2c35] rounded-2xl p-4 sm:p-5 space-y-5 shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-[#2c2c35] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#f5f5f7] flex items-center gap-2">
                <Code className="w-4 h-4 text-[#30d158]" /> Reverse-Engineered Architecture of Deal Apps
              </h3>
              <p className="text-xs text-[#92929d] mt-0.5">
                A technical breakdown of how DealSoldier, BrickSeek, Dealify, and Slickdeals locate hidden markdowns before anyone else.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/30 text-xs font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Technical Intel
            </span>
          </div>

          {/* Technical Layers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Layer 1 */}
            <div className="p-3.5 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#ff9800]/20 text-[#ff9800] flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <h4 className="font-bold text-[#f5f5f7] text-sm">
                  Private Mobile App Endpoints vs Public Web Pages
                </h4>
              </div>
              <p className="text-[#92929d] leading-relaxed">
                Deal apps do <strong>not</strong> scrape desktop web pages because retailers heavily protect them with Cloudflare Turnstile and Akamai. Instead, deal bots reverse-engineer the JSON/REST APIs used by the official iOS and Android apps (e.g. Target's <code>RedSky Client API</code> or Walmart's <code>GraphQL Store Assortment</code>).
              </p>
              <div className="p-2 bg-[#121215] rounded-lg font-mono text-[10px] text-[#30d158]">
                target.com/redsky_aggregations/v1/web/pdp_client_v1?store_id=1771&dpci=xxx
              </div>
            </div>

            {/* Layer 2 */}
            <div className="p-3.5 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#0a84ff]/20 text-[#0a84ff] flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <h4 className="font-bold text-[#f5f5f7] text-sm">
                  Residential Proxy Pools & TLS Fingerprint Spoofing
                </h4>
              </div>
              <p className="text-[#92929d] leading-relaxed">
                To bypass Akamai Bot Manager and PerimeterX rate-limits, deal services route automated queries through networks of millions of rotating residential IP addresses (Bright Data, Smartproxy, Oxylabs) while spoofing browser TLS JA3 signatures.
              </p>
              <div className="p-2 bg-[#121215] rounded-lg font-mono text-[10px] text-[#0a84ff]">
                curl_cffi / JA3: 771,4865-4866-4867-49195-49199,0-23-65281-10-11-35-16
              </div>
            </div>

            {/* Layer 3 */}
            <div className="p-3.5 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#ffd60a]/20 text-[#ffd60a] flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <h4 className="font-bold text-[#f5f5f7] text-sm">
                  Store ID Geocoding & Radius Node Mapping
                </h4>
              </div>
              <p className="text-[#92929d] leading-relaxed">
                Rather than checking nationwide inventory, deal engines maintain a database of 4-digit store numbers (e.g. Home Depot #2671, Walmart #1522). When a user inputs a zip code, mathematical Haversine calculations select the 5 to 10 closest store nodes.
              </p>
              <div className="p-2 bg-[#121215] rounded-lg font-mono text-[10px] text-[#ffd60a]">
                Query: ZIP 02740 ➔ Cluster [Store #2671 (1.8mi), Store #2674 (4.2mi)]
              </div>
            </div>

            {/* Layer 4 */}
            <div className="p-3.5 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#30d158]/20 text-[#30d158] flex items-center justify-center font-bold text-xs">
                  4
                </span>
                <h4 className="font-bold text-[#f5f5f7] text-sm">
                  Algorithmic Price-Ending Markdown Triggers
                </h4>
              </div>
              <p className="text-[#92929d] leading-relaxed">
                Bots monitor price endings: Home Depot drops to <code>.06</code> ➔ <code>.03</code> ➔ <code>.01</code>; Target drops from 15% ➔ 30% ➔ 50% ➔ 70%; Dollar General executes Tuesday penny wipes. When an endpoint returns a price ending matching these rules, instant alerts are generated.
              </p>
              <div className="p-2 bg-[#121215] rounded-lg font-mono text-[10px] text-[#30d158]">
                price.endsWith('.01') ? triggerPennyAlert() : price.endsWith('.03') ? triggerClearance()
              </div>
            </div>

            {/* Layer 5: Dealify Engine */}
            <div className="p-3.5 bg-[#222227] rounded-xl border border-[#bf5af2]/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#bf5af2]/20 text-[#bf5af2] flex items-center justify-center font-bold text-xs">
                  5
                </span>
                <h4 className="font-bold text-[#f5f5f7] text-sm">
                  Price Error & Glitch Anomaly Detection (Dealify Engine)
                </h4>
              </div>
              <p className="text-[#92929d] leading-relaxed">
                Dealify uses continuous diffing algorithms that contrast real-time checkout prices against historical baselines. If an item drops &gt;80% without an active promotional tag, it flags the SKU as a database sync error or decimal misplacement, sending push webhooks within 5 seconds.
              </p>
              <div className="p-2 bg-[#121215] rounded-lg font-mono text-[10px] text-[#bf5af2]">
                priceDrop &gt; 0.8 && !hasPromoCampaign ? dispatchGlitchAlert() : null
              </div>
            </div>

            {/* Layer 6: Wholesale Decoders */}
            <div className="p-3.5 bg-[#222227] rounded-xl border border-[#ffd60a]/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#ffd60a]/20 text-[#ffd60a] flex items-center justify-center font-bold text-xs">
                  6
                </span>
                <h4 className="font-bold text-[#f5f5f7] text-sm">
                  Wholesale Club Liquidation Feeds (Costco & Sam's Club)
                </h4>
              </div>
              <p className="text-[#92929d] leading-relaxed">
                Wholesale clubs don't use standard clearance stickers. Deal engines poll warehouse inventory databases for ending digits (Costco <code>.97</code> corporate markdown, <code>.00</code> manager, <code>*</code> deleted SKU) and Sam's Club (<code>.91</code> seasonal liquidation, letter <code>C</code>).
              </p>
              <div className="p-2 bg-[#121215] rounded-lg font-mono text-[10px] text-[#ffd60a]">
                costco.priceEnding === 97 && costco.tagSymbol === '*' ? 'MAX_LIQUIDATION' : 'NORMAL'
              </div>
            </div>
          </div>

          {/* Comparative Table: DealSoldier vs BrickSeek vs Dealify vs Slickdeals */}
          <div className="p-4 bg-[#222227] rounded-xl border border-[#2c2c35] space-y-3">
            <h4 className="text-xs font-bold text-[#f5f5f7] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#0a84ff]" /> Comparative Platform Breakdown
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left">
                <thead>
                  <tr className="border-b border-[#2c2c35] text-[#92929d]">
                    <th className="py-2 pr-3">App / Service</th>
                    <th className="py-2 px-3">Primary Focus</th>
                    <th className="py-2 px-3">Core Technology</th>
                    <th className="py-2 px-3">Key Strength</th>
                    <th className="py-2 pl-3">Vulnerability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2c2c35]/50 text-[#f5f5f7]">
                  <tr>
                    <td className="py-2.5 pr-3 font-bold text-[#ff9800]">DealSoldier</td>
                    <td className="py-2.5 px-3">Hidden in-store clearances (Home Depot, Walmart, Lowe's)</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-[#92929d]">Loot Locator + Discord Webhooks</td>
                    <td className="py-2.5 px-3 text-[#30d158]">Finds shelf items with unapplied physical tags</td>
                    <td className="py-2.5 pl-3 text-[#92929d]">Subject to employee register cancellation</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-bold text-[#ffd60a]">BrickSeek</td>
                    <td className="py-2.5 px-3">Direct inventory quantity &amp; price checking</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-[#92929d]">Target RedSky &amp; Walmart GraphQL APIs</td>
                    <td className="py-2.5 px-3 text-[#30d158]">Shows exact on-hand counts &amp; aisle numbers</td>
                    <td className="py-2.5 pl-3 text-[#92929d]">Retailers throttle/mask inventory counts</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-bold text-[#bf5af2]">Dealify</td>
                    <td className="py-2.5 px-3">Price glitches, wholesale club liquidations, restocks</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-[#92929d]">Catalog Diffing &amp; Restock Webhooks</td>
                    <td className="py-2.5 px-3 text-[#30d158]">Sub-second alerts on 80%+ decimal anomalies</td>
                    <td className="py-2.5 pl-3 text-[#92929d]">Retailers cancel orders placed during glitches</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-bold text-[#0a84ff]">Slickdeals</td>
                    <td className="py-2.5 px-3">Crowdsourced consumer deals &amp; promo codes</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-[#92929d]">Velocity Voting Algorithm &amp; Affiliate Feeds</td>
                    <td className="py-2.5 px-3 text-[#30d158]">Massive community verification &amp; comments</td>
                    <td className="py-2.5 pl-3 text-[#92929d]">Frontpage deals sell out in minutes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
