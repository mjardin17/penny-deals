import React, { useEffect, useMemo, useRef, useState } from "react";
import { getJson, messageOf, postJson, ApiFailure } from "../api";
import { preparePhoto, PreparedPhoto } from "../cardPhoto";
import { CenteringResult, measureCentering } from "../../../shared/cards/centering";
import { centeringForSave, GRADE_COMPANIES, GRADE_VALUES, validGradeChoice } from "../cardGrade";
import { centeringGradeCap, CENTERING_SOURCE } from "../../../shared/cards/gradeCap";

interface PriceBlock {
  currency: string;
  updatedAt?: string;
  variants: Record<string, Record<string, number>>;
}
interface Card {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  set: { name: string; printedTotal?: number; releaseDate?: string };
  image?: string;
  tcgplayer?: PriceBlock;
  cardmarket?: PriceBlock;
}
interface Ask {
  count: number;
  lowest: number;
  median: number;
  basis: string;
}
interface CardDetail {
  card: Card;
  value: { database: { tcgplayer?: PriceBlock; cardmarket?: PriceBlock } | null; ebayRaw: Ask | null; ebayPsa10: Ask | null; notes: string[] };
}
interface Identified {
  read: { name?: string; number?: string; printedTotal?: string; setName?: string; confidence: string };
  candidates: Card[];
}
interface GradeSummary {
  count: number;
  verdict: string;
}

const usd = (n: number) => `$${n.toFixed(2)}`;
const cardLabel = (c: Card) => `${c.name} ${c.number}${c.set.printedTotal ? `/${c.set.printedTotal}` : ""}`;

