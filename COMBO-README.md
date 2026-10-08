# Penny Deals + Lucifer Arbitrage Combo

The barcode scanner app (penny-deals) merged with the Lucifer resale-profit
engine. One app: scan in the store, get a buy / don't-buy verdict with real math.
See `README.md` for the screens, fee tables and safety rules.

## What it is

- **Screens:** Scan, Deals today, Cards, My scans, Connections, Tools
  (Spread Finder, Profit Calculator, coupon admin).
- **Server layer:** eBay Catalog + Browse API providers, sold-history provider,
  Amazon Creators provider, capability manager, cache + rate limiters.
- **Spread engine:** `server/arbitrage/spreadEngine.ts`. Scan, live eBay/Amazon
  comps, real fees, REAL SPREAD flag. A spread only flags when comps are
  confirmed, the title match is confident, every fee comes from a verified
  table, and profit clears $10 / 50% ROI.
- **Cards:** photo read (Gemini) plus Pokémon TCG database lookup and centering
  measurement. Centering is a ceiling, not a grade.

## Run it

```bash
npm install
cp .env.example .env   # then fill in the keys you have
npm run dev            # http://localhost:3000 (set PORT to change)
npm test
npm run typecheck
```

## Keys (all optional; the app says "not configured" instead of guessing)

See `.env.example` for the full list. The main ones:

- `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET`: eBay Browse + Catalog APIs.
- `GEMINI_API_KEY`: reading a card photo. Search by name and number works without it.
- `POKEMONTCG_API_KEY`: optional, raises the card-database rate limit.
- `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`: Reddit deal source for the digest.
- Amazon Creators credentials: the Amazon channel reports `not_configured` until set.

## API

- `POST /api/arbitrage/spread` `{title, buyPrice, upc?, store?, pkg?}`
- `POST /api/arbitrage/spread-batch` `{items: [...]}`
- `POST /api/ebay/catalog-match`, `/api/ebay/browse-search`
- `POST /api/marketplace/sold-history`, `GET /api/marketplace/capabilities`
- `POST /api/amazon/search`, `/api/amazon/get-products`
- `GET /api/fees/sources` (fee table provenance)
- `/api/cards/*` (identify, search, card, grade-summary, grade-result)
