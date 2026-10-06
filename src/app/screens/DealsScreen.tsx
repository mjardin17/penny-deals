import React, { useCallback, useEffect, useRef, useState } from "react";
import { getJson, messageOf, postJson } from "../api";
import { roiLabel } from "../format";

interface Hit {
  post: { source: string; id: string; title: string; url: string; publishedAt: string; score?: number };
  kind: "penny" | "clearance" | "pokemon";
  store: string | null;
  price: number | null;
  inStore: boolean;
  nearest: { name: string; address: string; miles: number } | null;
  action: string;
}

interface Source {
  name: string;
  state: "ok" | "failed" | "skipped";
  detail: string;
}

interface OtherPost {
  post: Hit["post"];
  price: number | null;
}

interface Feed {
  zip: string;
  place: string;
  hits: Hit[];
  checked: number;
  others: OtherPost[];
  sources: Source[];
  fetchedAt: string;
  stale?: boolean;
  staleReason?: string;
}

interface Spread {
  bestRealSpread?: { channel: string; resalePrice?: number; profit?: { netProfit: number; roiPct: number | null } } | null;
  channels: { channel: string; status: string; statusMessage: string; resalePrice?: number; profit?: { netProfit: number; roiPct: number | null } }[];
}

const ZIP_KEY = "pennyDealsZip";
const KIND_LABEL: Record<Hit["kind"], string> = { penny: "Penny", clearance: "Clearance", pokemon: "Pokémon" };
const STORE_LABEL: Record<string, string> = { homeDepot: "Home Depot", lowes: "Lowe's", bestBuy: "Best Buy", walmart: "Walmart", target: "Target", gameStop: "GameStop" };

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

function ResaleCheck({ hit }: { hit: Hit }) {
  const [state, setState] = useState<{ busy: boolean; result?: Spread; error?: string }>({ busy: false });
  if (hit.price === null || hit.kind === "pokemon") return null;

  async function run() {
    setState({ busy: true });
    try {
      // The price comes from a post, not from you at a shelf, so it is deliberately not remembered.
      const result = await postJson<Spread>("/api/arbitrage/spread", {
        title: hit.post.title,
        buyPrice: hit.price,
        store: hit.store ? STORE_LABEL[hit.store] : undefined,
        category: hit.kind,
        source: "ebay-arbitrage",
      });
      setState({ busy: false, result });
    } catch (err) {
      setState({ busy: false, error: messageOf(err) });
    }
  }

  const best = state.result?.bestRealSpread;
  return (
    <div className="pd-stack" style={{ gap: 8 }}>
      <button className="pd-btn pd-btn--small pd-btn--ghost" onClick={run} disabled={state.busy} style={{ justifySelf: "start" }}>
        {state.busy ? "Checking eBay…" : "Check resale"}
      </button>
      {state.error && <div className="pd-banner pd-banner--bad" role="alert">{state.error}</div>}
      {state.result && best?.profit && (
        <div className="pd-banner pd-banner--info">
          <strong>Real spread:</strong> resale <span className="pd-mono">${best.resalePrice?.toFixed(2)}</span>, net{" "}
          <span className="pd-mono">${best.profit.netProfit.toFixed(2)}</span> after fees ({roiLabel(best.profit.roiPct)}).
        </div>
      )}
      {state.result && !best && (
        <div className="pd-banner">
          Not a spread. {state.result.channels.find((c) => c.status === "ok" && c.profit)
            ? `Best net would be $${state.result.channels.find((c) => c.profit)?.profit?.netProfit.toFixed(2)}, under the $10 and 50% bar.`
            : state.result.channels.map((c) => c.statusMessage).join(" ")}
        </div>
      )}
    </div>
  );
}

