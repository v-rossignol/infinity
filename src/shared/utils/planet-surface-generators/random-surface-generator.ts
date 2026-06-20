import { GAME_CONSTANTS } from '../../constants/game.constants';
import { Hexagon, PlanetSurface } from '../../interfaces/planet.interface';
import { GeneratePlanetSurfaceOptions, IPlanetSurfaceGenerator } from './iplanet-surface-generator';

const createSeededRandom = (seed: string): (() => number) => {
  let state = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
};

export class RandomSurfaceGenerator implements IPlanetSurfaceGenerator {
  generate(options: GeneratePlanetSurfaceOptions): PlanetSurface {
    const { seed, radius } = options;
    const random = createSeededRandom(seed);
    const { HEX_BIOMES } = GAME_CONSTANTS;
    const hexagons: Hexagon[] = [];
    const height = radius + 1;

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
  }
}
