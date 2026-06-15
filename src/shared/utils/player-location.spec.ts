import {
  PlayerLocationInCube,
  PlayerLocationInStarSystem,
  PlayerLocationOnPlanet,
} from '../interfaces/player-location.interface';
import {
  assertValidLocation,
  buildPlanetLocation,
  getLocationDepth,
  InvalidPlayerLocationError,
  isFreshy,
} from './player-location';

const CUBE_ID = '550e8400-e29b-41d4-a716-446655440000';
const STAR_SYSTEM_ID = '661e8400-e29b-41d4-a716-446655440001';
const PLANET_ID = '661e8400-e29b-41d4-a716-446655440001_planet_0';

const onPlanet: PlayerLocationOnPlanet = {
  cube: { id: CUBE_ID },
  starSystem: { id: STAR_SYSTEM_ID },
  planet: {
    id: PLANET_ID,
    hex_coords: { q: 4, r: 7 },
  },
};

const inStarSystem: PlayerLocationInStarSystem = {
  cube: { id: CUBE_ID },
  starSystem: {
    id: STAR_SYSTEM_ID,
    position: { x: 145.2, y: 34.8 },
  },
};

const inCube: PlayerLocationInCube = {
  cube: {
    id: CUBE_ID,
    position: { x: 2.1, y: 3.4, z: 5.6 },
  },
};

describe('player-location', () => {
  describe('isFreshy', () => {
    it('returns true when location is null or undefined', () => {
      expect(isFreshy({ location: null })).toBe(true);
      expect(isFreshy({})).toBe(true);
    });

    it('returns false when location is set', () => {
      expect(isFreshy({ location: onPlanet })).toBe(false);
    });
  });

  describe('getLocationDepth', () => {
    it('returns planet, starSystem, or cube for valid shapes', () => {
      expect(getLocationDepth(onPlanet)).toBe('planet');
      expect(getLocationDepth(inStarSystem)).toBe('starSystem');
      expect(getLocationDepth(inCube)).toBe('cube');
    });
  });

  describe('assertValidLocation', () => {
    it('accepts example payloads from the WIP spec', () => {
      expect(() => assertValidLocation(onPlanet)).not.toThrow();
      expect(() => assertValidLocation(inStarSystem)).not.toThrow();
      expect(() => assertValidLocation(inCube)).not.toThrow();
    });

    it('rejects null and non-objects', () => {
      expect(() => assertValidLocation(null)).toThrow(InvalidPlayerLocationError);
      expect(() => assertValidLocation('bad')).toThrow(InvalidPlayerLocationError);
    });

    it('rejects empty or partial objects', () => {
      expect(() => assertValidLocation({})).toThrow(InvalidPlayerLocationError);
      expect(() => assertValidLocation({ cube: {} })).toThrow(InvalidPlayerLocationError);
    });

    it('rejects cube.position at planet depth', () => {
      expect(() =>
        assertValidLocation({
          ...onPlanet,
          cube: { id: CUBE_ID, position: { x: 1, y: 2, z: 3 } },
        }),
      ).toThrow(/cube\.position is not allowed at planet depth/);
    });

    it('rejects planet combined with starSystem.position', () => {
      expect(() =>
        assertValidLocation({
          ...inStarSystem,
          planet: onPlanet.planet,
        }),
      ).toThrow(/cannot combine planet with starSystem\.position/);
    });

    it('rejects cube.position when starSystem.position is set', () => {
      expect(() =>
        assertValidLocation({
          cube: { id: CUBE_ID, position: { x: 1, y: 2, z: 3 } },
          starSystem: inStarSystem.starSystem,
        }),
      ).toThrow(/cube\.position is not allowed at starSystem depth/);
    });

    it('rejects starSystem identity without position or planet', () => {
      expect(() =>
        assertValidLocation({
          cube: { id: CUBE_ID, position: { x: 1, y: 2, z: 3 } },
          starSystem: { id: STAR_SYSTEM_ID },
        }),
      ).toThrow(/starSystem without planet must include starSystem\.position/);
    });

    it('rejects planet without starSystem context', () => {
      expect(() =>
        assertValidLocation({
          ...inCube,
          planet: onPlanet.planet,
        }),
      ).toThrow(/starSystem is required when planet is present/);
    });

    it('rejects starSystem.position at planet depth', () => {
      expect(() =>
        assertValidLocation({
          ...onPlanet,
          starSystem: { id: STAR_SYSTEM_ID, position: { x: 1, y: 2 } },
        }),
      ).toThrow(/cannot combine planet with starSystem\.position/);
    });

    it('rejects cube local position outside [0, 10)', () => {
      expect(() =>
        assertValidLocation({
          cube: { id: CUBE_ID, position: { x: 10, y: 0, z: 0 } },
        }),
      ).toThrow(/local cube coordinates/);

      expect(() =>
        assertValidLocation({
          cube: { id: CUBE_ID, position: { x: -0.1, y: 0, z: 0 } },
        }),
      ).toThrow(/local cube coordinates/);
    });

    it('rejects negative hex coordinates', () => {
      expect(() =>
        assertValidLocation({
          ...onPlanet,
          planet: { id: PLANET_ID, hex_coords: { q: -1, r: 0 } },
        }),
      ).toThrow(/planet\.hex_coords\.q/);
    });
  });

  describe('buildPlanetLocation', () => {
    it('builds a valid planet-depth location', () => {
      const location = buildPlanetLocation({
        cubeId: CUBE_ID,
        starSystemId: STAR_SYSTEM_ID,
        planetId: PLANET_ID,
        hex_coords: { q: 2, r: 5 },
      });

      expect(location).toEqual({
        cube: { id: CUBE_ID },
        starSystem: { id: STAR_SYSTEM_ID },
        planet: { id: PLANET_ID, hex_coords: { q: 2, r: 5 } },
      });
      expect(getLocationDepth(location)).toBe('planet');
    });

    it('throws when hex coordinates are invalid', () => {
      expect(() =>
        buildPlanetLocation({
          cubeId: CUBE_ID,
          starSystemId: STAR_SYSTEM_ID,
          planetId: PLANET_ID,
          hex_coords: { q: 1.5, r: 0 },
        }),
      ).toThrow(InvalidPlayerLocationError);
    });
  });
});
