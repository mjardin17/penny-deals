/**
 * Appends Joshua's Amazon Associates tag to Amazon buy links. Every other merchant's
 * URL passes through unchanged. Reuses the existing AMAZON_PARTNER_TAG env var
 * (already in .env.example for the Amazon Creators integration) rather than adding
 * a second, differently-named variable for the same thing.
 */

const AMAZON_HOST_PATTERN = /(^|\.)amazon\.[a-z.]+$/i;

export function isAmazonUrl(rawUrl: string): boolean {
  try {
    return AMAZON_HOST_PATTERN.test(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

export function applyAmazonTag(rawUrl: string, tag: string | undefined = process.env.AMAZON_PARTNER_TAG): string {
  if (!tag || !tag.trim()) return rawUrl;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  if (!AMAZON_HOST_PATTERN.test(url.hostname)) return rawUrl;
  url.searchParams.set("tag", tag.trim());
  return url.toString();
}
