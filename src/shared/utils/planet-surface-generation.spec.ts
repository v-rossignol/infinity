import { generatePlanetSurface, getNeighbors } from './planet-surface-generation';

describe('planet-surface-generation', () => {
  describe('getNeighbors', () => {
    it('wraps toroidally for radius = 3 at (0, 0)', () => {
      expect(getNeighbors(0, 0, 3)).toEqual([
        { q: 2, r: 1 },
        { q: 0, r: 1 },
        { q: 1, r: 0 },
        { q: 1, r: 2 },
        { q: 0, r: 2 },
        { q: 2, r: 0 },
      ]);
    });

    it('wraps toroidally for radius = 5 at (0, 0)', () => {
      expect(getNeighbors(0, 0, 5)).toEqual([
        { q: 4, r: 1 },
        { q: 0, r: 1 },
        { q: 1, r: 0 },
        { q: 1, r: 4 },
        { q: 0, r: 4 },
        { q: 4, r: 0 },
      ]);
    });
  });

  describe('generatePlanetSurface', () => {
    it('produces radius × radius hexagons', () => {
      const surface = generatePlanetSurface({ seed: 'test-planet-1', radius: 5 });
      expect(surface.hexagons).toHaveLength(25);
    });

    it('assigns empty resources on every hex', () => {
      const surface = generatePlanetSurface({ seed: 'test-planet-2', radius: 7 });
      for (const hex of surface.hexagons) {
        expect(hex.resources).toEqual([]);
      }
    });

    it('covers each coordinate pair once for radius = 5', () => {
      const surface = generatePlanetSurface({ seed: 'test-planet-3', radius: 5 });
      const coords = surface.hexagons.map((hex) => `${hex.coordinates.q},${hex.coordinates.r}`);
      expect(new Set(coords).size).toBe(25);
    });
  });
});
