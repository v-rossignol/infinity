import { generatePlanet, generateStarSystem } from './procedural-generation';

describe('procedural-generation', () => {
  it('generates a star system with stars and planets', () => {
    const system = generateStarSystem({ seed: 'test-system-1' });
    expect(system.name).toContain('Star System');
    expect(system.stars.length).toBeGreaterThanOrEqual(1);
    expect(system.planets.length).toBeGreaterThanOrEqual(3);
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