export function DealsScreen() {
  const [zip, setZip] = useState(savedZip);
  const [input, setInput] = useState(savedZip);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOthers, setShowOthers] = useState(false);

  // Only the newest request may update the screen, so a slow answer for an old ZIP can't overwrite a newer one.
  const latestRequest = useRef(0);

  const load = useCallback(async (z: string) => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getJson<Feed>(`/api/deals/today${z ? `?zip=${encodeURIComponent(z)}` : ""}`);
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

  return (
    <div className="pd-stack">
      <div>
        <h1 className="pd-h1">Deals today</h1>
        <p className="pd-lede">Real posts from the last day and a half that match penny, clearance or Pokémon finds, sorted by the closest store. Every one links to its source.</p>
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
        <button className="pd-btn" type="submit">Find deals</button>
        {feed && (
          <span className="pd-small pd-muted">
            {feed.place} · updated {ago(feed.fetchedAt)}
          </span>
        )}
      </form>

      {error && <div className="pd-banner pd-banner--bad" role="alert">{error}</div>}
      {feed?.stale && (
        <div className="pd-banner pd-banner--warn">
          Showing the last good answer from {ago(feed.fetchedAt)}. A refresh just failed: {feed.staleReason}
        </div>
      )}

      {feed && feed.sources.some((s) => s.state === "failed" && !s.name.includes("OpenStreetMap")) && (
        <div className="pd-banner pd-banner--warn" role="status">
          Some deal sources failed, so this list may be missing posts:{" "}
          {feed.sources.filter((s) => s.state === "failed" && !s.name.includes("OpenStreetMap")).map((s) => s.name).join(", ")}. Details are under "Where this came from".
        </div>
      )}

      {loading && (
        <>
          <p className="pd-small pd-muted" role="status" style={{ margin: 0 }}>
            Checking live posts and nearby stores. The first search can take up to half a minute.
          </p>
          <div className="pd-skeleton" />
          <div className="pd-skeleton" />
        </>
      )}

      {feed && !loading && (
        <p className="pd-small" style={{ margin: 0 }}>
          <strong>{feed.checked}</strong> posts checked, <strong>{feed.hits.length}</strong> matched penny, clearance or Pokémon at a store near you.
        </p>
      )}

      {!loading && feed && feed.hits.length === 0 && (
        <div className="pd-banner pd-banner--info">
          No new penny, clearance or Pokémon posts matched near {feed.place} in the last day and a half. That is a real answer, not an error. The sources checked are listed below.
        </div>
      )}

      {feed?.hits.map((hit) => (
        <article key={hit.post.id + hit.post.source} className="pd-card pd-hit">
          <div className="pd-spread">
            <div className="pd-row" style={{ gap: 6 }}>
              <span className={`pd-chip pd-chip--${hit.kind}`}>{KIND_LABEL[hit.kind]}</span>
              {hit.store && <span className="pd-chip">{STORE_LABEL[hit.store] ?? hit.store}</span>}
              {hit.inStore && <span className="pd-chip">In store</span>}
            </div>
            {hit.price !== null && <div className="pd-hit__price">${hit.price.toFixed(2)}</div>}
          </div>
          <div className="pd-hit__title">{hit.post.title}</div>
          <p className="pd-small pd-muted" style={{ margin: 0 }}>{hit.action}</p>
          {hit.nearest && (
            <p className="pd-small" style={{ margin: 0 }}>
              Nearest: {hit.nearest.name}, {hit.nearest.address} <span className="pd-mono pd-muted">({hit.nearest.miles.toFixed(1)} mi)</span>
            </p>
          )}
          <div className="pd-row">
            <a className="pd-small" style={{ color: "var(--pd-info)" }} href={hit.post.url} target="_blank" rel="noreferrer">
              Open the post ({hit.post.source}, {ago(hit.post.publishedAt)})
            </a>
          </div>
          <ResaleCheck hit={hit} />
        </article>
      ))}

      {feed && feed.others.length > 0 && (
        <div className="pd-stack">
          <button className="pd-btn pd-btn--ghost" onClick={() => setShowOthers((v) => !v)} aria-expanded={showOthers}>
            {showOthers ? "Hide everything else" : `Show everything else (${feed.others.length} of ${feed.checked - feed.hits.length})`}
          </button>
          {showOthers && (
            <>
              <p className="pd-small pd-muted" style={{ margin: 0 }}>
                Real posts that did not match the filter, newest first. The price is only what the title says. Nothing here has been checked against a store.
              </p>
              {feed.others.map((o) => (
                <article key={o.post.id + o.post.source} className="pd-card pd-hit">
                  <div className="pd-spread">
                    <span className="pd-chip">{o.post.source}</span>
                    {o.price !== null && <div className="pd-hit__price">${o.price.toFixed(2)}</div>}
                  </div>
                  <div className="pd-hit__title">{o.post.title}</div>
                  <a className="pd-small" style={{ color: "var(--pd-info)" }} href={o.post.url} target="_blank" rel="noreferrer">
                    Open the post ({ago(o.post.publishedAt)})
                  </a>
                </article>
              ))}
            </>
          )}
        </div>
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
