import React, { useCallback, useEffect, useRef, useState } from "react";
import { getJson, messageOf, postJson } from "../api";
import { sourceProblems } from "../format";

interface BestBuyStore {
  storeId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  distanceMiles: number | null;
  lowStock: boolean;
}

interface BestBuyItem {
  sku: number;
  name: string;
  url: string | null;
  salePrice: number | null;
  regularPrice: number | null;
  onlineAvailability: boolean;
  inStoreAvailability: boolean;
  orderable: string | null;
  releaseDate: string | null;
  nearbyStores: BestBuyStore[] | null;
  storeCheckError?: string;
}

interface CommunityHit {
  post: { source: string; id: string; title: string; url: string; publishedAt: string };
  store: string | null;
  price: number | null;
  inStore: boolean;
  nearest: { name: string; address: string; miles: number } | null;
  action: string;
}

type SightingStatus = "on_shelf" | "low" | "behind_counter" | "sold_out";
type SightingStore = "walmart" | "target" | "bestBuy" | "gameStop" | "costco" | "samsClub" | "pokemonCenter" | "other";

interface Sighting {
  id: string;
  createdAt: string;
  zip: string;
  store: SightingStore;
  location: string;
  product: string;
  status: SightingStatus;
  note: string;
}

interface PokemonSet {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  upcoming: boolean;
}

interface Source {
  name: string;
  state: "ok" | "failed" | "skipped";
  detail: string;
}

interface Alerts {
  enabled: boolean;
  reason: string;
  zip?: string;
  everyMinutes?: number;
  lastRunAt?: string;
  lastAlertCount?: number;
  lastError?: string;
  note?: string;
}

interface Feed {
  zip: string;
  fetchedAt: string;
  bestBuy: BestBuyItem[];
  community: CommunityHit[];
  sightings: Sighting[];
  releases: PokemonSet[];
  sources: Source[];
  alerts: Alerts;
}

const ZIP_KEY = "pennyDealsZip";
const STORE_LABEL: Record<string, string> = {
  walmart: "Walmart",
  target: "Target",
  bestBuy: "Best Buy",
  gameStop: "GameStop",
  costco: "Costco",
  samsClub: "Sam's Club",
  pokemonCenter: "Pokémon Center",
  other: "Other store",
};
const STATUS_LABEL: Record<SightingStatus, string> = {
  on_shelf: "On the shelf",
  low: "A few left",
  behind_counter: "Behind the counter",
  sold_out: "Sold out",
};

function savedZip(): string {
  try {
    return localStorage.getItem(ZIP_KEY) || "";
  } catch {
    return "";
  }
}

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 48 ? `${hrs} hr ago` : `${Math.round(hrs / 24)} days ago`;
}

function sourceFor(feed: Feed, name: string): Source | undefined {
  return feed.sources.find((s) => s.name === name);
}

function SightingForm({ zip, onSaved }: { zip: string; onSaved: () => void }) {
  const [store, setStore] = useState<SightingStore>("target");
  const [status, setStatus] = useState<SightingStatus>("on_shelf");
  const [location, setLocation] = useState("");
  const [product, setProduct] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<{ busy: boolean; error?: string; done?: boolean }>({ busy: false });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ busy: true });
    try {
      await postJson("/api/drops/sightings", { zip, store, status, location, product, note });
      setLocation("");
      setProduct("");
      setNote("");
      setState({ busy: false, done: true });
      onSaved();
    } catch (err) {
      setState({ busy: false, error: messageOf(err) });
    }
  }

  return (
    <form className="pd-card pd-stack" onSubmit={submit}>
      <strong>Report what you saw</strong>
      <p className="pd-small pd-muted" style={{ margin: 0 }}>
        Shared with anyone using this app near ZIP {zip.slice(0, 3)}xx for 48 hours. Don't include your name or anything personal.
      </p>
      <div className="pd-row">
        <select className="pd-input" value={store} onChange={(e) => setStore(e.target.value as SightingStore)} aria-label="Store">
          {Object.entries(STORE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select className="pd-input" value={status} onChange={(e) => setStatus(e.target.value as SightingStatus)} aria-label="What you saw">
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <input className="pd-input" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} placeholder="Which store (town or street)" aria-label="Which store" required />
      <input className="pd-input" value={product} onChange={(e) => setProduct(e.target.value)} maxLength={80} placeholder="What was there (for example Prismatic Evolutions ETB)" aria-label="Product" required />
      <input className="pd-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Note (optional, for example limit 2 per person)" aria-label="Note" />
      <button className="pd-btn" type="submit" disabled={state.busy || !/^\d{5}$/.test(zip)} style={{ justifySelf: "start" }}>
        {state.busy ? "Saving…" : "Share report"}
      </button>
      {state.error && <div className="pd-banner pd-banner--bad" role="alert">{state.error}</div>}
      {state.done && <div className="pd-banner pd-banner--info" role="status">Thanks. Your report is in the list above.</div>}
    </form>
  );
}

