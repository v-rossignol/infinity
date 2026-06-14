import { SPAWN_CONSTANTS } from '../constants/spawn.constants';
import {
  adjacentOrigin,
  isSameOrigin,
  NoEmptyCubeSlotError,
  pickRandomAxis,
  pickRandomDirection,
  pickSpawnCubeOrigin,
  SpawnCubeSelectionDeps,
} from './spawn-cube-selection';

describe('spawn-cube-selection', () => {
  describe('adjacentOrigin', () => {
    it('offsets only the chosen axis by step size', () => {
      expect(adjacentOrigin({ x: 10, y: 10, z: 10 }, 'x', 2)).toEqual({
        x: 30,
        y: 10,
        z: 10,
      });
      expect(adjacentOrigin({ x: 10, y: 10, z: 10 }, 'z', -1)).toEqual({
        x: 10,
        y: 10,
        z: 0,
      });
    });
  });

  describe('isSameOrigin', () => {
    it('compares all axes', () => {
      expect(isSameOrigin({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toBe(true);
      expect(isSameOrigin({ x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toBe(false);
    });
  });

  describe('pickRandomAxis', () => {
    it('returns x, y, or z from injected random', () => {
      expect(pickRandomAxis(() => 0)).toBe('x');
      expect(pickRandomAxis(() => 0.34)).toBe('y');
      expect(pickRandomAxis(() => 0.67)).toBe('z');
    });
  });

  describe('pickRandomDirection', () => {
    it('returns +1 or -1 from injected random', () => {
      expect(pickRandomDirection(() => 0)).toBe(-1);
      expect(pickRandomDirection(() => 0.5)).toBe(1);
    });
  });

  describe('pickSpawnCubeOrigin', () => {
    const seedOrigin = SPAWN_CONSTANTS.SEED_ORIGIN;

    const buildDeps = (
      overrides: Partial<SpawnCubeSelectionDeps> = {},
    ): SpawnCubeSelectionDeps => ({
      hasAnyCube: jest.fn().mockResolvedValue(true),
      findRandom: jest.fn().mockResolvedValue({ origin: seedOrigin }),
      existsByOrigin: jest.fn().mockResolvedValue(false),
      bootstrapSeedCube: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    });

    let rayRandom: jest.Mock;
    beforeEach(() => {
      rayRandom = jest.fn();
      let callIndex = 0;
      rayRandom.mockImplementation(() => {
        const value = callIndex % 2 === 0 ? 0.1 : 0.9;
        callIndex++;
        return value;
      });
    });

    it('bootstraps seed cube when galaxy is empty', async () => {
      const deps = buildDeps({
        hasAnyCube: jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true),
        existsByOrigin: jest.fn().mockResolvedValue(false),
      });

      const result = await pickSpawnCubeOrigin(deps, rayRandom);

      expect(deps.bootstrapSeedCube).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ x: 10, y: 0, z: 0 });
    });

    it('never returns the seed origin', async () => {
      const deps = buildDeps({
        existsByOrigin: jest.fn().mockResolvedValue(false),
      });

      const result = await pickSpawnCubeOrigin(deps, rayRandom);

      expect(result).toEqual({ x: 10, y: 0, z: 0 });
      expect(isSameOrigin(result, seedOrigin)).toBe(false);
    });

    it('skips occupied slots along the ray', async () => {
      const deps = buildDeps({
        existsByOrigin: jest.fn().mockImplementation(async (origin) => origin.x === 10),
      });

      const result = await pickSpawnCubeOrigin(deps, rayRandom);

      expect(result).toEqual({ x: 20, y: 0, z: 0 });
    });

    it('throws NoEmptyCubeSlotError when no slot is found', async () => {
      const deps = buildDeps({
        existsByOrigin: jest.fn().mockResolvedValue(true),
      });

      await expect(pickSpawnCubeOrigin(deps, rayRandom)).rejects.toBeInstanceOf(
        NoEmptyCubeSlotError,
      );
    });
  });
});
