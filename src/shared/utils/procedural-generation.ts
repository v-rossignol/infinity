import { Noise } from 'noisejs';
import { GAME_CONSTANTS } from '../constants/game.constants';
import { buildPlanetId } from './planet-id';
import { getPlanetName } from './planet-naming';

interface StarSystemGenerationData {
  name: string;
  planets: Array<{
    id: string;
    name: string;
    distanceFromStar: number;
    radius: number;
    type: string;
    resources: Record<string, number>;
  }>;
}

interface GenerateStarSystemOptions {
  seed: string;
  starName: string;
}

/** Odd integer in [PLANET_RADIUS_MIN, PLANET_RADIUS_MAX] — hex grid edge length. */
export const rollOddPlanetRadius = (random: () => number = Math.random): number => {
  const { PLANET_RADIUS_MIN, PLANET_RADIUS_MAX } = GAME_CONSTANTS;
  const slotCount = (PLANET_RADIUS_MAX - PLANET_RADIUS_MIN) / 2 + 1;
  return Math.floor(random() * slotCount) * 2 + PLANET_RADIUS_MIN;
};

/** Unique integer orbital distances in [PLANET_ORBIT_DISTANCE_MIN, PLANET_ORBIT_DISTANCE_MAX], sorted inner → outer. */
export const rollUniquePlanetOrbitDistances = (
  planetCount: number,
  random: () => number = Math.random,
): number[] => {
  const { PLANET_ORBIT_DISTANCE_MIN, PLANET_ORBIT_DISTANCE_MAX } = GAME_CONSTANTS;
  const span = PLANET_ORBIT_DISTANCE_MAX - PLANET_ORBIT_DISTANCE_MIN + 1;

  if (planetCount > span) {
    throw new Error(
      `Cannot assign ${planetCount} unique orbit distances in [${PLANET_ORBIT_DISTANCE_MIN}, ${PLANET_ORBIT_DISTANCE_MAX}]`,
    );
  }

  const pool = Array.from({ length: span }, (_, index) => PLANET_ORBIT_DISTANCE_MIN + index);

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, planetCount).sort((left, right) => left - right);
};

/** Planet count in [PLANET_COUNT_MIN, PLANET_COUNT_MAX], seeded from fractional Perlin sample. */
export const rollPlanetCount = (noise: Noise): number => {
  const { PLANET_COUNT_MIN, PLANET_COUNT_MAX } = GAME_CONSTANTS;
  const span = PLANET_COUNT_MAX - PLANET_COUNT_MIN + 1;
  const sample = noise.perlin2(1.37, 0.83);
  const normalized = (sample + 1) / 2;

  return Math.min(PLANET_COUNT_MAX, Math.floor(normalized * span) + PLANET_COUNT_MIN);
};

const createNoise = (seed: string): Noise => {
  const noise = new Noise();
  noise.seed(seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  return noise;
};

export const generateStarSystem = (
  options: GenerateStarSystemOptions,
): StarSystemGenerationData => {
  const { seed, starName } = options;
  const noise = createNoise(seed);

  const planetCount = rollPlanetCount(noise);
  const orbitDistances = rollUniquePlanetOrbitDistances(planetCount);
  const planets = [];
  for (let i = 0; i < planetCount; i++) {
    planets.push({
      id: buildPlanetId(seed, i),
      name: getPlanetName(starName, i + 1),
      distanceFromStar: orbitDistances[i],
      radius: rollOddPlanetRadius(),
      type: ['rocky', 'gas', 'ice', 'lava'][Math.floor(Math.random() * 4)],
      resources: {
        iron: Math.floor(Math.random() * 1000),
        gold: Math.floor(Math.random() * 500),
        water: Math.floor(Math.random() * 2000),
      },
    });
  }

  return {
    name: `Star System ${seed.substring(0, 8)}`,
    planets,
  };
};

interface PlanetData {
  name: string;
  biomeTypes: string[];
  resources: Record<string, number>;
  heightMap: number[][];
  tileMap: string[][];
}

interface GeneratePlanetOptions {
  seed: string;
  width?: number;
  height?: number;
}

const BIOME_TYPES = ['grass', 'desert', 'forest', 'ocean', 'mountain', 'tundra'];
const TILE_TYPES = ['grass', 'sand', 'water', 'stone', 'snow', 'dirt'];

export const generatePlanet = (options: GeneratePlanetOptions): PlanetData => {
  const { seed, width = 64, height = 64 } = options;
  const noise = createNoise(seed);

  const heightMap: number[][] = [];
  const tileMap: string[][] = [];
  const biomeSet = new Set<string>();

  for (let y = 0; y < height; y++) {
    heightMap[y] = [];
    tileMap[y] = [];
    for (let x = 0; x < width; x++) {
      const elevation = noise.perlin2(x * 0.05, y * 0.05);
      const moisture = noise.perlin2(x * 0.08 + 100, y * 0.08 + 100);
      heightMap[y][x] = elevation;

      let tile: string;
      if (elevation < -0.2) {
        tile = 'water';
        biomeSet.add('ocean');
      } else if (elevation > 0.5) {
        tile = elevation > 0.7 ? 'snow' : 'stone';
        biomeSet.add('mountain');
      } else if (moisture < -0.1) {
        tile = 'sand';
        biomeSet.add('desert');
      } else if (moisture > 0.3) {
        tile = 'grass';
        biomeSet.add(moisture > 0.5 ? 'forest' : 'grass');
      } else {
        tile = 'dirt';
        biomeSet.add('tundra');
      }

      tileMap[y][x] = tile;
    }
  }

  return {
    name: `Planet ${seed.substring(0, 8)}`,
    biomeTypes: biomeSet.size > 0 ? Array.from(biomeSet) : [BIOME_TYPES[0]],
    resources: {
      iron: Math.floor(Math.random() * 5000),
      gold: Math.floor(Math.random() * 2000),
      water: Math.floor(Math.random() * 10000),
      crystal: Math.floor(Math.random() * 1000),
    },
    heightMap,
    tileMap,
  };
};
