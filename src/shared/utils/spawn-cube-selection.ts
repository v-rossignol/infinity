import { SPAWN_CONSTANTS } from '../constants/spawn.constants';
import { GALAXY_CONSTANTS } from '../constants/galaxy.constants';
import { Vec3 } from '../interfaces/galaxy.interface';

const AXES = ['x', 'y', 'z'] as const;
export type SpawnAxis = (typeof AXES)[number];

export class NoEmptyCubeSlotError extends Error {
  constructor() {
    super('No empty cube slot found for spawn');
    this.name = 'NoEmptyCubeSlotError';
  }
}

export interface SpawnCubeSelectionDeps {
  hasAnyCube: () => Promise<boolean>;
  findRandom: () => Promise<{ origin: Vec3 }>;
  existsByOrigin: (origin: Vec3) => Promise<boolean>;
  bootstrapSeedCube: () => Promise<void>;
}

export const isSameOrigin = (a: Vec3, b: Vec3): boolean =>
  a.x === b.x && a.y === b.y && a.z === b.z;

export const adjacentOrigin = (origin: Vec3, axis: SpawnAxis, signedSteps: number): Vec3 => {
  const delta = signedSteps * GALAXY_CONSTANTS.CUBE_SIZE_LY;
  return {
    x: axis === 'x' ? origin.x + delta : origin.x,
    y: axis === 'y' ? origin.y + delta : origin.y,
    z: axis === 'z' ? origin.z + delta : origin.z,
  };
};

export const pickRandomAxis = (random: () => number = Math.random): SpawnAxis => {
  const index = Math.floor(random() * AXES.length);
  return AXES[index];
};

export const pickRandomDirection = (random: () => number = Math.random): 1 | -1 =>
  random() < 0.5 ? -1 : 1;

export const pickSpawnCubeOrigin = async (
  deps: SpawnCubeSelectionDeps,
  random: () => number = Math.random,
): Promise<Vec3> => {
  if (!(await deps.hasAnyCube())) {
    await deps.bootstrapSeedCube();
  }

  const { SEED_ORIGIN, SPAWN_CUBE_SCAN_STEPS, SPAWN_AXIS_ATTEMPTS, SPAWN_REFERENCE_CUBE_ATTEMPTS } =
    SPAWN_CONSTANTS;

  for (let refAttempt = 0; refAttempt < SPAWN_REFERENCE_CUBE_ATTEMPTS; refAttempt++) {
    const reference = await deps.findRandom();

    for (let axisAttempt = 0; axisAttempt < SPAWN_AXIS_ATTEMPTS; axisAttempt++) {
      const axis = pickRandomAxis(random);
      const direction = pickRandomDirection(random);

      for (let step = 1; step <= SPAWN_CUBE_SCAN_STEPS; step++) {
        const candidate = adjacentOrigin(reference.origin, axis, step * direction);
        if (isSameOrigin(candidate, SEED_ORIGIN)) {
          continue;
        }
        if (!(await deps.existsByOrigin(candidate))) {
          return candidate;
        }
      }
    }
  }

  throw new NoEmptyCubeSlotError();
};
