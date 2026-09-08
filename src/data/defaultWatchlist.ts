import { WatchlistTopic } from '../types';

export const DEFAULT_WATCHLIST: WatchlistTopic[] = [
  {
    id: 'halloween-ip',
    season: 'October / Fall',
    title: 'Halloween IP / Animatronics',
    description: 'Local Home Depot / Target stock flips fast locally (FB Marketplace) to avoid heavy shipping.',
    recommendedStore: 'Home Depot / Target / Spirit',
    hotItems: ['Giant Skeletons', 'Licensed Inflatables', 'Fog Machines', 'Costume Bundles'],
  },
  {
    id: 'heavy-outerwear',
    season: 'October / Fall',
    title: 'Heavy Outerwear Clearance',
    description: "The regional weather shift is hitting. Last year's winter coats/boots hitting clearance racks now will turn immediately.",
    recommendedStore: 'Kohl’s / Walmart / TJ Maxx',
    hotItems: ['Down Parkas', 'Waterproof Boots', 'Thermal Baselayers', 'Fleece Zip-ups'],
  },
  {
    id: 'q4-toys',
    season: 'October / Fall',
    title: 'Q4 Toy Hoarding',
    description: 'Scan for early clearances on hot holiday toys (LEGO, interactive plush) before the November rush.',
    recommendedStore: 'Target / Walmart / Dollar General',
    hotItems: ['LEGO Retired Sets', 'Interactive Pets', 'Barbie Holiday Dolls', 'Hot Wheels Tracks'],
  },
  {
    id: 'patio-garden',
    season: 'October / Fall',
    title: 'Lawn & Patio Clearance Wind-Down',
    description: 'Hardware and big box stores purge summer patio furniture, weed whackers, and outdoor power gear at up to 75-90% off.',
    recommendedStore: "Lowe's / Home Depot",
    hotItems: ['Grill Covers', 'String Lights', 'Sprinklers', 'Trimmer Line Spools'],
  },
];
