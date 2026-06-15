import { GALAXY_CONSTANTS } from '../constants/galaxy.constants';
import {
  formatOriginKey,
  getMinCorner,
  globalToLocal,
  isGlobalInCube,
  isValidLocalCoords,
  localToGlobal,
  resolveCubeCenterFromGlobal,
} from './coordinates';
import { hashOriginToName } from './cube-naming';

const { CUBE_HALF_LY } = GALAXY_CONSTANTS;

describe('coordinates', () => {
  const origin = { x: 10, y: 10, z: 10 };

  it('resolves cube center from global position', () => {
    expect(resolveCubeCenterFromGlobal({ x: 7, y: 8, z: 6 })).toEqual(origin);
    expect(resolveCubeCenterFromGlobal({ x: 5, y: 5, z: 5 })).toEqual(origin);
    expect(resolveCubeCenterFromGlobal({ x: 4.9, y: 5, z: 5 })).toEqual({
      x: 0,
      y: 10,
      z: 10,
    });
    expect(resolveCubeCenterFromGlobal({ x: -5, y: -5, z: -5 })).toEqual({
      x: 0,
      y: 0,
      z: 0,
    });
    expect(resolveCubeCenterFromGlobal({ x: -5.1, y: 0, z: 0 })).toEqual({
      x: -10,
      y: 0,
      z: 0,
    });
  });

  it('computes minimum corner from cube center', () => {
    expect(getMinCorner({ x: 0, y: 0, z: 0 })).toEqual({
      x: -CUBE_HALF_LY,
      y: -CUBE_HALF_LY,
      z: -CUBE_HALF_LY,
    });
    expect(getMinCorner(origin)).toEqual({ x: 5, y: 5, z: 5 });
  });

  it('converts between local and global coordinates', () => {
    const local = { x: 2, y: 3, z: 1 };
    const global = localToGlobal(origin, local);
    expect(global).toEqual({ x: 7, y: 8, z: 6 });
    expect(globalToLocal(origin, global)).toEqual(local);
  });

  it('validates local coordinates within [0, 10)', () => {
    expect(isValidLocalCoords({ x: 0, y: 0, z: 0 })).toBe(true);
    expect(isValidLocalCoords({ x: 9.9, y: 5, z: 5 })).toBe(true);
    expect(isValidLocalCoords({ x: 10, y: 5, z: 5 })).toBe(false);
    expect(isValidLocalCoords({ x: -0.1, y: 5, z: 5 })).toBe(false);
  });

  it('checks whether a global point lies inside a cube', () => {
    expect(isGlobalInCube(origin, { x: 7, y: 8, z: 6 })).toBe(true);
    expect(isGlobalInCube(origin, { x: 5, y: 5, z: 5 })).toBe(true);
    expect(isGlobalInCube(origin, { x: 15, y: 10, z: 10 })).toBe(false);
  });

  it('matches documented example for cube centered at (10, 10, 10)', () => {
    const alphaLocal = { x: 2.1, y: 3.4, z: 5.6 };
    const betaLocal = { x: 7.8, y: 1.2, z: 4.5 };
    const gammaLocal = { x: 5.0, y: 8.9, z: 2.3 };

    expect(localToGlobal(origin, alphaLocal)).toEqual({
      x: 7.1,
      y: 8.4,
      z: 10.6,
    });
    expect(localToGlobal(origin, betaLocal)).toEqual({
      x: 12.8,
      y: 6.2,
      z: 9.5,
    });
    expect(localToGlobal(origin, gammaLocal)).toEqual({
      x: 10.0,
      y: 13.9,
      z: 7.3,
    });
  });
});

describe('cube-naming integration', () => {
  it('produces deterministic pronounceable names from origin keys', () => {
    const originKey = formatOriginKey({ x: 10, y: 10, z: 10 });
    const first = hashOriginToName(originKey);
    const second = hashOriginToName(originKey);
    expect(first).toBe(second);
    expect(first).toBe('Ces Luf Top');
  });
});
