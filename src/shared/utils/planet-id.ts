const PLANET_ID_PATTERN = /^(.+)-p([1-9]\d*)$/;

/** Builds a procedural planet id from a star system id and 0-based generation index. */
export function buildPlanetId(starSystemId: string, zeroBasedIndex: number): string {
  return `${starSystemId}-p${zeroBasedIndex + 1}`;
}

export function parseStarSystemIdFromPlanetId(planetId: string): string | null {
  const match = planetId.match(PLANET_ID_PATTERN);
  return match?.[1] ?? null;
}

/** Returns the 0-based planet index encoded in a procedural planet id. */
export function parsePlanetIndexFromPlanetId(planetId: string): number | null {
  const match = planetId.match(PLANET_ID_PATTERN);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[2], 10) - 1;
}
