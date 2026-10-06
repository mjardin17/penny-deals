/**
 * Looks up a barcode's product name in the real Open Food Facts database. It knows groceries, cosmetics and
 * household items, not everything, so a miss is normal. A miss returns null and the person types the name.
 * Nothing here is ever guessed or filled from sample data.
 */

export interface LookupDeps {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const MAX_TITLE = 120;

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() : "";
}

export async function lookupUpcTitle(code: string, deps: LookupDeps = {}): Promise<string | null> {
  const digits = (code ?? "").trim();
  if (!/^\d{8,14}$/.test(digits)) return null;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? 2600);
  try {
    const res = await fetchImpl(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(digits)}.json`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: number; product?: { brands?: unknown; product_name?: unknown; generic_name?: unknown } };
    if (data.status !== 1 || !data.product) return null;
    const brand = clean(data.product.brands).split(",")[0].trim();
    const name = clean(data.product.product_name) || clean(data.product.generic_name);
    if (!name) return null;
    const full = brand && !name.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${name}` : name;
    return full.slice(0, MAX_TITLE);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
