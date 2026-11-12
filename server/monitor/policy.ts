/**
 * What each retailer's own terms say about automated access, checked 2026-11-12, and how the monitor
 * may read it. A retailer whose terms forbid automated access is marked "disallowed" and is never
 * fetched. robots.txt is checked separately at run time, before every page fetch.
 */

import { RetailerId } from "./types";

export interface RetailerPolicy {
  host: string;
  /** official_api: a published developer API. page: public product pages, gated by robots.txt. none: nothing is fetched. */
  method: "official_api" | "page" | "none";
  terms: "allowed" | "disallowed" | "unverified";
  termsNote: string;
}

export const POLICIES: Record<RetailerId, RetailerPolicy> = {
  target: {
    host: "www.target.com",
    method: "none",
    terms: "disallowed",
    termsNote:
      'Target\'s terms forbid "data extraction, scraping, mining or other data gathering tools" and say "other automated or unauthorized agentic tools are expressly prohibited". Its robots.txt also refused our fetcher. Store inventory by product number would use Target\'s internal API, which falls under the same terms.',
  },
  walmart: {
    host: "www.walmart.com",
    method: "none",
    terms: "disallowed",
    termsNote:
      'Walmart\'s terms forbid using "any robot, spider ... or other manual or automatic device to retrieve, index, \'scrape\' ... any Materials" without written consent. Its robots.txt also disallows /api/ and its store-stock endpoints.',
  },
  gamestop: {
    host: "www.gamestop.com",
    method: "page",
    terms: "unverified",
    termsNote:
      "Couldn't read GameStop's terms or robots.txt from here, so nothing confirms either way. Product pages are read only if robots.txt allows them at run time. No store-level inventory: GameStop publishes no store-stock endpoint that could be checked.",
  },
  bestBuy: {
    host: "api.bestbuy.com",
    method: "official_api",
    terms: "allowed",
    termsNote: "Read through Best Buy's official Developer API, which exists for this. Its terms allow only temporary caching. Needs BESTBUY_API_KEY.",
  },
  pokemonCenter: {
    host: "www.pokemoncenter.com",
    method: "page",
    terms: "unverified",
    termsNote:
      "Pokémon Center sits behind Imperva/Incapsula bot protection; even its robots.txt answered with a challenge on 2026-11-12. The monitor asks for robots.txt once per run, reports blocked if it's walled, and never goes further.",
  },
};
