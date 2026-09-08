import { AutoCoupledDeal, StoreCouponOffer, AppliedCouponLayer } from '../types';

export const MOCK_AUTO_COUPLED_DEALS: AutoCoupledDeal[] = [
  {
    id: 'couple-deal-1',
    title: 'DeWalt 20V MAX XR Brushless Compact Router (Tool Only)',
    brand: 'DeWalt',
    skuOrUpc: 'DCW600B / 1004128910',
    store: 'Home Depot',
    category: 'Tools & Hardware',
    originalRetailPrice: 199.0,
    clearancePrice: 99.5, // Prorated hack cost on receipt
    totalCouponSavings: 106.47,
    finalNetBuyCost: 92.53,
    estResalePrice: 165.0,
    estNetProfit: 47.72,
    roiPct: 52,
    isMoneymaker: false,
    hackType: 'Tool Return Hack',
    hackDetails: {
      primaryItemName: 'DeWalt 20V MAX 5.0Ah Battery Starter Kit (DCB205-2CK)',
      primaryRetail: 199.0,
      freeBonusItemName: 'DeWalt 20V MAX XR Brushless Router (DCW600B)',
      freeBonusRetail: 199.0,
      receiptReturnRefundValue: 99.5,
      netKeptItemCost: 99.5,
      resaleMarket: 'eBay / FB Marketplace ($165.00 avg sold)',
      stepByStepInstructions: [
        'Place order for the "Buy Battery Kit, Get Free Bare Tool" promo online or at the register.',
        'Home Depot\'s POS software prorates both items 50/50: Battery Kit at $99.50, Bare Tool at $99.50.',
        'Once picked up or delivered, take ONLY the sealed Battery Kit back to Customer Service for a full $99.50 + tax refund.',
        'You keep the brand-new $199.00 Bare Tool for just $99.50 minus our stacked 5% Pro coupon!',
        'Resell immediately for $165.00 cash.'
      ]
    },
    coupledCoupons: [
      {
        id: 'c-hd-hack',
        name: 'Home Depot POS 50/50 Proration Return Hack',
        type: 'Tool Return Proration Hack',
        discountValue: 99.5,
        discountType: 'flat',
        appSource: 'Home Depot POS',
        terms: 'Automatic line-item proration on BOGO tool promotional pairings.'
      },
      {
        id: 'c-hd-pro',
        name: 'Pro Xtra Volume Perk (Spend $100 get 5% back)',
        type: 'Store Card 5% / Pro Perk',
        discountValue: 4.98,
        discountType: 'flat',
        codeOrClip: 'PRO-PERK-5',
        appSource: 'The Home Depot Pro App'
      },
      {
        id: 'c-hd-card',
        name: 'Consumer Credit / Commercial Card 2% Rebate',
        type: 'Cashback Rebate (Ibotta/Fetch)',
        discountValue: 1.99,
        discountType: 'flat',
        appSource: 'Capital One / Card Cash'
      }
    ],
    hunterVerifiedDate: 'Verified 4 hrs ago',
    popularityScore: 98
  },
  {
    id: 'couple-deal-2',
    title: 'Milwaukee M18 FUEL 4-1/2" - 5" Braking Grinder Paddle Switch',
    brand: 'Milwaukee',
    skuOrUpc: '2880-20 / 1006129482',
    store: 'Home Depot',
    category: 'Tools & Hardware',
    originalRetailPrice: 199.0,
    clearancePrice: 99.5,
    totalCouponSavings: 104.5,
    finalNetBuyCost: 94.5,
    estResalePrice: 174.99,
    estNetProfit: 54.24,
    roiPct: 57,
    isMoneymaker: false,
    hackType: 'Tool Return Hack',
    hackDetails: {
      primaryItemName: 'Milwaukee M18 REDLITHIUM XC5.0 Two-Battery Starter Kit',
      primaryRetail: 199.0,
      freeBonusItemName: 'Milwaukee M18 FUEL Braking Grinder (Bare Tool)',
      freeBonusRetail: 199.0,
      receiptReturnRefundValue: 99.5,
      netKeptItemCost: 99.5,
      resaleMarket: 'eBay Solds ($174.99 avg sold, 94% sell-through)',
      stepByStepInstructions: [
        'Add the M18 XC5.0 2-Battery Kit and select the M18 FUEL Braking Grinder as the Free Gift.',
        'View the cart breakdown: each line item shows $99.50 maximum refund value.',
        'Return the battery kit with receipt to the Pro Desk return counter for an instant $99.50 refund to original payment.',
        'Keep the brand-new sealed Grinder at $94.50 net cost.'
      ]
    },
    coupledCoupons: [
      {
        id: 'c-hd-milw-hack',
        name: 'Milwaukee Red Loyalty Proration Split',
        type: 'Tool Return Proration Hack',
        discountValue: 99.5,
        discountType: 'flat',
        appSource: 'Home Depot POS'
      },
      {
        id: 'c-hd-milw-coupon',
        name: 'Home Depot $5 Tool Event Clip',
        type: 'Store Digital Coupon',
        discountValue: 5.0,
        discountType: 'flat',
        codeOrClip: 'SPRING-POWER-5',
        appSource: 'Home Depot Digital Wallet'
      }
    ],
    hunterVerifiedDate: 'Verified 2 hrs ago',
    popularityScore: 95
  },
  {
    id: 'couple-deal-3',
    title: 'Gain Original Flings Laundry Detergent Pods 24ct + Fabric Softener',
    brand: 'Gain',
    skuOrUpc: '037000769415',
    store: 'Dollar General',
    category: 'Cleaning & Household',
    originalRetailPrice: 14.5,
    clearancePrice: 8.0, // Yellow dot clearance
    totalCouponSavings: 6.2,
    finalNetBuyCost: 1.8,
    estResalePrice: 13.5,
    estNetProfit: 9.68,
    roiPct: 538,
    isMoneymaker: false,
    hackType: 'Saturday Glitch',
    coupledCoupons: [
      {
        id: 'c-dg-sat',
        name: 'DG Saturday $5 OFF $25 Digital Basket Coupon (Prorated)',
        type: 'Saturday Spend Multiplier',
        discountValue: 2.2,
        discountType: 'flat',
        codeOrClip: 'SAT-SAVE-5',
        appSource: 'DG Digital App',
        terms: 'Must clip in Dollar General App; valid every Saturday with $25 pre-tax spend.'
      },
      {
        id: 'c-dg-gain',
        name: 'Gain Fabric Care Manufacturer Digital Coupon',
        type: 'Manufacturer Digital Coupon',
        discountValue: 3.0,
        discountType: 'flat',
        codeOrClip: 'PG-GAIN-300',
        appSource: 'P&G Good Everyday / DG Digital'
      },
      {
        id: 'c-dg-ibotta',
        name: 'Ibotta Laundry Care Cash Rebate',
        type: 'Cashback Rebate (Ibotta/Fetch)',
        discountValue: 1.0,
        discountType: 'flat',
        appSource: 'Ibotta App'
      }
    ],
    hunterVerifiedDate: 'Verified Today',
    popularityScore: 99
  },
  {
    id: 'couple-deal-4',
    title: 'Crest 3D White Charcoal Whitening Toothpaste 2-Pack',
    brand: 'Crest',
    skuOrUpc: '037000788225',
    store: 'Dollar General',
    category: 'Health & Beauty',
    originalRetailPrice: 7.95,
    clearancePrice: 2.5, // 50% seasonal clearance table
    totalCouponSavings: 3.0,
    finalNetBuyCost: 0.0, // 50c overage absorbed by cart
    estResalePrice: 6.5,
    estNetProfit: 6.5,
    roiPct: 1300,
    isMoneymaker: true,
    hackType: 'Rebate Moneymaker',
    coupledCoupons: [
      {
        id: 'c-dg-crest-mfg',
        name: 'Crest 3D White Manufacturer Clip Coupon',
        type: 'Manufacturer Digital Coupon',
        discountValue: 2.0,
        discountType: 'flat',
        codeOrClip: 'CREST-200-CLIP',
        appSource: 'DG App Digital Coupons'
      },
      {
        id: 'c-dg-ibotta-oral',
        name: 'Ibotta $1.00 Oral Care Cash Back Offer',
        type: 'Cashback Rebate (Ibotta/Fetch)',
        discountValue: 1.0,
        discountType: 'flat',
        appSource: 'Ibotta Rebate Scanner'
      }
    ],
    hunterVerifiedDate: 'Verified 1 hr ago',
    popularityScore: 92
  },
  {
    id: 'couple-deal-5',
    title: 'Shark Navigator Lift-Away NV352 Upright Vacuum',
    brand: 'Shark',
    skuOrUpc: '022356534220 / DPCI 329-00-1429',
    store: 'Target',
    category: 'Home & Decor',
    originalRetailPrice: 199.99,
    clearancePrice: 99.99, // 50% red clearance sticker
    totalCouponSavings: 39.0,
    finalNetBuyCost: 60.99,
    estResalePrice: 149.0,
    estNetProfit: 65.66,
    roiPct: 108,
    isMoneymaker: false,
    hackType: 'Multi-Tier Stack',
    coupledCoupons: [
      {
        id: 'c-tgt-circle-home',
        name: 'Target Circle 20% Floor Care & Vacuum Promo',
        type: 'Store Digital Coupon',
        discountValue: 20.0,
        discountType: 'flat',
        appSource: 'Target Circle App',
        terms: 'Stacks on top of existing red clearance stickers.'
      },
      {
        id: 'c-tgt-redcard',
        name: 'Target Circle Card 5% Instant Savings',
        type: 'Store Card 5% / Pro Perk',
        discountValue: 4.0,
        discountType: 'flat',
        appSource: 'Target RedCard'
      },
      {
        id: 'c-tgt-ibotta-shark',
        name: 'Ibotta $15 Shark / Floor Appliance Rebate',
        type: 'Cashback Rebate (Ibotta/Fetch)',
        discountValue: 15.0,
        discountType: 'flat',
        appSource: 'Ibotta App'
      }
    ],
    hunterVerifiedDate: 'Verified Yesterday',
    popularityScore: 94
  },
  {
    id: 'couple-deal-6',
    title: 'LEGO Star Wars The Mandalorian N-1 Starfighter (75325)',
    brand: 'LEGO',
    skuOrUpc: '673419357494 / DPCI 204-00-2819',
    store: 'Target',
    category: 'Toys & Games',
    originalRetailPrice: 59.99,
    clearancePrice: 35.99, // 40% clearance endcap letter sticker
    totalCouponSavings: 10.34,
    finalNetBuyCost: 25.65,
    estResalePrice: 58.0,
    estNetProfit: 23.65,
    roiPct: 92,
    isMoneymaker: false,
    hackType: 'Multi-Tier Stack',
    coupledCoupons: [
      {
        id: 'c-tgt-circle-toy',
        name: 'Target Circle $10 off $40 Toy & Building Sets Bonus (Prorated)',
        type: 'Store Digital Coupon',
        discountValue: 8.99,
        discountType: 'flat',
        appSource: 'Target Circle Reward Vault'
      },
      {
        id: 'c-tgt-redcard-lego',
        name: 'Target Circle Card 5% Off',
        type: 'Store Card 5% / Pro Perk',
        discountValue: 1.35,
        discountType: 'flat',
        appSource: 'Target RedCard'
      }
    ],
    hunterVerifiedDate: 'Verified 6 hrs ago',
    popularityScore: 89
  },
  {
    id: 'couple-deal-7',
    title: 'Kobalt 24-Volt Max Brushless 1/2-in Drill & Impact Driver Combo Kit',
    brand: 'Kobalt',
    skuOrUpc: 'Item #1489201 / 820909673445',
    store: "Lowe's",
    category: 'Tools & Hardware',
    originalRetailPrice: 179.0,
    clearancePrice: 89.0, // Yellow tag clearance
    totalCouponSavings: 21.36,
    finalNetBuyCost: 67.64,
    estResalePrice: 139.0,
    estNetProfit: 50.51,
    roiPct: 75,
    isMoneymaker: false,
    hackType: 'Multi-Tier Stack',
    coupledCoupons: [
      {
        id: 'c-lowes-mvp',
        name: "Lowe's MVPs Pro $20 off $100 Coupon (Prorated)",
        type: 'Store Digital Coupon',
        discountValue: 17.8,
        discountType: 'flat',
        codeOrClip: 'MVP-PRO-20',
        appSource: "Lowe's MVPs Rewards"
      },
      {
        id: 'c-lowes-card',
        name: "Lowe's Advantage Card 5% Instant Savings",
        type: 'Store Card 5% / Pro Perk',
        discountValue: 3.56,
        discountType: 'flat',
        appSource: "Lowe's Credit Card"
      }
    ],
    hunterVerifiedDate: 'Verified Today',
    popularityScore: 91
  },
  {
    id: 'couple-deal-8',
    title: 'Oral-B Pro 1000 CrossAction Electric Toothbrush Set',
    brand: 'Oral-B',
    skuOrUpc: '069055125946',
    store: 'CVS / Walgreens',
    category: 'Health & Beauty',
    originalRetailPrice: 49.99,
    clearancePrice: 24.99, // 50% seasonal beauty clearance
    totalCouponSavings: 23.0,
    finalNetBuyCost: 1.99,
    estResalePrice: 39.99,
    estNetProfit: 31.99,
    roiPct: 1608,
    isMoneymaker: true,
    hackType: 'Rebate Moneymaker',
    coupledCoupons: [
      {
        id: 'c-cvs-oralb-mfg',
        name: 'Oral-B Digital Manufacturer Coupon',
        type: 'Manufacturer Digital Coupon',
        discountValue: 10.0,
        discountType: 'flat',
        codeOrClip: 'ORALB-10-MFR',
        appSource: 'CVS ExtraCare App'
      },
      {
        id: 'c-cvs-extrabucks',
        name: 'Buy $20 Get $10 ExtraBucks Rewards Event',
        type: 'Store Digital Coupon',
        discountValue: 10.0,
        discountType: 'flat',
        appSource: 'CVS ExtraCare Card'
      },
      {
        id: 'c-cvs-ibotta-oralb',
        name: 'Ibotta Electric Dental Care Rebate',
        type: 'Cashback Rebate (Ibotta/Fetch)',
        discountValue: 3.0,
        discountType: 'flat',
        appSource: 'Ibotta App'
      }
    ],
    hunterVerifiedDate: 'Verified 3 hrs ago',
    popularityScore: 97
  },
  {
    id: 'couple-deal-9',
    title: 'Coleman Montana 8-Person Family Camping Tent',
    brand: 'Coleman',
    skuOrUpc: '076501064230',
    store: 'Walmart',
    category: 'Seasonal & Outdoor',
    originalRetailPrice: 179.0,
    clearancePrice: 49.0, // .00 Floor drop
    totalCouponSavings: 10.98,
    finalNetBuyCost: 38.02,
    estResalePrice: 119.0,
    estNetProfit: 63.13,
    roiPct: 166,
    isMoneymaker: false,
    hackType: 'Multi-Tier Stack',
    coupledCoupons: [
      {
        id: 'c-wm-cash-ibotta',
        name: 'Walmart Cash / Ibotta Outdoor Manufacturer Rebate',
        type: 'Cashback Rebate (Ibotta/Fetch)',
        discountValue: 10.0,
        discountType: 'flat',
        appSource: 'Walmart App / Ibotta'
      },
      {
        id: 'c-wm-card-rebate',
        name: 'Capital One Walmart Rewards 2% In-Store',
        type: 'Store Card 5% / Pro Perk',
        discountValue: 0.98,
        discountType: 'flat',
        appSource: 'Walmart Rewards Card'
      }
    ],
    hunterVerifiedDate: 'Verified 5 hrs ago',
    popularityScore: 88
  },
  {
    id: 'couple-deal-10',
    title: 'Bauer 20V Cordless 1/2 in. High Torque Impact Wrench',
    brand: 'Bauer',
    skuOrUpc: 'Item 58466 / 792363584664',
    store: 'Harbor Freight',
    category: 'Tools & Hardware',
    originalRetailPrice: 139.99,
    clearancePrice: 79.99, // As-Is Orange clearance tag
    totalCouponSavings: 24.0,
    finalNetBuyCost: 55.99,
    estResalePrice: 109.99,
    estNetProfit: 37.5,
    roiPct: 67,
    isMoneymaker: false,
    hackType: 'Multi-Tier Stack',
    coupledCoupons: [
      {
        id: 'c-hft-itc-clearance',
        name: 'Inside Track Club (ITC) 30% Off Clearance Under $100',
        type: 'Store Digital Coupon',
        discountValue: 24.0,
        discountType: 'flat',
        appSource: 'Harbor Freight ITC App',
        terms: 'Stacks on open-box and orange-tag clearance items for ITC members.'
      }
    ],
    hunterVerifiedDate: 'Verified Yesterday',
    popularityScore: 86
  }
];

