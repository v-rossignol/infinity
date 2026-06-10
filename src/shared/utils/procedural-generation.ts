import { Noise } from 'noisejs';

interface StarSystemGenerationData {
  name: string;
  planets: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    radius: number;
    type: string;
    resources: Record<string, number>;
  }>;
}

interface GenerateStarSystemOptions {
  seed: string;
}

const createNoise = (seed: string): Noise => {
  const noise = new Noise();
  noise.seed(seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  return noise;
};

export const generateStarSystem = (
  options: GenerateStarSystemOptions,
): StarSystemGenerationData => {
  const { seed } = options;
  const noise = createNoise(seed);

  const planetCount = Math.floor(noise.perlin2(1, 0) * 5) + 3;
  const planets = [];
  for (let i = 0; i < planetCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + noise.perlin2(i, 1) * 50;
    planets.push({
      id: `${seed}_planet_${i}`,
      name: `Planet ${i + 1}`,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      radius: 5 + Math.random() * 10,
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
