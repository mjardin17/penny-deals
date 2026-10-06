# Penny Deals

Penny and clearance hunting app, with the arbitrage engine from `Ebay-amazon-app` merged in.

## Run

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev                  # http://localhost:3000 (Express + Vite)
npm test                     # fees, spread engine, digest, cards, brain, routes and screens' helpers
npm run typecheck && npm run build && npm start
```

## Daily deal digest

```bash
npm run digest -- --zip 02745          # or set DIGEST_ZIP
```

Writes `digests/YYYY-MM-DD.md` with penny drops and clearance at Home Depot, Lowe's, Best Buy and Walmart, plus Pokémon TCG deals. For each hit it lists the item, the store, the price as posted, what to do, and a link to the source post. Hits are sorted closest-first, using real branch locations from OpenStreetMap.

Only real, linkable posts are included. Missing prices stay "not stated", and downvoted posts are dropped.

| Source | Status |
| --- | --- |
| Slickdeals RSS | Automated |
| Reddit | Only with `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` (unauthenticated access is blocked) |
| BrickSeek, retailer sites | Not automated (no public API / bot-blocked); the digest says so |
| eBay / Amazon resale check | Only with marketplace API credentials |

To run it daily on Windows, create a Task Scheduler task that runs `npm run digest` in this folder.

## Arbitrage

The **💸 Arbitrage** tab has:

- **Spread Finder**: takes an item and a buy price, checks live eBay Browse and Amazon Creators API prices, and applies real fees. A spread is flagged only when comps are confirmed, the title match is confident, every fee table is verified, and the item clears $10 net profit and 50% ROI.
- **Profit Calculator**: compares eBay, Amazon FBA, Amazon FBM and TikTok Shop side by side, with break-even prices.
- **VeRO check, Amazon ungating, Temu and Alibaba scanners**: Gemini estimates, clearly labelled. They are never counted as real spreads.

Clicking a deal in any hub prefills the Spread Finder.

### Fee tables (`shared/fees`, retrieved 2026-09-18)

| Table | Basis |
| --- | --- |
| eBay final value fees | eBay help page (official) |
| Amazon referral fees | sell.amazon.com/pricing (official) |
| Amazon FBA, standard size (Jan 15 2026 rates, +3.5% fuel from Apr 17 2026) | Two independent sources that match |
| Amazon FBA, bulky / extra-large | **Unverified**: sources disagree; results are flagged |
| TikTok Shop referral, 8% since Aug 4 2026 | Multiple sources agree |
| USPS commercial postage (Jul 12 2026) | USPS Notice 123 (official) |

Source URLs are in `shared/fees/meta.ts` and at `GET /api/fees/sources`. Re-check them when a platform announces a fee change.

## Safety rules the app enforces

- **Real data only.** A price of $0, an empty price or a made-up default is refused (shelf price, sold price, Profit calculator start empty). If every deal source fails, the Deals screen says so instead of showing "no deals".
- **Limits.** Card photo reads: 5 per minute per device plus `GEMINI_DAILY_CAP` per day. Other routes have their own per-minute limits (see `server/app.ts`).
- **Coupon links** must be https; anything else is refused when saved and never shown as a link.
- **Binding.** The server listens on 127.0.0.1 by default. `HOST=0.0.0.0` opens it to the network and prints a warning unless a Basic Auth password is set.
- **Keys** live only in `.env` / `.env.local` (git-ignored). `GEMINI_API_KEY` must be empty, not a placeholder, when you have none.
