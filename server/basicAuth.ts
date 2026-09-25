/**
 * Optional HTTP Basic Auth gate. Off by default (no env vars set = no behavior change).
 * Set TUNNEL_BASIC_AUTH_USER / TUNNEL_BASIC_AUTH_PASS before exposing the server through
 * a public tunnel (Cloudflare Tunnel, ngrok, etc.) so the API isn't wide open to anyone
 * who finds the URL. Not needed for Tailscale, which is a private network already.
 */

import type { NextFunction, Request, Response } from "express";

export function basicAuthMiddleware(user: string | undefined, pass: string | undefined) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!user || !pass) return next();

    const header = req.headers.authorization;
    if (header?.startsWith("Basic ")) {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
      const separatorIndex = decoded.indexOf(":");
      const suppliedUser = separatorIndex === -1 ? decoded : decoded.slice(0, separatorIndex);
      const suppliedPass = separatorIndex === -1 ? "" : decoded.slice(separatorIndex + 1);
      if (suppliedUser === user && suppliedPass === pass) return next();
    }

    res.set("WWW-Authenticate", 'Basic realm="Penny Deals"');
    res.status(401).send("Authentication required");
  };
}
