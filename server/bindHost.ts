/** Where the server listens. Local-only unless HOST says otherwise, so nothing is exposed by accident. */
export function resolveHost(env: Record<string, string | undefined>): string {
  return env.HOST?.trim() || "127.0.0.1";
}

/** True when the chosen address accepts connections from other machines. */
export function isExposed(host: string): boolean {
  return !["127.0.0.1", "localhost", "::1"].includes(host);
}
