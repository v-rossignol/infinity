import { Hexagon, HexBiome, PlanetSurface } from '../../interfaces/planet.interface';
import { GeneratePlanetSurfaceOptions, IPlanetSurfaceGenerator } from './iplanet-surface-generator';

const ICE_BIOME_WEIGHTS: { biome: HexBiome; weight: number }[] = [
  { biome: 'ice', weight: 0.5 },
  { biome: 'mountain', weight: 0.4 },
  { biome: 'ocean', weight: 0.1 },
];

const ICE_EDGE_BIOME_WEIGHTS: { biome: HexBiome; weight: number }[] = [
  { biome: 'ice', weight: 0.5 },
  { biome: 'mountain', weight: 0.4 },
];

const createSeededRandom = (seed: string): (() => number) => {
  let state = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
};

export const getIceOceanRowRange = (
  height: number,
): { start: number; end: number } | null => {
  if (height <= 2) {
    return null;
  }

  const middleHeight = Math.max(1, Math.round(height / 3));
  const start = Math.floor((height - middleHeight) / 2);

  return { start, end: start + middleHeight - 1 };
};

const isMiddleRow = (r: number, height: number): boolean => {
  const range = getIceOceanRowRange(height);
  return range !== null && r >= range.start && r <= range.end;
};

const pickWeightedBiome = (
  random: () => number,
  weights: { biome: HexBiome; weight: number }[],
): HexBiome => {
  const roll = random();
  let cumulative = 0;

  for (const { biome, weight } of weights) {
    cumulative += weight;
    if (roll < cumulative) {
      return biome;
    }
  }

  return weights[weights.length - 1].biome;
};

const pickIceBiome = (random: () => number, r: number, height: number): HexBiome =>
  pickWeightedBiome(random, isMiddleRow(r, height) ? ICE_BIOME_WEIGHTS : ICE_EDGE_BIOME_WEIGHTS);

export class IcePlanetSurfaceGenerator implements IPlanetSurfaceGenerator {
  generate(options: GeneratePlanetSurfaceOptions): PlanetSurface {
    const { seed, radius } = options;
    const random = createSeededRandom(seed);
    const hexagons: Hexagon[] = [];
    const height = radius + 1;

    for (let q = 0; q < radius; q++) {
      for (let r = 0; r < height; r++) {
        hexagons.push({
          biome: pickIceBiome(random, r, height),
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
  }
}
