import { PlanetSurfaceGeneratorFactory } from './planet-surface-generators/planet-surface-generator.factory';
import { generatePlanetSurface, getNeighbors } from './planet-surface-generation';

describe('planet-surface-generation', () => {
  describe('getNeighbors', () => {
    it('wraps toroidally for radius = 3 at (0, 0)', () => {
      expect(getNeighbors(0, 0, 3)).toEqual([
        { q: 2, r: 1 },
        { q: 0, r: 1 },
        { q: 1, r: 0 },
        { q: 1, r: 3 },
        { q: 0, r: 3 },
        { q: 2, r: 0 },
      ]);
    });

    it('wraps toroidally for radius = 5 at (0, 0)', () => {
      expect(getNeighbors(0, 0, 5)).toEqual([
        { q: 4, r: 1 },
        { q: 0, r: 1 },
        { q: 1, r: 0 },
        { q: 1, r: 5 },
        { q: 0, r: 5 },
        { q: 4, r: 0 },
      ]);
    });
  });

  describe('generatePlanetSurface', () => {
    it('delegates to PlanetSurfaceGeneratorFactory', () => {
      const options = { seed: 'facade-planet', radius: 5, type: 'rocky' as const };
      const expected = PlanetSurfaceGeneratorFactory.create(options.type, options.radius).generate(
        options,
      );
      expect(generatePlanetSurface(options).hexagons).toEqual(expected.hexagons);
    });
  });
});
