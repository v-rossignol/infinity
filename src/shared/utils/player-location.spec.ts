import {
  PlayerLocationInCube,
  PlayerLocationInStarSystem,
  PlayerLocationOnPlanet,
} from '../interfaces/player-location.interface';
import {
  assertValidLocation,
  buildPlanetLocation,
  buildUnitPlanetLocation,
  getLocationDepth,
  hasPlanetHex,
  InvalidLocationError,
  InvalidPlayerLocationError,
  isFreshy,
} from './player-location';

const CUBE_ID = '550e8400-e29b-41d4-a716-446655440000';
const STAR_SYSTEM_ID = '661e8400-e29b-41d4-a716-446655440001';
const PLANET_ID = '661e8400-e29b-41d4-a716-446655440001-p1';

const onPlanet: PlayerLocationOnPlanet = {
  cube: { id: CUBE_ID },
  starSystem: { id: STAR_SYSTEM_ID },
  planet: {
    id: PLANET_ID,
    hex_coords: { q: 4, r: 7 },
  },
};

const onPlanetOverview: PlayerLocationOnPlanet = {
  cube: { id: CUBE_ID },
  starSystem: { id: STAR_SYSTEM_ID },
  planet: {
    id: PLANET_ID,
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

  describe('hasPlanetHex', () => {
    it('returns true when hex_coords are present', () => {
      expect(hasPlanetHex(onPlanet)).toBe(true);
    });

    it('returns false for planet overview without hex', () => {
      expect(hasPlanetHex(onPlanetOverview)).toBe(false);
    });
  });

  describe('getLocationDepth', () => {
    it('returns planet, starSystem, or cube for valid shapes', () => {
      expect(getLocationDepth(onPlanet)).toBe('planet');
      expect(getLocationDepth(onPlanetOverview)).toBe('planet');
      expect(getLocationDepth(inStarSystem)).toBe('starSystem');
      expect(getLocationDepth(inCube)).toBe('cube');
    });
  });

  describe('assertValidLocation — player profile', () => {
    it('accepts example payloads from the WIP spec', () => {
      expect(() => assertValidLocation(onPlanet)).not.toThrow();
      expect(() => assertValidLocation(onPlanetOverview)).not.toThrow();
      expect(() => assertValidLocation(inStarSystem)).not.toThrow();
      expect(() => assertValidLocation(inCube)).not.toThrow();
    });

    it('rejects null and non-objects', () => {
      expect(() => assertValidLocation(null)).toThrow(InvalidLocationError);
      expect(() => assertValidLocation('bad')).toThrow(InvalidLocationError);
      expect(() => assertValidLocation(null)).toThrow(InvalidPlayerLocationError);
    });

    it('rejects empty or partial objects', () => {
      expect(() => assertValidLocation({})).toThrow(InvalidLocationError);
      expect(() => assertValidLocation({ cube: {} })).toThrow(InvalidLocationError);
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

    it('rejects planet.position for player profile', () => {
      expect(() =>
        assertValidLocation(
          {
            ...onPlanet,
            planet: {
              id: PLANET_ID,
              hex_coords: { q: 1, r: 2 },
              position: { x: 0.5, y: 0.5 },
            },
          },
          { subject: 'player' },
        ),
      ).toThrow(/planet\.position is not allowed for player profile/);
    });
  });

  describe('assertValidLocation — unit profile', () => {
    const unitOnPlanet: PlayerLocationOnPlanet = {
      cube: { id: CUBE_ID },
      starSystem: { id: STAR_SYSTEM_ID },
      planet: {
        id: PLANET_ID,
        hex_coords: { q: 12, r: 7 },
        position: { x: 0.35, y: 0.72 },
      },
    };

    it('accepts planet + hex + in-hex position', () => {
      expect(() => assertValidLocation(unitOnPlanet, { subject: 'unit' })).not.toThrow();
    });

    it('rejects planet overview without hex', () => {
      expect(() => assertValidLocation(onPlanetOverview, { subject: 'unit' })).toThrow(
        /planet\.hex_coords is required for unit profile/,
      );
    });

    it('rejects planet + hex without position', () => {
      expect(() => assertValidLocation(onPlanet, { subject: 'unit' })).toThrow(
        /planet\.position is required for unit profile/,
      );
    });
  });

  describe('buildPlanetLocation', () => {
    it('builds a valid planet-depth location with hex', () => {
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

    it('builds a valid planet overview without hex', () => {
      const location = buildPlanetLocation({
        cubeId: CUBE_ID,
        starSystemId: STAR_SYSTEM_ID,
        planetId: PLANET_ID,
      });

      expect(location).toEqual({
        cube: { id: CUBE_ID },
        starSystem: { id: STAR_SYSTEM_ID },
        planet: { id: PLANET_ID },
      });
      expect(hasPlanetHex(location)).toBe(false);
    });

    it('throws when hex coordinates are invalid', () => {
      expect(() =>
        buildPlanetLocation({
          cubeId: CUBE_ID,
          starSystemId: STAR_SYSTEM_ID,
          planetId: PLANET_ID,
          hex_coords: { q: 1.5, r: 0 },
        }),
      ).toThrow(InvalidLocationError);
    });
  });

  describe('buildUnitPlanetLocation', () => {
    it('builds a valid unit planet-depth location', () => {
      const location = buildUnitPlanetLocation({
        cubeId: CUBE_ID,
        starSystemId: STAR_SYSTEM_ID,
        planetId: PLANET_ID,
        hex_coords: { q: 12, r: 7 },
        position: { x: 0.35, y: 0.72 },
      });

      expect(location.planet).toEqual({
        id: PLANET_ID,
        hex_coords: { q: 12, r: 7 },
        position: { x: 0.35, y: 0.72 },
      });
      expect(() => assertValidLocation(location, { subject: 'unit' })).not.toThrow();
    });
  });
});
