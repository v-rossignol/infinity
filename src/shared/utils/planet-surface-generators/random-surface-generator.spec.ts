import { getPlanetGridHeight, getPlanetHexCount } from '../planet-surface-generation';
import { RandomSurfaceGenerator } from './random-surface-generator';

describe('RandomSurfaceGenerator', () => {
  const generator = new RandomSurfaceGenerator();

  it('produces radius × (radius + 1) hexagons', () => {
    const surface = generator.generate({ seed: 'test-planet-1', radius: 5, type: 'rocky' });
    expect(surface.hexagons).toHaveLength(getPlanetHexCount(5));
    expect(getPlanetGridHeight(5)).toBe(6);
  });

  it('assigns empty resources on every hex', () => {
    const surface = generator.generate({ seed: 'test-planet-2', radius: 7, type: 'ice' });
    for (const hex of surface.hexagons) {
      expect(hex.resources).toEqual([]);
    }
  });

  it('covers each coordinate pair once for radius = 5', () => {
    const surface = generator.generate({ seed: 'test-planet-3', radius: 5, type: 'lava' });
    const coords = surface.hexagons.map((hex) => `${hex.coordinates.q},${hex.coordinates.r}`);
    expect(new Set(coords).size).toBe(getPlanetHexCount(5));
  });

  it('is deterministic for the same seed and radius', () => {
    const options = { seed: 'stable-planet', radius: 5, type: 'rocky' as const };
    const first = generator.generate(options);
    const second = generator.generate(options);
    expect(first.hexagons).toEqual(second.hexagons);
  });
});
