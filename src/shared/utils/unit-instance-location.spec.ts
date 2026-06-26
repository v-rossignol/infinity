import {
  buildCubeLocation,
  buildStarSystemLocation,
  buildUnitPlanetLocation,
} from './player-location';
import { computeDenormalizedFields } from './unit-instance-location';

const CUBE_ID = '550e8400-e29b-41d4-a716-446655440000';
const STAR_SYSTEM_ID = '661e8400-e29b-41d4-a716-446655440001';
const PLANET_ID = '661e8400-e29b-41d4-a716-446655440001-p1';

describe('unit-instance-location', () => {
  describe('computeDenormalizedFields', () => {
    it('derives planet depth with planetId only', () => {
      const location = buildUnitPlanetLocation({
        cubeId: CUBE_ID,
        starSystemId: STAR_SYSTEM_ID,
        planetId: PLANET_ID,
        hex_coords: { q: 12, r: 7 },
        position: { x: 0.35, y: 0.72 },
      });

      expect(computeDenormalizedFields(location)).toEqual({
        placeLevel: 'planet',
        cubeId: CUBE_ID,
        starSystemId: null,
        planetId: PLANET_ID,
      });
    });

    it('derives starSystem depth with starSystemId only', () => {
      const location = buildStarSystemLocation({
        cubeId: CUBE_ID,
        starSystemId: STAR_SYSTEM_ID,
        position: { x: 120.5, y: 340.0 },
      });

      expect(computeDenormalizedFields(location)).toEqual({
        placeLevel: 'starSystem',
        cubeId: CUBE_ID,
        starSystemId: STAR_SYSTEM_ID,
        planetId: null,
      });
    });

    it('derives cube depth with cubeId only', () => {
      const location = buildCubeLocation({
        cubeId: CUBE_ID,
        position: { x: 3.5, y: 7.2, z: 1.0 },
      });

      expect(computeDenormalizedFields(location)).toEqual({
        placeLevel: 'cube',
        cubeId: CUBE_ID,
        starSystemId: null,
        planetId: null,
      });
    });
  });
});
