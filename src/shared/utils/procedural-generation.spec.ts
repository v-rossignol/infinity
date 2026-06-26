import { GAME_CONSTANTS } from '../constants/game.constants';
import { getPlanetName } from './planet-naming';
import {
  generatePlanet,
  generateStarSystem,
  rollOddPlanetRadius,
  rollPlanetCount,
  rollUniquePlanetOrbitDistances,
} from './procedural-generation';
import { Noise } from 'noisejs';

describe('procedural-generation', () => {
  const starName = 'Alpha Ces Luf Top';

  it('generates a star system with planets only (no stars)', () => {
    const system = generateStarSystem({ seed: 'test-system-1', starName });
    expect(system.name).toContain('Star System');
    expect(system).not.toHaveProperty('stars');
    expect(system.planets.length).toBeGreaterThanOrEqual(GAME_CONSTANTS.PLANET_COUNT_MIN);
    expect(system.planets.length).toBeLessThanOrEqual(GAME_CONSTANTS.PLANET_COUNT_MAX);
  });

  it('rollPlanetCount returns an integer in the configured range', () => {
    const noise = new Noise();
    const counts = new Set<number>();

    for (let seed = 1; seed <= 200; seed++) {
      noise.seed(seed);
      const count = rollPlanetCount(noise);

      expect(Number.isInteger(count)).toBe(true);
      expect(count).toBeGreaterThanOrEqual(GAME_CONSTANTS.PLANET_COUNT_MIN);
      expect(count).toBeLessThanOrEqual(GAME_CONSTANTS.PLANET_COUNT_MAX);
      counts.add(count);
    }

    expect(counts.size).toBeGreaterThan(1);
  });

  it('names planets from the parent star name and generation order', () => {
    const system = generateStarSystem({ seed: 'test-system-1', starName });

    system.planets.forEach((planet, index) => {
      expect(planet.name).toBe(getPlanetName(starName, index + 1));
    });
  });

  it('assigns procedural planet ids with 1-based -p suffix', () => {
    const seed = '550e8400-e29b-41d4-a716-446655440000';
    const system = generateStarSystem({ seed, starName });

    system.planets.forEach((planet, index) => {
      expect(planet.id).toBe(`${seed}-p${index + 1}`);
    });
  });

  it('rollOddPlanetRadius returns only odd integers from min to max', () => {
    const { PLANET_RADIUS_MIN, PLANET_RADIUS_MAX } = GAME_CONSTANTS;
    const seen = new Set<number>();

    for (let i = 0; i < 200; i++) {
      const radius = rollOddPlanetRadius();
      expect(radius % 2).toBe(1);
      expect(radius).toBeGreaterThanOrEqual(PLANET_RADIUS_MIN);
      expect(radius).toBeLessThanOrEqual(PLANET_RADIUS_MAX);
      seen.add(radius);
    }

    expect(seen).toEqual(new Set([5, 7, 9, 11, 13, 15]));
  });

  it('generateStarSystem assigns odd planet radius within configured range', () => {
    const { PLANET_RADIUS_MIN, PLANET_RADIUS_MAX } = GAME_CONSTANTS;

    for (let run = 0; run < 30; run++) {
      const system = generateStarSystem({ seed: `radius-test-${run}`, starName });

      for (const planet of system.planets) {
        expect(planet.radius % 2).toBe(1);
        expect(planet.radius).toBeGreaterThanOrEqual(PLANET_RADIUS_MIN);
        expect(planet.radius).toBeLessThanOrEqual(PLANET_RADIUS_MAX);
        expect(Number.isInteger(planet.radius)).toBe(true);
      }
    }
  });

  it('assigns unique integer distanceFromStar values', () => {
    for (let run = 0; run < 30; run++) {
      const system = generateStarSystem({ seed: `orbit-test-${run}`, starName });
      const distances = system.planets.map((planet) => planet.distanceFromStar);

      for (const distance of distances) {
        expect(Number.isInteger(distance)).toBe(true);
        expect(distance).toBeGreaterThanOrEqual(GAME_CONSTANTS.PLANET_ORBIT_DISTANCE_MIN);
        expect(distance).toBeLessThanOrEqual(GAME_CONSTANTS.PLANET_ORBIT_DISTANCE_MAX);
      }

      expect(new Set(distances).size).toBe(distances.length);
    }
  });

  it('rollUniquePlanetOrbitDistances returns sorted unique integers', () => {
    const distances = rollUniquePlanetOrbitDistances(5, () => 0.5);

    expect(distances).toHaveLength(5);
    expect(new Set(distances).size).toBe(5);
    expect(distances.every((distance) => Number.isInteger(distance))).toBe(true);
    expect([...distances].sort((left, right) => left - right)).toEqual(distances);
  });

  it('assigns distanceFromStar instead of map coordinates', () => {
    const system = generateStarSystem({ seed: 'test-system-1', starName });

    for (const planet of system.planets) {
      expect(planet).not.toHaveProperty('x');
      expect(planet).not.toHaveProperty('y');
      expect(Number.isInteger(planet.distanceFromStar)).toBe(true);
      expect(planet.distanceFromStar).toBeGreaterThan(0);
    }
  });

  it('generates a planet with maps and resources', () => {
    const planet = generatePlanet({ seed: 'test-planet-1', width: 16, height: 16 });
    expect(planet.name).toContain('Planet');
    expect(planet.biomeTypes.length).toBeGreaterThan(0);
    expect(planet.heightMap).toHaveLength(16);
    expect(planet.tileMap).toHaveLength(16);
    expect(planet.resources.iron).toBeGreaterThanOrEqual(0);
  });
});
