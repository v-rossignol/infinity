import { GALAXY_CONSTANTS } from '../constants/galaxy.constants';
import {
  generateCube,
  generateStarPositions,
  hasMinimumSeparation,
  isGridAlignedOrigin,
  LOCAL_COORD_DECIMALS,
  MIN_STAR_SEPARATION_LY,
  pickWeightedStarType,
  randomIntInclusive,
  randomLocalAxis,
  randomLocalCoords,
  roundToDecimals,
  STAR_TYPE_WEIGHTS,
} from './galaxy-generation';

describe('galaxy-generation', () => {
  describe('isGridAlignedOrigin', () => {
    it('accepts multiples of 10 on each axis', () => {
      expect(isGridAlignedOrigin({ x: 0, y: 0, z: 0 })).toBe(true);
      expect(isGridAlignedOrigin({ x: 10, y: -10, z: 20 })).toBe(true);
    });

    it('rejects non-grid-aligned origins', () => {
      expect(isGridAlignedOrigin({ x: 5, y: 0, z: 0 })).toBe(false);
      expect(isGridAlignedOrigin({ x: 10, y: 10, z: 15 })).toBe(false);
    });
  });

  describe('randomLocalAxis', () => {
    it('returns values in [0, 10) with one decimal place', () => {
      for (let i = 0; i < 100; i++) {
        const value = randomLocalAxis();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(10);
        expect(value).toBe(roundToDecimals(value, LOCAL_COORD_DECIMALS));
      }
    });
  });

  describe('generateStarPositions', () => {
    it('places stars at least 1 LY apart', () => {
      const positions = generateStarPositions({
        count: 20,
        random: () => Math.random(),
      });
      expect(positions).toHaveLength(20);
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          expect(hasMinimumSeparation(positions[i], [positions[j]])).toBe(true);
        }
      }
    });
  });

  describe('pickWeightedStarType', () => {
    it('selects types according to cumulative weights', () => {
      expect(pickWeightedStarType(() => 0)).toBe('yellow');
      expect(pickWeightedStarType(() => 0.49)).toBe('yellow');
      expect(pickWeightedStarType(() => 0.5)).toBe('red');
      expect(pickWeightedStarType(() => 0.69)).toBe('red');
      expect(pickWeightedStarType(() => 0.7)).toBe('white');
      expect(pickWeightedStarType(() => 0.89)).toBe('white');
      expect(pickWeightedStarType(() => 0.9)).toBe('blue');
    });
  });

  describe('generateCube', () => {
    const origin = { x: 10, y: 10, z: 10 };
    let randomCall = 0;
    const randomValues = [0.3, 0.6, 0.1, 0.8, 0.2, 0.4, 0.9, 0.15, 0.55, 0.75];
    const random = () => randomValues[randomCall++ % randomValues.length];

    let uuidCall = 0;
    const nextUuid = () => {
      uuidCall += 1;
      return uuidCall === 1
        ? '550e8400-e29b-41d4-a716-446655440000'
        : `660e8400-e29b-41d4-a716-4466554400${String(uuidCall - 1).padStart(2, '0')}`;
    };

    beforeEach(() => {
      randomCall = 0;
      uuidCall = 0;
    });

    it('rejects non-grid-aligned origins', () => {
      expect(() => generateCube({ origin: { x: 5, y: 10, z: 10 } })).toThrow(/grid-aligned/);
    });

    it('returns cube and stars with expected shape', () => {
      const result = generateCube({
        origin,
        random,
        uuid: nextUuid,
      });

      expect(result.cube.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.cube.name).toBe('Ces Luf Top');
      expect(result.cube.origin).toEqual(origin);
      expect(result.cube.star_ids).toHaveLength(result.stars.length);
      expect(result.stars.length).toBeGreaterThanOrEqual(GALAXY_CONSTANTS.MIN_STARS_PER_CUBE);
      expect(result.stars.length).toBeLessThanOrEqual(GALAXY_CONSTANTS.MAX_STARS_PER_CUBE);
    });

    it('assigns uuid ids, greek-letter names, and cube references on stars', () => {
      const result = generateCube({
        origin,
        random,
        uuid: nextUuid,
      });

      expect(result.stars[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(result.stars[0].name).toBe(`Alpha ${result.cube.name}`);
      expect(result.stars[0].cube_id).toBe(result.cube.id);
      expect(result.cube.star_ids).toEqual(result.stars.map((star) => star.id));
      expect(STAR_TYPE_WEIGHTS.map((entry) => entry.type)).toContain(
        result.stars[0].properties.type,
      );
    });

    it('produces different star layouts across generations', () => {
      const first = generateCube({ origin });
      const second = generateCube({ origin });
      const sameLayout =
        first.stars.length === second.stars.length &&
        first.stars.every((star, index) => {
          const other = second.stars[index];
          return (
            star.local_coords.x === other.local_coords.x &&
            star.local_coords.y === other.local_coords.y &&
            star.local_coords.z === other.local_coords.z &&
            star.properties.type === other.properties.type
          );
        });
      expect(sameLayout).toBe(false);
    });
  });

  describe('randomIntInclusive', () => {
    it('returns integers within the inclusive range', () => {
      expect(randomIntInclusive(5, 20, () => 0)).toBe(5);
      expect(randomIntInclusive(5, 20, () => 0.999)).toBe(20);
    });
  });

  describe('randomLocalCoords', () => {
    it('returns vec3 with valid local bounds', () => {
      const coords = randomLocalCoords(() => 0.5);
      expect(coords.x).toBeGreaterThanOrEqual(0);
      expect(coords.x).toBeLessThan(10);
      expect(coords.y).toBeGreaterThanOrEqual(0);
      expect(coords.y).toBeLessThan(10);
      expect(coords.z).toBeGreaterThanOrEqual(0);
      expect(coords.z).toBeLessThan(10);
    });
  });
});
