/**
 * Centralized Marketplace Capabilities & Integration Status Manager
 *
 * Tracks capability states:
 * - available
 * - restricted
 * - not_configured
 * - deprecated
 * - rate_limited
 * - authentication_failed
 *
 * Enforces rule: "Do not treat 'API key exists' as equivalent to 'API capability works.'"
 */

import { CapabilityInfo, MarketplaceCapabilitiesReport } from "./types";
import { amazonProvider, AmazonCreatorsProvider } from "./amazonProvider";
import { ebayMarketplaceProvider, EbayMarketplaceProvider } from "./ebayProvider";
import { soldHistoryProvider, SoldHistoryProvider } from "./soldHistoryProvider";

export class MarketplaceCapabilityManager {
  private amazon: AmazonCreatorsProvider;
  private ebay: EbayMarketplaceProvider;
  private soldHistory: SoldHistoryProvider;

  constructor(
    amazon: AmazonCreatorsProvider = amazonProvider,
    ebay: EbayMarketplaceProvider = ebayMarketplaceProvider,
    soldHistory: SoldHistoryProvider = soldHistoryProvider
  ) {
    this.amazon = amazon;
    this.ebay = ebay;
    this.soldHistory = soldHistory;
  }

  /**
   * Generates comprehensive report of all marketplace capabilities
   */
  public async getFullReport(): Promise<MarketplaceCapabilitiesReport> {
    const [amazonCatalog, ebayCatalog, ebayBrowse, ebayInsights] = await Promise.all([
      this.amazon.getCapabilityStatus(),
      this.ebay.getCatalogCapabilityStatus(),
      this.ebay.getBrowseCapabilityStatus(),
      this.soldHistory.getCapabilityStatus(),
    ]);

    // OffersV2 capability
    const amazonOffers: CapabilityInfo = {
      id: "amazon_creators_offers",
      name: "Amazon Creators OffersV2 & Pricing API",
      provider: "amazon-creators",
      state: amazonCatalog.state,
      message:
        amazonCatalog.state === "available"
          ? "OffersV2 resource access active."
          : amazonCatalog.message,
      lastChecked: Date.now(),
      documentationUrl: "https://creators.amazon.com/api/documentation",
      requiredCredentials: amazonCatalog.requiredCredentials,
    };

    // Legacy status markers for deprecated APIs
    const deprecatedPaApi: CapabilityInfo = {
      id: "amazon_paapi_5",
      name: "Amazon Product Advertising API 5.0 (PA-API 5)",
      provider: "amazon-creators",
      state: "deprecated",
      message: "DEPRECATED: PA-API 5 access has been superseded by the official Amazon Creators API with OAuth 2.0 and OffersV2.",
      lastChecked: Date.now(),
      requiredCredentials: [],
    };

    const deprecatedEbayProductApi: CapabilityInfo = {
      id: "ebay_product_api",
      name: "eBay Legacy Product API",
      provider: "ebay-catalog",
      state: "deprecated",
      message: "DEPRECATED: Legacy eBay Product API decommissioned; successfully migrated to eBay Catalog API product_summary ePID matching.",
      lastChecked: Date.now(),
      requiredCredentials: [],
    };

    return {
      timestamp: Date.now(),
      capabilities: {
        amazon_creators_catalog: amazonCatalog,
        amazon_creators_offers: amazonOffers,
        ebay_catalog_matching: ebayCatalog,
        ebay_browse_search: ebayBrowse,
        ebay_marketplace_insights: ebayInsights,
        amazon_paapi_5: deprecatedPaApi,
        ebay_product_api: deprecatedEbayProductApi,
      },
    };
  }
}

// Singleton instance
export const marketplaceCapabilityManager = new MarketplaceCapabilityManager();
