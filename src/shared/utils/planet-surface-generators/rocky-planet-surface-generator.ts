import { Hexagon, HexBiome, PlanetSurface } from '../../interfaces/planet.interface';
import { GeneratePlanetSurfaceOptions, IPlanetSurfaceGenerator } from './iplanet-surface-generator';

const ROCKY_BIOME_WEIGHTS: { biome: HexBiome; weight: number }[] = [
  { biome: 'ocean', weight: 0.28 },
  { biome: 'ice', weight: 0.05 },
  { biome: 'forest', weight: 0.22 },
  { biome: 'mountain', weight: 0.18 },
  { biome: 'plain', weight: 0.15 },
  { biome: 'desert', weight: 0.12 },
];

const createSeededRandom = (seed: string): (() => number) => {
  let state = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
};

export const getRockyDesertRowRange = (height: number): { start: number; end: number } | null => {
  if (height <= 2) {
    return null;
  }

  const middleHeight = Math.max(1, Math.round(height / 3));
  const start = Math.floor((height - middleHeight) / 2);

  return { start, end: start + middleHeight - 1 };
};

export const getRockyIceRowRanges = (
  height: number,
): { top: { start: number; end: number }; bottom: { start: number; end: number } } | null => {
  if (height <= 1) {
    return null;
  }

  const polarHeight = Math.max(1, Math.round(height / 6));

  return {
    top: { start: 0, end: polarHeight - 1 },
    bottom: { start: height - polarHeight, end: height - 1 },
  };
};

const canHaveIce = (r: number, height: number): boolean => {
  const ranges = getRockyIceRowRanges(height);
  if (!ranges) {
    return false;
  }

  return (
    (r >= ranges.top.start && r <= ranges.top.end) ||
    (r >= ranges.bottom.start && r <= ranges.bottom.end)
  );
};

const canHaveDesert = (r: number, height: number): boolean => {
  const range = getRockyDesertRowRange(height);
  return range !== null && r >= range.start && r <= range.end;
};

const isBiomeAllowedAtRow = (biome: HexBiome, r: number, height: number): boolean => {
  if (biome === 'ice') {
    return canHaveIce(r, height);
  }

  if (biome === 'desert') {
    return canHaveDesert(r, height);
  }

  return true;
};

const getRockyBiomeWeightsForRow = (
  r: number,
  height: number,
): { biome: HexBiome; weight: number }[] => {
  const allowed = ROCKY_BIOME_WEIGHTS.filter(({ biome }) => isBiomeAllowedAtRow(biome, r, height));
  const total = allowed.reduce((sum, { weight }) => sum + weight, 0);

  return allowed.map(({ biome, weight }) => ({ biome, weight: weight / total }));
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

const pickRockyBiome = (random: () => number, r: number, height: number): HexBiome =>
  pickWeightedBiome(random, getRockyBiomeWeightsForRow(r, height));

export class RockyPlanetSurfaceGenerator implements IPlanetSurfaceGenerator {
  generate(options: GeneratePlanetSurfaceOptions): PlanetSurface {
    const { seed, radius } = options;
    const random = createSeededRandom(seed);
    const hexagons: Hexagon[] = [];
    const height = radius + 1;

    for (let q = 0; q < radius; q++) {
      for (let r = 0; r < height; r++) {
        hexagons.push({
          biome: pickRockyBiome(random, r, height),
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