function PriceTable({ block, title }: { block: PriceBlock; title: string }) {
  const sym = block.currency === "EUR" ? "€" : "$";
  return (
    <div>
      <div className="pd-small pd-muted" style={{ marginBottom: 6 }}>
        {title}
        {block.updatedAt ? `, as of ${block.updatedAt}` : ""}
      </div>
      <dl className="pd-kv">
        {Object.entries(block.variants).map(([variant, prices]) => (
          <React.Fragment key={variant}>
            <dt>{variant === "all" ? "Overall" : variant.replace(/([A-Z])/g, " $1").toLowerCase()}</dt>
            <dd>
              {Object.entries(prices)
                .map(([k, v]) => `${k} ${sym}${v.toFixed(2)}`)
                .join("  ")}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}

function AskLine({ label, ask }: { label: string; ask: Ask | null }) {
  if (!ask) return <><dt>{label}</dt><dd>none found right now</dd></>;
  return (
    <>
      <dt>{label}</dt>
      <dd>
        {ask.count} listed, lowest {usd(ask.lowest)}, middle {usd(ask.median)}
      </dd>
    </>
  );
}

export function CardsScreen() {
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [centering, setCentering] = useState<CenteringResult | null>(null);
  const [identified, setIdentified] = useState<Identified | null>(null);
  const [candidates, setCandidates] = useState<Card[]>([]);
  const [detail, setDetail] = useState<CardDetail | null>(null);
  // One flag per kind of request, so a slow card lookup never shows as "reading the photo" and vice versa.
  const [photoBusy, setPhotoBusy] = useState(false);
  const [identifyBusy, setIdentifyBusy] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  // Which photo the card on screen was picked against. Centering is saved only when it matches the measured photo.
  const [detailPhotoId, setDetailPhotoId] = useState<number | null>(null);
  const [measuredPhotoId, setMeasuredPhotoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [searchNumber, setSearchNumber] = useState("");
  const [company, setCompany] = useState("");
  const [grade, setGrade] = useState("");
  const [summary, setSummary] = useState<GradeSummary | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Newest-request-wins counters: a slow answer for an old photo, search or card must not overwrite a newer one.
  const photoSeq = useRef(0);
  const listSeq = useRef(0);
  const detailSeq = useRef(0);
  const summarySeq = useRef(0);
  const photoIdRef = useRef<number | null>(null);
  const saveInFlight = useRef(false);

  useEffect(() => {
    const mine = ++summarySeq.current;
    getJson<GradeSummary>("/api/cards/grade-summary")
      .then((next) => {
        if (mine === summarySeq.current) setSummary(next);
      })
      .catch(() => {
        if (mine === summarySeq.current) setSummary(null);
      });
  }, []);

  // Photo, search and card pickers wait while any lookup is running, so answers cannot cross.
  const lookupRunning = photoBusy || identifyBusy || searchBusy || detailBusy;
  const measured =
    centering?.ok && measuredPhotoId !== null
      ? { photoId: measuredPhotoId, horizontal: centering.horizontal.larger, vertical: centering.vertical.larger }
      : null;

  const cap = useMemo(
    () => (centering?.ok ? centeringGradeCap(centering.horizontal.larger, centering.vertical.larger) : null),
    [centering]
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const mine = ++photoSeq.current;
    listSeq.current++;
    detailSeq.current++;
    photoIdRef.current = null;
    setPhotoBusy(true);
    setIdentifyBusy(false);
    setSearchBusy(false);
    setDetailBusy(false);
    setError(null);
    setIdentified(null);
    setCandidates([]);
    setDetail(null);
    setDetailPhotoId(null);
    setSaved(null);
    setPhoto(null);
    setCentering(null);
    setMeasuredPhotoId(null);
    try {
      const prepared = await preparePhoto(file);
      if (mine !== photoSeq.current) return;
      photoIdRef.current = mine;
      setPhoto(prepared);
      setCentering(measureCentering(prepared.raster));
      setMeasuredPhotoId(mine);
    } catch (err) {
      if (mine !== photoSeq.current) return;
      setError(messageOf(err));
    } finally {
      if (mine === photoSeq.current) setPhotoBusy(false);
    }
  }

  async function identify() {
    if (!photo) return;
    const mine = ++listSeq.current;
    setIdentifyBusy(true);
    setSearchBusy(false);
    setError(null);
    setNeedsKey(false);
    try {
      const out = await postJson<Identified>("/api/cards/identify", { image: { base64: photo.base64, mimeType: photo.mimeType } });
      if (mine !== listSeq.current) return;
      setIdentified(out);
      setCandidates(out.candidates);
      if (out.candidates.length === 0) setError("The photo was read, but no card in the database matches. Check the name and number below, or search by hand.");
    } catch (err) {
      if (mine !== listSeq.current) return;
      if ((err as ApiFailure).code === "vision_not_configured") setNeedsKey(true);
      else setError(messageOf(err));
    } finally {
      if (mine === listSeq.current) setIdentifyBusy(false);
    }
  }

  async function searchByHand(e: React.FormEvent) {
    e.preventDefault();
    const mine = ++listSeq.current;
    setSearchBusy(true);
    setIdentifyBusy(false);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchName.trim()) params.set("name", searchName.trim());
      if (searchNumber.trim()) params.set("number", searchNumber.trim());
      const found = await getJson<Card[]>(`/api/cards/search?${params}`);
      if (mine !== listSeq.current) return;
      setCandidates(found);
      if (found.length === 0) setError("No card matched that. Try just the name, or just the number.");
    } catch (err) {
      if (mine !== listSeq.current) return;
      setError(messageOf(err));
    } finally {
      if (mine === listSeq.current) setSearchBusy(false);
    }
  }

  async function choose(card: Card) {
    const mine = ++detailSeq.current;
    const pickedWithPhoto = photoIdRef.current;
    setDetailBusy(true);
    setError(null);
    setSaved(null);
    setDetail(null);
    setDetailPhotoId(null);
    try {
      const loaded = await getJson<CardDetail>(`/api/cards/card/${encodeURIComponent(card.id)}`);
      if (mine !== detailSeq.current) return;
      setDetail(loaded);
      setDetailPhotoId(pickedWithPhoto);
    } catch (err) {
      if (mine !== detailSeq.current) return;
      setError(messageOf(err));
    } finally {
      if (mine === detailSeq.current) setDetailBusy(false);
    }
  }

  async function saveResult() {
    if (!detail || saveInFlight.current || !validGradeChoice(company, grade)) return;
    saveInFlight.current = true;
    setSaving(true);
    setSaved(null);
    const target = detail;
    const mine = detailSeq.current;
    try {
      const body: Record<string, unknown> = { cardId: target.card.id, company, grade: Number(grade) };
      const centeringToSave = centeringForSave(measured, detailPhotoId);
      if (centeringToSave) body.centering = centeringToSave;
      const next = await postJson<GradeSummary>("/api/cards/grade-result", body);
      summarySeq.current++;
      setSummary(next);
      if (mine === detailSeq.current) {
        setSaved(`Saved ${company} ${grade} for ${cardLabel(target.card)}${centeringToSave ? ", with the centering from your photo" : ", without centering (no photo was measured for this card)"}.`);
      }
    } catch (err) {
      setError(messageOf(err));
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="pd-stack">
      <div>
        <h1 className="pd-h1">Cards</h1>
        <p className="pd-lede">Photograph a Pokémon card. The app finds the exact card in the real card database, shows what it sells for, and measures the one thing a photo can truly measure: centering.</p>
      </div>

      <div className="pd-banner pd-banner--info">
        <strong>What this is not:</strong> a grade. Corners, edges and surface need a human or a lab. The app measures centering and tells you the highest grade centering allows, nothing more.
      </div>

      <div className="pd-card pd-stack">
        <div className="pd-row">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} hidden aria-label="Card photo" />
          <button className="pd-btn" onClick={() => fileRef.current?.click()} disabled={lookupRunning}>
            {photoBusy ? "Preparing photo…" : photo ? "Take another photo" : "Take or choose a photo"}
          </button>
          {photo && (
            <button className="pd-btn pd-btn--ghost" onClick={identify} disabled={lookupRunning}>
              {identifyBusy ? "Reading the card…" : "Read this card"}
            </button>
          )}
        </div>
        <p className="pd-small pd-muted" style={{ margin: 0 }}>
          For a good measurement: lay the card flat on a plain surface that contrasts with its border, shoot straight down so all four edges show, in soft even light with no glare.
        </p>
        {photo && <img src={photo.previewUrl} alt="Your card photo" style={{ maxWidth: 260, borderRadius: 8, border: "1px solid var(--pd-line)" }} />}
      </div>

      {needsKey && (
        <div className="pd-banner pd-banner--warn">
          Reading a photo needs a free Gemini key (<code>GEMINI_API_KEY</code>). You can still search by name and number below.
        </div>
      )}
      {error && <div className="pd-banner pd-banner--bad" role="alert">{error}</div>}

      {identified && (
        <div className="pd-banner">
          The photo reader saw: <strong>{identified.read.name ?? "no name"}</strong>
          {identified.read.number ? ` ${identified.read.number}${identified.read.printedTotal ? `/${identified.read.printedTotal}` : ""}` : ""}
          {identified.read.setName ? `, ${identified.read.setName}` : ""} (confidence: {identified.read.confidence}). It is only a hint; pick the right card below.
        </div>
      )}

      <form className="pd-card pd-row" onSubmit={searchByHand}>
        <input className="pd-input" style={{ flex: 2, minWidth: 140 }} placeholder="Card name" value={searchName} disabled={lookupRunning} onChange={(e) => setSearchName(e.target.value)} aria-label="Card name" />
        <input className="pd-input pd-mono" style={{ flex: 1, minWidth: 90 }} placeholder="4/102" value={searchNumber} disabled={lookupRunning} onChange={(e) => setSearchNumber(e.target.value)} aria-label="Card number" />
        <button className="pd-btn pd-btn--ghost" type="submit" disabled={lookupRunning}>{searchBusy ? "Searching…" : "Search by hand"}</button>
      </form>

      {candidates.length > 0 && (
        <div className="pd-stack">
          <h2 className="pd-h2">Which one is it?</h2>
          {candidates.map((c) => (
            <button key={c.id} className="pd-cardpick" aria-pressed={detail?.card.id === c.id} disabled={photoBusy || identifyBusy || searchBusy} onClick={() => choose(c)}>
              {c.image ? <img src={c.image} alt="" loading="lazy" /> : <div />}
              <div>
                <div style={{ fontWeight: 700 }}>{cardLabel(c)}</div>
                <div className="pd-small pd-muted">{c.set.name}{c.set.releaseDate ? ` (${c.set.releaseDate.slice(0, 4)})` : ""}{c.rarity ? ` · ${c.rarity}` : ""}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {detailBusy && <div className="pd-skeleton" />}

      {detail && (
        <div className="pd-card pd-stack">
          <h2 className="pd-h2">{cardLabel(detail.card)} <span className="pd-muted" style={{ fontSize: 14 }}>{detail.card.set.name}</span></h2>
          {detail.value.database?.tcgplayer && <PriceTable block={detail.value.database.tcgplayer} title="TCGplayer (from the card database)" />}
          {detail.value.database?.cardmarket && <PriceTable block={detail.value.database.cardmarket} title="Cardmarket, Europe (from the card database)" />}
          {!detail.value.database && <div className="pd-banner">The card database has no price for this card.</div>}
          <div>
            <div className="pd-small pd-muted" style={{ marginBottom: 6 }}>Live eBay asking prices (what sellers want, not what sold)</div>
            <dl className="pd-kv">
              <AskLine label="Raw card" ask={detail.value.ebayRaw} />
              <AskLine label="PSA 10 copies" ask={detail.value.ebayPsa10} />
            </dl>
          </div>
          {detail.value.notes.map((n) => (
            <p key={n} className="pd-small pd-muted" style={{ margin: 0 }}>{n}</p>
          ))}
        </div>
      )}

      {centering && (
        <div className="pd-card pd-stack">
          <h2 className="pd-h2">Centering</h2>
          {centering.ok && cap ? (
            <>
              <dl className="pd-kv">
                <dt>Left / right</dt>
                <dd>{centering.horizontal.larger.toFixed(0)}/{(100 - centering.horizontal.larger).toFixed(0)} ({centering.horizontal.widerSide} border wider)</dd>
                <dt>Top / bottom</dt>
                <dd>{centering.vertical.larger.toFixed(0)}/{(100 - centering.vertical.larger).toFixed(0)} ({centering.vertical.widerSide} border wider)</dd>
              </dl>
              <div className="pd-banner pd-banner--info">
                <strong>{cap.label}.</strong> {cap.note}
              </div>
              <p className="pd-small pd-muted" style={{ margin: 0 }}>
                {CENTERING_SOURCE.company} cutoffs as of {CENTERING_SOURCE.retrieved}. {CENTERING_SOURCE.caveat}
              </p>
            </>
          ) : (
            <div className="pd-banner pd-banner--warn">Couldn't measure centering from this photo: {centering.ok ? "" : centering.reason}</div>
          )}
        </div>
      )}

      {detail && (
        <div className="pd-card pd-stack">
          <h2 className="pd-h2">Got a real grade back?</h2>
          <p className="pd-small pd-muted" style={{ margin: 0 }}>Record what the grading company actually gave this card. That builds the app's own track record of how often its centering ceiling holds.</p>
          <div className="pd-row">
            <select className="pd-select" style={{ width: 130 }} value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Grading company">
              <option value="" disabled>Company…</option>
              {GRADE_COMPANIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="pd-select" style={{ width: 100 }} value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Grade">
              <option value="" disabled>Grade…</option>
              {GRADE_VALUES.map((g) => <option key={g}>{g}</option>)}
            </select>
            <button className="pd-btn pd-btn--small" onClick={saveResult} disabled={saving || !validGradeChoice(company, grade)}>{saving ? "Saving…" : "Save result"}</button>
          </div>
          {saved && <div className="pd-banner pd-banner--info">{saved}</div>}
        </div>
      )}

      {summary && <p className="pd-small pd-muted">Track record: {summary.count} real result(s) saved. {summary.verdict}</p>}
    </div>
  );
}
