# Penny Deals + Lucifer Arbitrage Combo

The barcode scanner app (penny-deals) merged with the Amazon Lucifer
arbitrage engine (Ebay-amazon-app). One app: scan in the store, get a
buy/don't-buy verdict with real math.

## What it is

- **Base:** penny-deals `feat/arbitrage-merge` branch (scanner UI, deal hubs,
  ArbitrageHub with Spread Finder / Profit Calculator / VeRO Check /
  Amazon Ungating / Temu + Alibaba scanners, real fee tables, tests).
- **Merged in:** Lucifer's server layer — eBay Catalog + Browse API providers,
  sold-history provider, Amazon Creators provider, Gemini research routes,
  capability manager, cache + rate limiters.
- **New:** `server/arbitrage/spreadEngine.ts` — scan → live eBay/Amazon
  comps → real fees → REAL SPREAD flag. A spread only flags when comps are
  confirmed, the title match is confident, every fee comes from a verified
  table, and profit clears $10 / 50% ROI.

## Verified state (2026-09-18, built and tested here)

- 40/40 tests pass (`npm test`)
- `tsc --noEmit` clean
- `npm run build` clean (client bundle + server.cjs)
- Server booted, `/api/health` ok, `/api/arbitrage/spread` returns honest
  `not_configured` per channel when keys are absent — never invented numbers.

## Run it

```bash
npm install
cp .env.example .env   # then fill in keys (see below)
npm run dev            # server + client on http://localhost:3000
```

## Keys (all optional — the app degrades honestly without them)

- `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` — eBay Browse + Catalog APIs.
  Free at developer.ebay.com. Without these, the eBay channel reports
  `not_configured` and the AI tabs still work.
- `GEMINI_API_KEY` — VeRO check, Temu/Alibaba scanners, Boxem ungating.
  Without it those tabs report "not configured".
- Amazon Creators credentials — PARKED. The Amazon channel reports
  `not_configured` until you decide to wire it. Nothing is invented.

## API

- `POST /api/arbitrage/spread` `{title, buyPrice, upc?, store?, pkg?}`
- `POST /api/arbitrage/spread-batch` `{items: [...]}`
- `POST /api/ebay/catalog-match`, `/api/ebay/browse-search`
- `POST /api/marketplace/sold-history`, `GET /api/marketplace/capabilities`
- `POST /api/gemini/vero-check`, `/api/gemini/temu-sold-search`, `/api/gemini/alibaba-sold-search`
- `POST /api/amazon/asin-lookup` (honest parked status without creds)
- `GET /api/fees/sources` (fee table provenance)
