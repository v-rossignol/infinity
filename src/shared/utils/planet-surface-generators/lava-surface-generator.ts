import { Hexagon, HexBiome, PlanetSurface } from '../../interfaces/planet.interface';
import { GeneratePlanetSurfaceOptions, IPlanetSurfaceGenerator } from './iplanet-surface-generator';

const LAVA_BIOME_WEIGHTS: { biome: HexBiome; weight: number }[] = [
  { biome: 'volcanic', weight: 0.1 },
  { biome: 'mountain', weight: 0.3 },
  { biome: 'desert', weight: 0.6 },
];

const createSeededRandom = (seed: string): (() => number) => {
  let state = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
};

const pickLavaBiome = (random: () => number): HexBiome => {
  const roll = random();
  let cumulative = 0;

  for (const { biome, weight } of LAVA_BIOME_WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) {
      return biome;
    }
  }

  return LAVA_BIOME_WEIGHTS[LAVA_BIOME_WEIGHTS.length - 1].biome;
};

export class LavaSurfaceGenerator implements IPlanetSurfaceGenerator {
  generate(options: GeneratePlanetSurfaceOptions): PlanetSurface {
    const { seed, radius } = options;
    const random = createSeededRandom(seed);
    const hexagons: Hexagon[] = [];
    const height = radius + 1;

    for (let q = 0; q < radius; q++) {
      for (let r = 0; r < height; r++) {
        hexagons.push({
          biome: pickLavaBiome(random),
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
