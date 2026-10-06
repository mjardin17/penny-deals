/** Small, pure helpers for the screens, kept here so tests can cover them without a browser. */

/** ROI as text. A $0 cost has no ROI (the server sends null for it), and that must not crash a screen. */
export function roiLabel(roiPct: number | null | undefined): string {
  return typeof roiPct === "number" && Number.isFinite(roiPct) ? `${roiPct.toFixed(0)}% ROI` : "ROI not defined (no cost)";
}

/** A shelf price typed by a person: a plain number above $0, or null. Empty, "0" and junk are all null. */
export function parseShelfPrice(text: string): number | null {
  const t = text.trim();
  if (!/^\d{1,7}(\.\d{1,6})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n : null;
}

/** Only https links are made clickable. Anything else (http:, javascript:, data:) is shown as plain text. */
export function safeHttpsUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
