export interface DealDiagnosticReport {
  overallScore: number; // 0-100
  ratingTier: 'Elite S-Tier' | 'Solid Winner' | 'Moderate Flip' | 'High Risk / Speculative' | 'Do Not Buy';
  salesVelocityScore: number; // 0-100
  estimatedDaysToSell: string;
  priceTankingRisk: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Severe Tanking Expected';
  priceTankingReason: string;
  brandGatingStatus: 'Ungated / Open' | 'Requires Brand Approval' | 'Gated (Invoice Required)' | 'Hazmat / Restricted';
  gatingNotes: string;
  breakEvenFloor: number;
  marginOfSafetyPct: number;
  recommendedChannel: 'Amazon FBA' | 'eBay (Buyer Pays Ship)' | 'Facebook Marketplace (Local Cash)' | 'Mercari / Poshmark' | 'TCGPlayer Direct';
  channelReason: string;
  hunterTactics: string[];
}

export function analyzeDealDiagnostic(
  title: string,
  buyPrice: number,
  sellPrice: number,
  category: string = 'General',
  store: string = 'Retail'
): DealDiagnosticReport {
  const cleanTitle = title.toLowerCase();
  const cleanCat = category.toLowerCase();

  // Determine Brand Gating
  let brandGatingStatus: DealDiagnosticReport['brandGatingStatus'] = 'Ungated / Open';
  let gatingNotes = 'No known brand restrictions on Amazon or eBay. Safe for standard seller accounts.';

  if (
    cleanTitle.includes('lego') ||
    cleanTitle.includes('dewalt') ||
    cleanTitle.includes('milwaukee') ||
    cleanTitle.includes('apple') ||
    cleanTitle.includes('sony') ||
    cleanTitle.includes('dyson')
  ) {
    brandGatingStatus = 'Gated (Invoice Required)';
    gatingNotes = 'Major tier-1 brand. Amazon typically requires 10-unit distributor invoice or authorization letter. Best flipped on eBay, Mercari, or local pickup.';
  } else if (
    cleanTitle.includes('disney') ||
    cleanTitle.includes('hasbro') ||
    cleanTitle.includes('mattel') ||
    cleanTitle.includes('barbie') ||
    cleanTitle.includes('pokemon') ||
    cleanTitle.includes('pokémon')
  ) {
    brandGatingStatus = 'Requires Brand Approval';
    gatingNotes = 'Subject to auto-ungating for accounts in good standing, or ungate via receipt on eBay/Mercari.';
  } else if (
    cleanTitle.includes('lithium') ||
    cleanTitle.includes('battery') ||
    cleanTitle.includes('aerosol') ||
    cleanTitle.includes('spray') ||
    cleanTitle.includes('solvent')
  ) {
    brandGatingStatus = 'Hazmat / Restricted';
    gatingNotes = 'Classified as hazardous materials on Amazon FBA. Must ship via ground courier or sell locally.';
  }

  // Calculate Net and Break-Even
  const estShip = buyPrice <= 0.04 ? 4.5 : sellPrice > 80 ? 9.5 : 5.0;
  const platformFeePct = 0.135; // average marketplace cut
  // Break-even formula: Sell * (1 - feePct) - ship = buyPrice => Sell = (buyPrice + ship) / (1 - feePct)
  const breakEvenFloor = Math.round(((buyPrice + estShip) / (1 - platformFeePct)) * 100) / 100;
  const netProfit = Math.max(0, sellPrice * (1 - platformFeePct) - estShip - buyPrice);
  const marginOfSafetyPct = sellPrice > 0 ? Math.round(((sellPrice - breakEvenFloor) / sellPrice) * 100) : 0;

  // Price Tanking Risk
  let priceTankingRisk: DealDiagnosticReport['priceTankingRisk'] = 'Low Risk';
  let priceTankingReason = 'Isolated single-unit or deep clearance. Low likelihood of widespread competitor price collapse.';

  if (buyPrice <= 0.04) {
    priceTankingRisk = 'Moderate Risk';
    priceTankingReason = 'Penny items and .04 salvages often leak on social media groups, causing temporary supply bumps on eBay within 48-72 hours.';
  } else if (cleanTitle.includes('pokemon') || cleanTitle.includes('tcg') || cleanTitle.includes('booster')) {
    priceTankingRisk = 'Low Risk';
    priceTankingReason = 'High liquidity and sustained collector demand buffer against market crashes.';
  } else if (store.toLowerCase().includes('walmart') && cleanTitle.includes('toy')) {
    priceTankingRisk = 'High Risk';
    priceTankingReason = 'Walmart national seasonal resets drop identical inventory at 4,000+ stores simultaneously. Expect race-to-the-bottom on Amazon within 1 week.';
  }

  // Sales Velocity
  let salesVelocityScore = 80;
  let estimatedDaysToSell = '1 - 3 Days';

  if (cleanCat.includes('tcg') || cleanTitle.includes('pokemon') || cleanTitle.includes('booster')) {
    salesVelocityScore = 96;
    estimatedDaysToSell = 'Within 24 Hours';
  } else if (cleanCat.includes('tool') || cleanTitle.includes('dewalt') || cleanTitle.includes('drill')) {
    salesVelocityScore = 92;
    estimatedDaysToSell = '1 - 2 Days';
  } else if (cleanCat.includes('toy') || cleanTitle.includes('lego')) {
    salesVelocityScore = 88;
    estimatedDaysToSell = '2 - 4 Days';
  } else if (cleanCat.includes('apparel') || cleanTitle.includes('shoes')) {
    salesVelocityScore = 65;
    estimatedDaysToSell = '7 - 14 Days';
  } else if (cleanCat.includes('seasonal') || cleanCat.includes('holiday')) {
    salesVelocityScore = 72;
    estimatedDaysToSell = '3 - 7 Days (Sell before holiday ends!)';
  }

  // Best Resale Channel
  let recommendedChannel: DealDiagnosticReport['recommendedChannel'] = 'eBay (Buyer Pays Ship)';
  let channelReason = 'Fastest liquidity with lowest barrier to entry; no strict brand gating requirement.';

  if (brandGatingStatus === 'Ungated / Open' && sellPrice >= 45 && !cleanTitle.includes('liquid')) {
    recommendedChannel = 'Amazon FBA';
    channelReason = 'Highest price point and automatic Prime Buy Box exposure. Maximum profit multiplier.';
  } else if (cleanCat.includes('tcg') || cleanTitle.includes('card') || cleanTitle.includes('pokemon')) {
    recommendedChannel = 'TCGPlayer Direct';
    channelReason = 'Dedicated trading card collector base with lowest commission rate and fast turnaround.';
  } else if (sellPrice > 150 && (cleanCat.includes('tool') || cleanCat.includes('outdoor'))) {
    recommendedChannel = 'Facebook Marketplace (Local Cash)';
    channelReason = 'Zero fees, immediate zero-risk cash in hand, and eliminates heavy shipping weight fees.';
  }

  // Tactical Guidelines
  const hunterTactics: string[] = [];
  if (buyPrice <= 0.04) {
    hunterTactics.push('Self-Checkout Caution: Never ask a store cashier to price-check penny items or announce the price. Use self-checkout or scan app.');
    hunterTactics.push('Bundle Strategy: If multiple identical penny units are found, bundle in lots of 3 or 5 on eBay to multiply profit per shipping label.');
  } else {
    hunterTactics.push(`Price Floor Buffer: Your break-even is $${breakEvenFloor.toFixed(2)}. Never lower price below this threshold even if competitors undercut.`);
  }

  if (brandGatingStatus === 'Gated (Invoice Required)') {
    hunterTactics.push('Channel Selection: Do not attempt Amazon FBA without authorization. List on eBay as "New in Box / Factory Sealed" with high-res photos.');
  }

  if (cleanTitle.includes('box') || cleanTitle.includes('kit') || cleanTitle.includes('set')) {
    hunterTactics.push('Condition Audit: Inspect outer cardboard corners for tears or clearance sticker residue before shipping to avoid "Item Not As Described" returns.');
  } else {
    hunterTactics.push('Fast Turnaround: List within 24 hours of store purchase before regional clearance waves hit national marketplaces.');
  }

  // Composite Score
  let overallScore = Math.round(
    salesVelocityScore * 0.35 +
    Math.min(100, Math.max(0, marginOfSafetyPct * 1.2)) * 0.35 +
    (priceTankingRisk === 'Low Risk' ? 95 : priceTankingRisk === 'Moderate Risk' ? 75 : 50) * 0.15 +
    (brandGatingStatus === 'Ungated / Open' ? 95 : 65) * 0.15
  );
  overallScore = Math.min(99, Math.max(35, overallScore));

  let ratingTier: DealDiagnosticReport['ratingTier'] = 'Solid Winner';
  if (overallScore >= 90) ratingTier = 'Elite S-Tier';
  else if (overallScore >= 78) ratingTier = 'Solid Winner';
  else if (overallScore >= 62) ratingTier = 'Moderate Flip';
  else if (overallScore >= 48) ratingTier = 'High Risk / Speculative';
  else ratingTier = 'Do Not Buy';

  return {
    overallScore,
    ratingTier,
    salesVelocityScore,
    estimatedDaysToSell,
    priceTankingRisk,
    priceTankingReason,
    brandGatingStatus,
    gatingNotes,
    breakEvenFloor,
    marginOfSafetyPct,
    recommendedChannel,
    channelReason,
    hunterTactics,
  };
}
