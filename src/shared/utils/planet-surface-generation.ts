import { GAME_CONSTANTS } from '../constants/game.constants';
import { Hexagon, PlanetSurface } from '../interfaces/planet.interface';

export interface HexCoord {
  q: number;
  r: number;
}

export function getNeighbors(q: number, r: number, radius: number): HexCoord[] {
  const n = radius;
  return [
    { q: (q - 1 + n) % n, r: (r + 1) % n },
    { q, r: (r + 1) % n },
    { q: (q + 1) % n, r },
    { q: (q + 1) % n, r: (r - 1 + n) % n },
    { q, r: (r - 1 + n) % n },
    { q: (q - 1 + n) % n, r },
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

  for (let q = 0; q < radius; q++) {
    for (let r = 0; r < radius; r++) {
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
