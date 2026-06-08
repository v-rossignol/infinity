import { randomUUID } from 'crypto';
import { GALAXY_CONSTANTS } from '../constants/galaxy.constants';
import { StarType, Vec3 } from '../interfaces/galaxy.interface';
import { distance3D } from './math';
import { generateCubeName } from './galaxy';

const { CUBE_SIZE_LY, MIN_STARS_PER_CUBE, MAX_STARS_PER_CUBE, GREEK_LETTERS } = GALAXY_CONSTANTS;

export const MIN_STAR_SEPARATION_LY = 1;
export const LOCAL_COORD_DECIMALS = 1;
export const STAR_TYPE_WEIGHTS: ReadonlyArray<{ type: StarType; weight: number }> = [
  { type: 'yellow', weight: 0.5 },
  { type: 'red', weight: 0.2 },
  { type: 'white', weight: 0.2 },
  { type: 'blue', weight: 0.1 },
];

export const isGridAlignedOrigin = (origin: Vec3): boolean =>
  origin.x % GALAXY_CONSTANTS.CUBE_SIZE_LY === 0 &&
  origin.y % GALAXY_CONSTANTS.CUBE_SIZE_LY === 0 &&
  origin.z % GALAXY_CONSTANTS.CUBE_SIZE_LY === 0;

export const roundToDecimals = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const randomIntInclusive = (min: number, max: number, random = Math.random): number =>
  Math.floor(random() * (max - min + 1)) + min;

export const randomLocalAxis = (random = Math.random): number => {
  const steps = CUBE_SIZE_LY * 10 ** LOCAL_COORD_DECIMALS;
  return roundToDecimals(
    Math.floor(random() * steps) / 10 ** LOCAL_COORD_DECIMALS,
    LOCAL_COORD_DECIMALS,
  );
};

export const randomLocalCoords = (random = Math.random): Vec3 => ({
  x: randomLocalAxis(random),
  y: randomLocalAxis(random),
  z: randomLocalAxis(random),
});

export const hasMinimumSeparation = (candidate: Vec3, existing: Vec3[]): boolean =>
  existing.every(
    (star) =>
      distance3D(candidate.x, candidate.y, candidate.z, star.x, star.y, star.z) >=
      MIN_STAR_SEPARATION_LY,
  );

export const pickWeightedStarType = (random = Math.random): StarType => {
  const roll = random();
  let cumulative = 0;
  for (const entry of STAR_TYPE_WEIGHTS) {
    cumulative += entry.weight;
    if (roll < cumulative) {
      return entry.type;
    }
  }
  return STAR_TYPE_WEIGHTS[STAR_TYPE_WEIGHTS.length - 1].type;
};

export interface GenerateStarPositionsOptions {
  count: number;
  random?: () => number;
  maxAttemptsPerStar?: number;
}

export const generateStarPositions = (options: GenerateStarPositionsOptions): Vec3[] => {
  const { count, random = Math.random, maxAttemptsPerStar = 1000 } = options;
  const positions: Vec3[] = [];

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < maxAttemptsPerStar; attempt++) {
      const candidate = randomLocalCoords(random);
      if (hasMinimumSeparation(candidate, positions)) {
        positions.push(candidate);
        placed = true;
        break;
      }
    }
    if (!placed) {
      throw new Error(
        `Unable to place star ${i + 1}/${count} with minimum separation of ${MIN_STAR_SEPARATION_LY} LY`,
      );
    }
  }

  return positions;
};

export interface GenerateCubeOptions {
  origin: Vec3;
  random?: () => number;
  uuid?: () => string;
}

export const generateCube = (options: GenerateCubeOptions) => {
  const { origin, random = Math.random, uuid = randomUUID } = options;

  if (!isGridAlignedOrigin(origin)) {
    throw new Error(
      `Origin (${origin.x}, ${origin.y}, ${origin.z}) must be grid-aligned (multiples of ${GALAXY_CONSTANTS.CUBE_SIZE_LY} LY)`,
    );
  }

  const cubeId = uuid();
  const name = generateCubeName(origin);
  const starCount = randomIntInclusive(MIN_STARS_PER_CUBE, MAX_STARS_PER_CUBE, random);
  const positions = generateStarPositions({ count: starCount, random });

  const stars = positions.map((local_coords, index) => {
    const letter = GREEK_LETTERS[index];
    const id = `${letter} ${name}`;
    return {
      id,
      local_coords,
      cube_id: cubeId,
      properties: { type: pickWeightedStarType(random) },
    };
  });

  const cube = {
    id: cubeId,
    name,
    origin,
    star_ids: stars.map((star) => star.id),
  };

  return { cube, stars };
};
