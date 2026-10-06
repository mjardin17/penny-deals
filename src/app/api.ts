/** Small fetch helpers: every call either returns the data or throws an Error with a message a person can read. */

export interface ApiFailure extends Error {
  status: number;
  code?: string;
}

async function parse<T>(res: Response): Promise<T> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // Not JSON: fall through to the generic message below.
  }
  if (!res.ok || !body || body.success === false) {
    const err = new Error(body?.error || `Something went wrong (HTTP ${res.status}).`) as ApiFailure;
    err.status = res.status;
    err.code = body?.code;
    throw err;
  }
  return body.data as T;
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return parse<T>(await fetch(url, { signal }));
}

export async function postJson<T>(url: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  return parse<T>(await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal }));
}

export function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
