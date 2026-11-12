# Penny Deals — Handoff

Last verified: 2026-10-01. Everything below was checked live, not from memory.

## Where everything is

- **Repo**: https://github.com/mjardin17/penny-deals, branch `feat/arbitrage-merge`
- **Local folder**: `C:\Users\jjard\claude\penny-deals-lucifer-combo`
- **Current HEAD**: `e4edecb` — pushed, matches origin exactly
- **Tests**: see the 2026-10-06 section at the bottom for the current count. (Older figure: 84/84 passing (`npm test`). `npx tsc --noEmit` clean. `npm run build` clean.)

## What's running right now

| Thing | Status |
|---|---|
| Dev server (`npm run dev`, port 3000) | Running |
| Tailscale (this PC) | Connected, IP `100.86.23.40` |
| Tailscale Serve HTTPS | Live at `https://jardins.tailecd816.ts.net` |
| Scheduled digest task (`PennyDealsDailyDigest`) | Ran successfully this morning (8:00 AM, exit code 0), next run tomorrow 8:00 AM |

**Phone URL**: `https://jardins.tailecd816.ts.net/phone.html` — works whenever your phone is on Tailscale and this PC has the dev server up. If the server isn't running, start it with `npm run dev` from the project folder.

## What's built and fully working

1. **Core app** (pre-existing) — scanner UI, deal hubs, the real eBay/Amazon arbitrage engine (Spread Finder, Profit Calculator), fee tables.
2. **Learning loop** (`server/learning/`) — every spread check logs a prediction; manual bought/sold feedback + weekly eBay rechecks close the loop; accuracy only computed from real recorded outcomes, never invented; digest gets a "what I learned this week" section.
3. **Phone PWA** (`phone.html`, `src/phone/`) — installable, camera barcode scan → real spread check → buy/don't-buy verdict, "My Scans" feedback tab. Camera had a real bug (React StrictMode race + an unhandled `video.play()` rejection) — both fixed and committed. **Not yet confirmed working on a real device after the latest fix** — last thing you need to do is reload the page fresh and check.
4. **Multi-provider AI orchestrator** (`server/ai/`) — VeRO Check, Amazon Ungating, Temu Scanner, Alibaba Scanner all route through Gemini → OpenAI → Anthropic, whichever is configured. **Currently inactive — all three keys are empty.**
5. **Multi-source coupon layer** (`server/coupons/`) — real internal coupon store (add/deactivate via the new Coupons tab), digest "Top coupons" section, coupon badge + Claim button on verdict views. Amazon links get your Associates tag appended automatically — **once you provide it**. Four real affiliate-network adapters (Rakuten, Impact, CJ, Sovrn) are wired for credentials but intentionally left as honest `not_implemented` scaffolds — their real API docs are gated behind an approved-publisher signup I don't have.
6. **Tailscale HTTPS access** — working, private, no public exposure (replaced the earlier Cloudflare quick tunnel, which is no longer in use).
7. **Basic auth** (`server/basicAuth.ts`) — built but currently off (`TUNNEL_BASIC_AUTH_USER/PASS` empty in `.env`), since Tailscale is private and doesn't need it. Only relevant again if you ever expose this server publicly.

## The three things that need you, not more code

1. **A real AI key** (any one of these turns on VeRO/Ungating/Temu/Alibaba):
   - `GEMINI_API_KEY` — free at aistudio.google.com, no credit card
   - `OPENAI_API_KEY` — platform.openai.com (not your ChatGPT login)
   - `ANTHROPIC_API_KEY` — console.anthropic.com (not your Claude.ai login)
2. **`AMAZON_PARTNER_TAG`** — your real Amazon Associates tag, so coupon Claim links actually earn you something. Currently empty in `.env`.
3. **Confirm the camera works** on your phone after the latest fix. If it still doesn't, reload fresh, allow camera access, wait a few seconds, and screenshot the camera box + the small gray `diag:` line underneath it — that tells me exactly what's happening without guessing.

All three are literally just paste-the-value-into-`.env` or test-and-screenshot — no further building required on any of them.

## Explicitly NOT done, and why