export function DropsScreen() {
  const [zip, setZip] = useState(savedZip);
  const [input, setInput] = useState(savedZip);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latestRequest = useRef(0);

  const load = useCallback(async (z: string) => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getJson<Feed>(`/api/drops${z ? `?zip=${encodeURIComponent(z)}` : ""}`);
      if (requestId !== latestRequest.current) return;
      setFeed(data);
      setInput((current) => current || data.zip);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setFeed(null);
      setError(messageOf(err));
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(zip);
  }, [zip, load]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{5}$/.test(input)) {
      setError("Enter a 5-digit ZIP code.");
      return;
    }
    try {
      localStorage.setItem(ZIP_KEY, input);
    } catch {
      // The ZIP just won't be remembered.
    }
    setZip(input);
  }

  const problems = feed ? sourceProblems(feed.sources) : { failed: [], skipped: [] };
  const bb = feed ? sourceFor(feed, "Best Buy API") : undefined;
  const bbInStock = feed?.bestBuy.filter((i) => i.onlineAvailability || (i.nearbyStores?.length ?? 0) > 0) ?? [];
  const bbOut = feed?.bestBuy.filter((i) => !bbInStock.includes(i)) ?? [];
  const feedZip = feed?.zip ?? zip;

  return (
    <div className="pd-stack">
      <div>
        <h1 className="pd-h1">Pokémon drops</h1>
        <p className="pd-lede">
          Best Buy stock straight from Best Buy's API, restock posts from Reddit and Slickdeals, reports from people using this app, and the newest sets. Target, Walmart and Pokémon Center publish no stock data, so for those the posts and reports are what there is.
        </p>
      </div>

      <form className="pd-row" onSubmit={submit}>
        <input
          className="pd-input pd-mono"
          style={{ width: 130 }}
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
          inputMode="numeric"
          placeholder="ZIP"
          aria-label="ZIP code"
        />
        <button className="pd-btn" type="submit">Check drops</button>
        {feed && <span className="pd-small pd-muted">updated {ago(feed.fetchedAt)}</span>}
      </form>

      {error && <div className="pd-banner pd-banner--bad" role="alert">{error}</div>}

      {feed && (
        <div className={`pd-banner ${feed.alerts.enabled ? "pd-banner--info" : ""}`} role="status">
          <strong>Discord alerts:</strong>{" "}
          {feed.alerts.enabled
            ? `on for ZIP ${feed.alerts.zip}, checking every ${feed.alerts.everyMinutes} minutes.${feed.alerts.lastRunAt ? ` Last check ${ago(feed.alerts.lastRunAt)}, ${feed.alerts.lastAlertCount ?? 0} alert(s) sent.` : ""}`
            : feed.alerts.reason}
          {feed.alerts.note && <> {feed.alerts.note}</>}
          {feed.alerts.lastError && <> Last check failed: {feed.alerts.lastError}</>}
        </div>
      )}

      {feed && (problems.failed.length > 0 || problems.skipped.length > 0) && (
        <div className="pd-banner pd-banner--warn" role="status">
          Some sources weren't checked, so this may be missing drops.
          {problems.failed.length > 0 && <> Failed: {problems.failed.join(", ")}.</>}
          {problems.skipped.length > 0 && <> Not set up: {problems.skipped.join(", ")}.</>} Details are under "Where this came from".
        </div>
      )}

      {loading && (
        <>
          <p className="pd-small pd-muted" role="status" style={{ margin: 0 }}>Checking Best Buy, live posts and reports. This can take up to half a minute.</p>
          <div className="pd-skeleton" />
        </>
      )}

      {feed && !loading && (
        <>
          <h2 className="pd-h2">Best Buy</h2>
          {bb?.state === "skipped" && <div className="pd-banner">{bb.detail}</div>}
          {bb?.state === "failed" && <div className="pd-banner pd-banner--bad">{bb.detail}</div>}
          {bb?.state === "ok" && bbInStock.length === 0 && (
            <div className="pd-banner pd-banner--info">Best Buy shows none of its {feed.bestBuy.length} Pokémon TCG products buyable online or in a store near {feedZip} right now.</div>
          )}
          {bbInStock.map((item) => (
            <article key={item.sku} className="pd-card pd-hit">
              <div className="pd-spread">
                <div className="pd-row" style={{ gap: 6 }}>
                  <span className="pd-chip pd-chip--pokemon">Best Buy</span>
                  {item.onlineAvailability && <span className="pd-chip pd-chip--working">Online</span>}
                  {(item.nearbyStores?.length ?? 0) > 0 && <span className="pd-chip pd-chip--working">In store nearby</span>}
                  {item.orderable && item.orderable !== "Available" && <span className="pd-chip">{item.orderable}</span>}
                </div>
                {item.salePrice !== null && <div className="pd-hit__price">${item.salePrice.toFixed(2)}</div>}
              </div>
              <div className="pd-hit__title">{item.name}</div>
              {item.nearbyStores?.map((s) => (
                <p key={s.storeId} className="pd-small" style={{ margin: 0 }}>
                  {s.name}, {s.address}, {s.city} {s.distanceMiles !== null && <span className="pd-mono pd-muted">({s.distanceMiles.toFixed(1)} mi)</span>}
                  {s.lowStock && <strong> · low stock</strong>}
                </p>
              ))}
              {item.url && (
                <a className="pd-small" style={{ color: "var(--pd-info)" }} href={item.url} target="_blank" rel="noreferrer">
                  Open on bestbuy.com (SKU {item.sku})
                </a>
              )}
            </article>
          ))}
          {bbOut.length > 0 && (
            <details className="pd-card">
              <summary style={{ cursor: "pointer" }}>Not available near you right now ({bbOut.length})</summary>
              <ul className="pd-small" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {bbOut.map((i) => (
                  <li key={i.sku}>
                    {i.name}
                    {i.storeCheckError ? ` (store check failed: ${i.storeCheckError})` : i.inStoreAvailability && i.nearbyStores === null ? " (store not checked this refresh)" : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <h2 className="pd-h2">Restock posts</h2>
          {feed.community.length === 0 && (
            <div className="pd-banner pd-banner--info">No Pokémon TCG restock posts in the last day and a half from the sources that answered.</div>
          )}
          {feed.community.map((hit) => (
            <article key={hit.post.source + hit.post.id} className="pd-card pd-hit">
              <div className="pd-spread">
                <div className="pd-row" style={{ gap: 6 }}>
                  <span className="pd-chip pd-chip--pokemon">{hit.post.source}</span>
                  {hit.store && <span className="pd-chip">{STORE_LABEL[hit.store] ?? hit.store}</span>}
                  {hit.inStore && <span className="pd-chip">In store</span>}
                </div>
                {hit.price !== null && <div className="pd-hit__price">${hit.price.toFixed(2)}</div>}
              </div>
              <div className="pd-hit__title">{hit.post.title}</div>
              <p className="pd-small pd-muted" style={{ margin: 0 }}>{hit.action}</p>
              <a className="pd-small" style={{ color: "var(--pd-info)" }} href={hit.post.url} target="_blank" rel="noreferrer">
                Open the post ({ago(hit.post.publishedAt)})
              </a>
            </article>
          ))}

          <h2 className="pd-h2">Reports from people here</h2>
          <p className="pd-small pd-muted" style={{ margin: 0 }}>Typed in by people using Penny Deals. Not checked by anyone, so treat them as tips.</p>
          {feed.sightings.length === 0 && <div className="pd-banner">No reports near {feedZip.slice(0, 3)}xx in the last 48 hours.</div>}
          {feed.sightings.map((s) => (
            <article key={s.id} className="pd-card pd-hit">
              <div className="pd-row" style={{ gap: 6 }}>
                <span className="pd-chip">{STORE_LABEL[s.store]}</span>
                <span className={`pd-chip ${s.status === "sold_out" ? "pd-chip--failing" : "pd-chip--working"}`}>{STATUS_LABEL[s.status]}</span>
                <span className="pd-small pd-muted">{ago(s.createdAt)}</span>
              </div>
              <div className="pd-hit__title">{s.product}</div>
              <p className="pd-small" style={{ margin: 0 }}>{s.location}{s.note ? ` · ${s.note}` : ""}</p>
            </article>
          ))}
          <SightingForm zip={feedZip} onSaved={() => void load(feedZip)} />

          <h2 className="pd-h2">Newest sets</h2>
          {feed.releases.length > 0 ? (
            <div className="pd-card">
              <ul className="pd-small" style={{ margin: 0, paddingLeft: 18 }}>
                {feed.releases.map((s) => (
                  <li key={s.id}>
                    <strong>{s.name}</strong> ({s.series}): {s.upcoming ? "releases" : "released"} <span className="pd-mono">{s.releaseDate}</span>
                  </li>
                ))}
              </ul>
              <p className="pd-small pd-muted" style={{ margin: "8px 0 0" }}>From pokemontcg.io, which usually lists a set close to its release, so sets announced far ahead may be missing.</p>
            </div>
          ) : (
            <div className="pd-banner">The set list didn't load. Details are under "Where this came from".</div>
          )}
        </>
      )}

      {feed && (
        <details className="pd-card">
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>Where this came from ({feed.sources.length} sources)</summary>
          <dl className="pd-kv" style={{ marginTop: 12 }}>
            {feed.sources.map((s) => (
              <React.Fragment key={s.name}>
                <dt>
                  <span className={`pd-chip pd-chip--${s.state === "ok" ? "working" : s.state === "failed" ? "failing" : "off"}`}>{s.state}</span>
                </dt>
                <dd style={{ fontFamily: "var(--pd-body)" }}>
                  <strong>{s.name}</strong>
                  <div className="pd-small pd-muted">{s.detail}</div>
                </dd>
              </React.Fragment>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}
