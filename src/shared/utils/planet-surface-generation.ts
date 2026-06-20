import { PlanetSurface } from '../interfaces/planet.interface';
import { GeneratePlanetSurfaceOptions } from './planet-surface-generators/iplanet-surface-generator';
import { PlanetSurfaceGeneratorFactory } from './planet-surface-generators/planet-surface-generator.factory';

export type { GeneratePlanetSurfaceOptions } from './planet-surface-generators/iplanet-surface-generator';

export interface HexCoord {
  q: number;
  r: number;
}

/** Toroidal grid height: one extra row on r for flat hex tiling. */
export const getPlanetGridHeight = (radius: number): number => radius + 1;

export const getPlanetHexCount = (radius: number): number => radius * getPlanetGridHeight(radius);

export function getNeighbors(q: number, r: number, radius: number): HexCoord[] {
  const width = radius;
  const height = getPlanetGridHeight(radius);
  return [
    { q: (q - 1 + width) % width, r: (r + 1) % height },
    { q, r: (r + 1) % height },
    { q: (q + 1) % width, r },
    { q: (q + 1) % width, r: (r - 1 + height) % height },
    { q, r: (r - 1 + height) % height },
    { q: (q - 1 + width) % width, r },
  ];
}

export const generatePlanetSurface = (options: GeneratePlanetSurfaceOptions): PlanetSurface =>
  PlanetSurfaceGeneratorFactory.create(options.type, options.radius).generate(options);
