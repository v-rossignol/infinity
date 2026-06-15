const PLANET_ID_PATTERN = /^(.+)_planet_\d+$/;

export function parseStarSystemIdFromPlanetId(planetId: string): string | null {
  const match = planetId.match(PLANET_ID_PATTERN);
  return match?.[1] ?? null;
}
