import { GAME_CONSTANTS } from '../constants/game.constants';
import { Hexagon, PlanetSurface } from '../interfaces/planet.interface';

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

const createSeededRandom = (seed: string): (() => number) => {
  let state = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
};

export interface GeneratePlanetSurfaceOptions {
  seed: string;
  radius: number;
}

export const generatePlanetSurface = (options: GeneratePlanetSurfaceOptions): PlanetSurface => {
  const { seed, radius } = options;
  const random = createSeededRandom(seed);
  const { HEX_BIOMES } = GAME_CONSTANTS;
  const hexagons: Hexagon[] = [];

  const height = getPlanetGridHeight(radius);

  for (let q = 0; q < radius; q++) {
    for (let r = 0; r < height; r++) {
      hexagons.push({
        biome: HEX_BIOMES[Math.floor(random() * HEX_BIOMES.length)],
        resources: [],
        dangerLevel: Math.floor(random() * 11),
        coordinates: { q, r },
      });
    }
  }

  return {
    hexagons,
    generatedAt: new Date(),
  };
};