export const MOCK_STORE_COUPONS: StoreCouponOffer[] = [
  {
    id: 'sc-1',
    store: 'Dollar General',
    title: '$5.00 OFF $25.00+ Saturday Digital Store Coupon',
    code: 'AUTO-CLIPPED IN DG APP',
    discountDescription: '$5 off total basket when spend reaches $25 pre-tax on Saturdays',
    categoryScope: 'Storewide (Stacks on Clearance & Penny Deals)',
    minimumSpend: 25.0,
    expiresOn: 'Every Saturday (Weekly Auto-Renew)',
    clipUrl: 'https://www.dollargeneral.com/coupons.html',
    isStackableWithClearance: true,
    isStackableWithManufacturer: true,
    hunterNotes: 'The crown jewel of arbitrage coupon stacking. Use on already 50%-70% marked down items to drop out-of-pocket costs to pennies.'
  },
  {
    id: 'sc-2',
    store: 'Target',
    title: '20% Off Home, Small Appliances & Floor Care Circle Bonus',
    code: 'TARGET-CIRCLE-20',
    discountDescription: '20% off qualifying home items in Target App Circle wallet',
    categoryScope: 'Small Appliances, Vacuums, Bedding, Kitchenware',
    minimumSpend: 0,
    expiresOn: 'Ends Sunday',
    clipUrl: 'https://www.target.com/circle',
    isStackableWithClearance: true,
    isStackableWithManufacturer: true,
    hunterNotes: 'Directly stacks on top of red clearance stickers (.98, .04). Also triggers an additional 5% off if paying with Circle RedCard.'
  },
  {
    id: 'sc-3',
    store: 'Home Depot',
    title: '$20.00 OFF $100.00+ Pro Xtra Quarterly Coupon',
    code: 'PRO-Q3-SAVE20',
    discountDescription: '$20 off purchase of $100 or more with scanned Pro Xtra barcode',
    categoryScope: 'Hardware, Electrical, Power Tools, Plumbing',
    minimumSpend: 100.0,
    expiresOn: 'End of Month',
    clipUrl: 'https://www.homedepot.com/proxtra',
    isStackableWithClearance: true,
    isStackableWithManufacturer: false,
    hunterNotes: 'Can be scanned at Self-Checkout or Pro register. Works on yellow tag markdown items.'
  },
  {
    id: 'sc-4',
    store: "Lowe's",
    title: '$20.00 OFF $100.00+ MVPs Rewards Member Offer',
    code: 'MVP-FALL-20',
    discountDescription: '$20 off your total purchase of $100 or more in-store or online',
    categoryScope: 'Tools, Building Materials, Outdoor Equipment',
    minimumSpend: 100.0,
    expiresOn: '14 Days Remaining',
    clipUrl: 'https://www.lowes.com/l/pro/mvps',
    isStackableWithClearance: true,
    isStackableWithManufacturer: false,
    hunterNotes: 'Stacks with yellow clearance tags. Pair with 5% Lowe’s Advantage Card for maximum savings.'
  },
  {
    id: 'sc-5',
    store: 'Harbor Freight',
    title: '30% Off Any As-Is / Clearance Item Under $100 (ITC Members)',
    code: 'ITC-CLEARANCE-30',
    discountDescription: '30% off any orange-sticker clearance or open box unit under $100',
    categoryScope: 'Orange Tag Clearance & Open-Box Tools',
    minimumSpend: 0,
    expiresOn: 'Continuous ITC Benefit',
    clipUrl: 'https://www.harborfreight.com/insidetrack',
    isStackableWithClearance: true,
    isStackableWithManufacturer: false,
    hunterNotes: 'Invaluable for power tool arbitrage. Takes already-discounted 40% returns down by another 30%.'
  },
  {
    id: 'sc-6',
    store: 'Walmart',
    title: '$10.00 Back in Walmart Cash on Select Camping & Outdoor Gear',
    code: 'WM-CASH-OUTDOOR',
    discountDescription: 'Earn $10 instant Walmart Cash on outdoor equipment $40+',
    categoryScope: 'Camping, Hunting, Fishing, Patio',
    minimumSpend: 40.0,
    expiresOn: 'This Week',
    clipUrl: 'https://www.walmart.com/walmartcash',
    isStackableWithClearance: true,
    isStackableWithManufacturer: true,
    hunterNotes: 'Walmart Cash can be applied immediately to the next transaction or cashed out via Ibotta.'
  },
  {
    id: 'sc-7',
    store: 'CVS / Walgreens',
    title: '$10 ExtraBucks Rewards when you spend $20 on P&G Beauty / Oral Care',
    code: 'CVS-EXTRABUCKS-10',
    discountDescription: 'Instant $10 receipt coupon voucher upon paying for qualifying items',
    categoryScope: 'Crest, Oral-B, Gillette, Pantene, Olay',
    minimumSpend: 20.0,
    expiresOn: 'Weekly Cycle',
    clipUrl: 'https://www.cvs.com/extracare',
    isStackableWithClearance: true,
    isStackableWithManufacturer: true,
    hunterNotes: 'The $20 threshold is calculated BEFORE digital manufacturer coupons are deducted. This creates huge moneymakers!'
  }
];

