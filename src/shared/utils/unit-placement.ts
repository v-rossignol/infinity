import { HexCoordinates } from '../interfaces/planet.interface';
import { Vec2Local } from '../interfaces/player-location.interface';

export interface UnitPlacementHex {
  biome: string;
  coordinates: HexCoordinates;
}

export class NoAllowedHexError extends Error {
  constructor() {
    super('No hex on planet surface allows this unit type');
    this.name = 'NoAllowedHexError';
  }
}

export function isBiomeAllowedForUnit(
  biome: string,
  environments: readonly string[],
): boolean {
  return environments.includes(biome);
}

export function filterAllowedHexes(
  hexagons: UnitPlacementHex[],
  environments: readonly string[],
): UnitPlacementHex[] {
  return hexagons.filter((hex) => isBiomeAllowedForUnit(hex.biome, environments));
}

export function pickRandomAllowedHex(
  hexagons: UnitPlacementHex[],
  environments: readonly string[],
  random: () => number = Math.random,
): HexCoordinates {
  const candidates = filterAllowedHexes(hexagons, environments);
  if (candidates.length === 0) {
    throw new NoAllowedHexError();
  }

  const index = Math.floor(random() * candidates.length);
  return {
    q: candidates[index].coordinates.q,
    r: candidates[index].coordinates.r,
  };
}

export function rollRandomInHexPosition(random: () => number = Math.random): Vec2Local {
  return { x: random(), y: random() };
}