- **Rakuten/Impact/CJ/Sovrn coupon feeds**: scaffolded, not functional. Their real API docs are behind an approved-publisher login per network — sign up (free) with whichever one you want, send me the resulting docs/sample response, and I'll finish the real integration fast since all the surrounding plumbing already works.
- **Pokémon restock schedules**: researched thoroughly (see chat history) — no official schedule exists anywhere, for anyone. Only community-observed patterns exist (sourced, dated, in the chat). The app will not scrape retailer sites to chase this — every tool that claims to do better is doing exactly that, against retailer ToS, and this app already got blocked once trying it honestly (Home Depot/Best Buy, documented in the digest's own source list).
- **Auto-Coupler tab** (`AutoCouponMaximizer.tsx`) — pre-existing feature using hardcoded mock data. Deliberately left untouched and unmerged with the new real coupon system; it's a different feature (coupon-stacking) from what I built (real coupon codes).

## Separate projects, deliberately not touched from here

- **`ai-orchestra`** (github.com/mjardin17/ai-orchestra) — a multi-agent orchestration app you're building, Python/FastAPI, built by a different Claude session. Genuinely impressive scope (council-based routing, model tiers, subscription-login support for Claude/ChatGPT without API keys). Not cloned or touched in this session.
- **Empire OS** (`C:\Users\jjard\empire-os`) — a much bigger project (AI YouTube factory + planned multi-module platform). Has its own explicit architecture freeze you set in July 2026 ("do not build Empire Assistant until the 6 core services are stable and tested"). **Still needs your attention**: this project's real work (20 commits — the architecture freeze, StoryForge phases 0-6, CrossPost Enterprise integration, Electron wrapper) is sitting **completely unpushed**, only on this PC. GitHub (`github.com/mjardin17/video-machine`) only has a lone placeholder "Initial commit" with unrelated history. I asked whether to force-push the real history over it; you redirected to Penny Deals before answering, so **I never pushed it — it's still a single point of failure on this machine.** Worth doing in a dedicated Empire OS session soon.
- **BossListers** — kept fully separate per your standing instruction, not touched at all this session.

## Hardening pass — 2026-10-06 (branch `feat/super-app`)

From the security, code and TypeScript reviews. Tests: 252 passing, `npx tsc --noEmit` clean.

Done: photo reads limited to 5/min plus a daily cap (`GEMINI_DAILY_CAP`); a $0, empty or non-numeric price is refused on the client and in `parseCandidate`; the sold-price route refuses null/empty/0 and returns what the brain decided; a $0-cost deal no longer crashes the Deals screen and every screen sits inside an ErrorBoundary; if every deal source fails nothing is cached and the screen says so, with a warning banner when only some fail; the Profit calculator starts empty; grades can be saved for `tcgdex:` cards; Cards and Deals ignore stale answers; simultaneous deal lookups for one ZIP share one fetch; coupon links must be https; `.env.example` no longer ships a placeholder Gemini key.

Bind: the server now listens on 127.0.0.1 by default (was 0.0.0.0). Tailscale Serve forwards to localhost, so the phone URL should keep working; verify from the phone. Set HOST=0.0.0.0 only deliberately, and the server warns if no Basic Auth password is set.

Still open: the Profit calculator's weight (1 lb) and box size (10x8x4) start with defaults that are not real; the Amazon/TikTok/eBay fee tables are real published rates.

## Pokémon drops — 2026-11-12 (branch `feat/pokemon-drop-alerts`, PR into `feat/super-app`)

New **Drops** tab (`src/app/screens/DropsScreen.tsx`) and `server/drops/`:

- **Best Buy** (`server/drops/bestBuy.ts`): Best Buy's official Products API plus its per-SKU store-availability endpoint. Needs `BESTBUY_API_KEY`. Not yet run against a real key: field names follow Best Buy's docs, and tests use hand-written fixtures in that shape.
- **Restock posts**: the same Reddit and Slickdeals feed as Deals, filtered to Pokémon TCG (one shared cache, `sharedLiveDeals()`). Reddit still needs `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET`.
- **User sightings** (`server/drops/sightings.ts`): reports typed in on the Drops screen, shared within the same 3-digit ZIP area for 48 hours, labelled unverified.
- **Newest sets** (`server/drops/releases.ts`): pokemontcg.io set list with release dates.
- **Discord alerts** (`server/drops/watcher.ts`, `discord.ts`): every 10 minutes, alerts on newly buyable/in-stock Best Buy items and new Pokémon posts. The first check only records; a source outage doesn't cause repeat alerts; all @-pings are blocked. Needs `DISCORD_DROPS_WEBHOOK_URL` and `DROP_ALERTS_ZIP` (or `DIGEST_ZIP`). Runs only while the server runs.

Deliberately not built: Target, Walmart, Pokémon Center, GameStop or Costco stock. None of them publish it, and getting it means scraping against their terms (see "Explicitly NOT done" above).
