/**
 * Files uploaded to the old site (photos, logos, posters, PDFs) are served
 * from its /uploads folder. `npm run legacy:assets -w @ritechs/api -- --out
 * apps/web/public/legacy` copies them here; then set
 * NEXT_PUBLIC_LEGACY_ASSET_BASE=/legacy (and LEGACY_ASSET_BASE=/legacy for the
 * API) so the site no longer depends on the old server.
 */
export const LEGACY_ASSET_BASE = (process.env.NEXT_PUBLIC_LEGACY_ASSET_BASE ?? "https://ritechs.org").replace(/\/$/, "");

export function legacyAsset(path: string) {
  // Absolute URLs and site paths (uploads served by the API) are used as they are.
  if (/^https?:\/\//.test(path) || path.startsWith("/")) return path;
  return `${LEGACY_ASSET_BASE}/${path.replace(/^\//, "")}`;
}

/** next/image can optimise these; others (svg, webp from some hosts, bmp, heic) are served as-is. */
export function isOptimisable(path: string) {
  return /\.(jpe?g|png)$/i.test(path) && !path.startsWith("/");
}
