import { GAME_CONSTANTS } from '../constants/game.constants';
import { getPlanetName } from './planet-naming';
import { generatePlanet, generateStarSystem, rollOddPlanetRadius } from './procedural-generation';

describe('procedural-generation', () => {
  const starName = 'Alpha Ces Luf Top';

  it('generates a star system with planets only (no stars)', () => {
    const system = generateStarSystem({ seed: 'test-system-1', starName });
    expect(system.name).toContain('Star System');
    expect(system).not.toHaveProperty('stars');
    expect(system.planets.length).toBeGreaterThanOrEqual(3);
  });

  it('names planets from the parent star name and generation order', () => {
    const system = generateStarSystem({ seed: 'test-system-1', starName });

    system.planets.forEach((planet, index) => {
      expect(planet.name).toBe(getPlanetName(starName, index + 1));
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

  it('generates a planet with maps and resources', () => {
    const planet = generatePlanet({ seed: 'test-planet-1', width: 16, height: 16 });
    expect(planet.name).toContain('Planet');
    expect(planet.biomeTypes.length).toBeGreaterThan(0);
    expect(planet.heightMap).toHaveLength(16);
    expect(planet.tileMap).toHaveLength(16);
    expect(planet.resources.iron).toBeGreaterThanOrEqual(0);
  });
});
