import { getPlanetGridHeight, getPlanetHexCount } from '../planet-surface-generation';
import { getIceOceanRowRange, IcePlanetSurfaceGenerator } from './ice-planet-surface-generator';

const ALLOWED_BIOMES = new Set(['ice', 'mountain', 'ocean']);

describe('IcePlanetSurfaceGenerator', () => {
  const generator = new IcePlanetSurfaceGenerator();

  it('produces radius × (radius + 1) hexagons', () => {
    const surface = generator.generate({ seed: 'ice-planet-1', radius: 5, type: 'ice' });
    expect(surface.hexagons).toHaveLength(getPlanetHexCount(5));
  });

  it('only assigns ice, mountain, or ocean biomes', () => {
    const surface = generator.generate({ seed: 'ice-planet-2', radius: 15, type: 'ice' });
    for (const hex of surface.hexagons) {
      expect(ALLOWED_BIOMES.has(hex.biome)).toBe(true);
    }
  });

  it('never assigns ocean outside the centered middle third of rows', () => {
    const radius = 15;
    const height = getPlanetGridHeight(radius);
    const range = getIceOceanRowRange(height)!;
    const surface = generator.generate({ seed: 'ice-planet-band', radius, type: 'ice' });

    for (const hex of surface.hexagons) {
      if (hex.biome === 'ocean') {
        expect(hex.coordinates.r).toBeGreaterThanOrEqual(range.start);
        expect(hex.coordinates.r).toBeLessThanOrEqual(range.end);
      }
    }

    expect(range.end - range.start + 1).toBe(Math.round(height / 3));
  });

  it('weights ocean rows roughly 50% ice, 40% mountain, 10% ocean', () => {
    const radius = 15;
    const height = getPlanetGridHeight(radius);
    const range = getIceOceanRowRange(height)!;
    const counts = { ice: 0, mountain: 0, ocean: 0 };

    for (let i = 0; i < 30; i++) {
      const surface = generator.generate({ seed: `distribution-${i}`, radius, type: 'ice' });
      for (const hex of surface.hexagons) {
        if (hex.coordinates.r < range.start || hex.coordinates.r > range.end) {
          continue;
        }
        counts[hex.biome as keyof typeof counts]++;
      }
    }

    const oceanRowHexCount = 30 * radius * (range.end - range.start + 1);
    expect(counts.ice / oceanRowHexCount).toBeCloseTo(0.5, 1);
    expect(counts.mountain / oceanRowHexCount).toBeCloseTo(0.4, 1);
    expect(counts.ocean / oceanRowHexCount).toBeCloseTo(0.1, 1);
  });

  it('covers each coordinate pair once for radius = 5', () => {
    const surface = generator.generate({ seed: 'ice-planet-3', radius: 5, type: 'ice' });
    const coords = surface.hexagons.map((hex) => `${hex.coordinates.q},${hex.coordinates.r}`);
    expect(new Set(coords).size).toBe(getPlanetHexCount(5));
  });

  it('is deterministic for the same seed and radius', () => {
    const options = { seed: 'stable-ice-planet', radius: 5, type: 'ice' as const };
    const first = generator.generate(options);
    const second = generator.generate(options);
    expect(first.hexagons).toEqual(second.hexagons);
  });
});