/**
 * Universal Auto-Coupler Algorithm:
 * Scans any item (name, price, store, category) and applies the optimal stack of:
 * - Store Coupon / Promo
 * - Manufacturer Digital Coupon
 * - Store Card Perk (5% or Pro 5%)
 * - Cashback / Rebate (Ibotta, Fetch, Walmart Cash)
 */
export function autoCoupleCustomItem(
  name: string,
  buyPrice: number,
  store: string,
  category: string = 'General'
): {
  coupledDeal: AutoCoupledDeal;
  appliedLayers: AppliedCouponLayer[];
  totalSaved: number;
  finalPrice: number;
  boostedProfit: number;
  boostedRoi: number;
  isMoneymaker: boolean;
} {
  const price = Math.max(0.01, buyPrice);
  const lowerName = name.toLowerCase();
  const lowerStore = store.toLowerCase();
  const layers: AppliedCouponLayer[] = [];

  let currentPrice = price;

  // 1. Check Store Discounts & Promos
  if (lowerStore.includes('dollar general') || lowerStore.includes('dg')) {
    if (price >= 5.0) {
      // Prorated Saturday spend coupon
      const satDiscount = Math.min(price * 0.2, 5.0);
      layers.push({
        id: `auto-dg-sat-${Date.now()}`,
        name: 'DG Saturday $5/$25 Stacker (Prorated)',
        type: 'Saturday Spend Multiplier',
        discountValue: parseFloat(satDiscount.toFixed(2)),
        discountType: 'flat',
        codeOrClip: 'SATURDAY-SAVE-5',
        appSource: 'DG Digital App',
        terms: 'Applies automatically to carts reaching $25 spend threshold on Saturdays.'
      });
      currentPrice = Math.max(0.01, currentPrice - satDiscount);
    }
  } else if (lowerStore.includes('target')) {
    const circleDiscount = parseFloat((price * 0.15).toFixed(2));
    layers.push({
      id: `auto-tgt-circle-${Date.now()}`,
      name: 'Target Circle 15% Category Bonus Clip',
      type: 'Store Digital Coupon',
      discountValue: circleDiscount,
      discountType: 'flat',
      codeOrClip: 'CIRCLE-BONUS-15',
      appSource: 'Target Circle Wallet',
      terms: 'Stacks on top of standard clearance stickers.'
    });
    currentPrice = Math.max(0.01, currentPrice - circleDiscount);

    // RedCard 5%
    const redcardVal = parseFloat((currentPrice * 0.05).toFixed(2));
    if (redcardVal > 0.1) {
      layers.push({
        id: `auto-tgt-redcard-${Date.now()}`,
        name: 'Target Circle Card 5% Instant Savings',
        type: 'Store Card 5% / Pro Perk',
        discountValue: redcardVal,
        discountType: 'flat',
        appSource: 'Target RedCard'
      });
      currentPrice = Math.max(0.01, currentPrice - redcardVal);
    }
  } else if (lowerStore.includes('home depot') || lowerStore.includes('depot')) {
    if (price >= 50.0) {
      const proDiscount = parseFloat((price * 0.1).toFixed(2));
      layers.push({
        id: `auto-hd-pro-${Date.now()}`,
        name: 'Home Depot Pro Xtra / Tool Event 10% Clip',
        type: 'Store Digital Coupon',
        discountValue: Math.min(20.0, proDiscount),
        discountType: 'flat',
        codeOrClip: 'PRO-SAVE-10',
        appSource: 'Home Depot Pro Wallet'
      });
      currentPrice = Math.max(0.01, currentPrice - Math.min(20.0, proDiscount));
    }
  } else if (lowerStore.includes("lowe's") || lowerStore.includes('lowes')) {
    if (price >= 40.0) {
      const lowesDiscount = parseFloat((price * 0.1).toFixed(2));
      layers.push({
        id: `auto-lowes-mvp-${Date.now()}`,
        name: "Lowe's MVPs Member 10% Savings Pass",
        type: 'Store Digital Coupon',
        discountValue: Math.min(20.0, lowesDiscount),
        discountType: 'flat',
        codeOrClip: 'MVP-TIER-10',
        appSource: "Lowe's Rewards App"
      });
      currentPrice = Math.max(0.01, currentPrice - Math.min(20.0, lowesDiscount));
    }
    // 5% Lowe's card
    const cardVal = parseFloat((currentPrice * 0.05).toFixed(2));
    if (cardVal > 0.1) {
      layers.push({
        id: `auto-lowes-card-${Date.now()}`,
        name: "Lowe's Advantage Card 5% Instant",
        type: 'Store Card 5% / Pro Perk',
        discountValue: cardVal,
        discountType: 'flat',
        appSource: "Lowe's Credit"
      });
      currentPrice = Math.max(0.01, currentPrice - cardVal);
    }
  } else if (lowerStore.includes('harbor freight')) {
    const itcVal = parseFloat((price * 0.2).toFixed(2));
    layers.push({
      id: `auto-hft-itc-${Date.now()}`,
      name: 'Harbor Freight ITC 20% Member Markdown',
      type: 'Store Digital Coupon',
      discountValue: itcVal,
      discountType: 'flat',
      appSource: 'Inside Track Club'
    });
    currentPrice = Math.max(0.01, currentPrice - itcVal);
  }

  // 2. Check Manufacturer Digital Coupon Match by Keywords
  if (
    lowerName.includes('gain') ||
    lowerName.includes('tide') ||
    lowerName.includes('downy') ||
    lowerName.includes('detergent')
  ) {
    layers.push({
      id: `auto-mfg-laundry-${Date.now()}`,
      name: 'P&G Good Everyday $3.00 Fabric Care Digital Coupon',
      type: 'Manufacturer Digital Coupon',
      discountValue: Math.min(3.0, currentPrice - 0.01),
      discountType: 'flat',
      codeOrClip: 'PG-FABRIC-300',
      appSource: 'P&G Digital Manufacturer Portal'
    });
    currentPrice = Math.max(0.01, currentPrice - Math.min(3.0, currentPrice - 0.01));
  } else if (
    lowerName.includes('crest') ||
    lowerName.includes('colgate') ||
    lowerName.includes('toothpaste') ||
    lowerName.includes('oral')
  ) {
    layers.push({
      id: `auto-mfg-oral-${Date.now()}`,
      name: 'Oral Health $2.00 Manufacturer Paperless Coupon',
      type: 'Manufacturer Digital Coupon',
      discountValue: Math.min(2.0, currentPrice - 0.01),
      discountType: 'flat',
      codeOrClip: 'ORAL-CARE-200',
      appSource: 'Manufacturer Digital Network'
    });
    currentPrice = Math.max(0.01, currentPrice - Math.min(2.0, currentPrice - 0.01));
  } else if (
    lowerName.includes('dewalt') ||
    lowerName.includes('milwaukee') ||
    lowerName.includes('makita') ||
    lowerName.includes('ryobi') ||
    lowerName.includes('drill') ||
    lowerName.includes('saw') ||
    lowerName.includes('tool')
  ) {
    if (price >= 30) {
      layers.push({
        id: `auto-mfg-tool-${Date.now()}`,
        name: 'Manufacturer Power Tool Instant Rebate Credit',
        type: 'Manufacturer Digital Coupon',
        discountValue: 5.0,
        discountType: 'flat',
        codeOrClip: 'TOOL-MFR-5',
        appSource: 'Brand Instant Savings'
      });
      currentPrice = Math.max(0.01, currentPrice - 5.0);
    }
  } else if (
    lowerName.includes('lego') ||
    lowerName.includes('pokemon') ||
    lowerName.includes('toy') ||
    lowerName.includes('hasbro')
  ) {
    if (price >= 15) {
      layers.push({
        id: `auto-mfg-toy-${Date.now()}`,
        name: 'Toy Brand $3.00 Instant Digital Manufacturer Coupon',
        type: 'Manufacturer Digital Coupon',
        discountValue: 3.0,
        discountType: 'flat',
        appSource: 'Toy Club Digital'
      });
      currentPrice = Math.max(0.01, currentPrice - 3.0);
    }
  }

  // 3. Check Cashback Rebates (Ibotta, Fetch, Card Cash)
  let rebateAmount = 0;
  if (price >= 20.0) {
    rebateAmount = 3.5;
  } else if (price >= 8.0) {
    rebateAmount = 1.5;
  } else {
    rebateAmount = 0.5;
  }

  layers.push({
    id: `auto-rebate-ibotta-${Date.now()}`,
    name: 'Ibotta & Fetch Stackable In-Store Cash Rebate',
    type: 'Cashback Rebate (Ibotta/Fetch)',
    discountValue: rebateAmount,
    discountType: 'flat',
    appSource: 'Ibotta / Fetch Rewards',
    terms: 'Scan store receipt within 7 days of purchase to receive cash deposit.'
  });
  currentPrice = currentPrice - rebateAmount;

  const totalSaved = parseFloat((price - Math.max(0, currentPrice)).toFixed(2));
  const finalPrice = Math.max(0, parseFloat(currentPrice.toFixed(2)));
  const isMoneymaker = currentPrice <= 0.05;

  // Approximate resale value if not given (typically 2.2x of clearance or standard MSRP)
  const estResale = parseFloat((price * 2.1 + 8.0).toFixed(2));
  const estProfit = parseFloat((estResale - finalPrice - estResale * 0.15 - 4.5).toFixed(2));
  const estRoi = finalPrice > 0 ? Math.round((estProfit / finalPrice) * 100) : 1000;

  const coupledDeal: AutoCoupledDeal = {
    id: `custom-coupled-${Date.now()}`,
    title: name.trim() || 'Custom Arbitrage Item',
    skuOrUpc: 'AUTO-DETECTED',
    store,
    category,
    originalRetailPrice: parseFloat((price * 1.8).toFixed(2)),
    clearancePrice: price,
    totalCouponSavings: totalSaved,
    finalNetBuyCost: finalPrice,
    estResalePrice: estResale,
    estNetProfit: estProfit,
    roiPct: estRoi,
    isMoneymaker,
    hackType: isMoneymaker ? 'Rebate Moneymaker' : 'Multi-Tier Stack',
    coupledCoupons: layers,
    hunterVerifiedDate: 'Auto-Coupled Just Now',
    popularityScore: 99
  };

  return {
    coupledDeal,
    appliedLayers: layers,
    totalSaved,
    finalPrice,
    boostedProfit: estProfit,
    boostedRoi: estRoi,
    isMoneymaker
  };
}
