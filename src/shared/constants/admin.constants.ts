export const ADMIN_CONSTANTS = {
  PLANET_PREVIEW_CACHE_TTL_SECONDS: 3600,
} as const;

export const buildPlanetPreviewCacheKey = (
  seed: string,
  radius: number,
  type: string,
): string => `planet:preview:${seed}:${radius}:${type}`;

export const buildPlanetPreviewIdCacheKey = (id: string): string => `planet:preview:id:${id}`;

