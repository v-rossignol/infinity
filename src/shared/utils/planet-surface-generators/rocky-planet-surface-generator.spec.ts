import { getPlanetGridHeight, getPlanetHexCount } from '../planet-surface-generation';
import {
  getRockyDesertRowRange,
  getRockyIceRowRanges,
  RockyPlanetSurfaceGenerator,
} from './rocky-planet-surface-generator';

const ALLOWED_BIOMES = new Set(['ocean', 'ice', 'forest', 'mountain', 'plain', 'desert']);

describe('RockyPlanetSurfaceGenerator', () => {
  const generator = new RockyPlanetSurfaceGenerator();

  it('produces radius × (radius + 1) hexagons', () => {
    const surface = generator.generate({ seed: 'rocky-planet-1', radius: 5, type: 'rocky' });
    expect(surface.hexagons).toHaveLength(getPlanetHexCount(5));
  });

  it('only assigns ocean, ice, forest, mountain, plain, or desert biomes', () => {
    const surface = generator.generate({ seed: 'rocky-planet-2', radius: 15, type: 'rocky' });
    for (const hex of surface.hexagons) {
      expect(ALLOWED_BIOMES.has(hex.biome)).toBe(true);
    }
  });

  it('never assigns ice outside the top or bottom polar rows', () => {
    const radius = 15;
    const height = getPlanetGridHeight(radius);
    const ranges = getRockyIceRowRanges(height)!;
    const polarHeight = Math.max(1, Math.round(height / 6));
    expect(ranges.top.end - ranges.top.start + 1).toBe(polarHeight);
    expect(ranges.bottom.end - ranges.bottom.start + 1).toBe(polarHeight);
    const surface = generator.generate({ seed: 'rocky-planet-ice', radius, type: 'rocky' });

    for (const hex of surface.hexagons) {
      if (hex.biome !== 'ice') {
        continue;
      }

      const { r } = hex.coordinates;
      const inTopQuarter = r >= ranges.top.start && r <= ranges.top.end;
      const inBottomQuarter = r >= ranges.bottom.start && r <= ranges.bottom.end;
      expect(inTopQuarter || inBottomQuarter).toBe(true);
    }
  });

  it('never assigns desert outside the centered middle third of rows', () => {
    const radius = 15;
    const height = getPlanetGridHeight(radius);
    const range = getRockyDesertRowRange(height)!;
    const surface = generator.generate({ seed: 'rocky-planet-desert', radius, type: 'rocky' });

    for (const hex of surface.hexagons) {
      if (hex.biome === 'desert') {
        expect(hex.coordinates.r).toBeGreaterThanOrEqual(range.start);
        expect(hex.coordinates.r).toBeLessThanOrEqual(range.end);
      }
    }
  });

  it('weights polar rows with renormalized ice, ocean, forest, and mountain ratios', () => {
    const radius = 15;
    const height = getPlanetGridHeight(radius);
    const ranges = getRockyIceRowRanges(height)!;
    const counts = { ocean: 0, ice: 0, forest: 0, mountain: 0, plain: 0 };

    for (let i = 0; i < 30; i++) {
      const surface = generator.generate({ seed: `polar-${i}`, radius, type: 'rocky' });
      for (const hex of surface.hexagons) {
        const { r } = hex.coordinates;
        const inPolar =
          (r >= ranges.top.start && r <= ranges.top.end) ||
          (r >= ranges.bottom.start && r <= ranges.bottom.end);
        if (!inPolar) {
          continue;
        }
        counts[hex.biome as keyof typeof counts]++;
      }
    }

    const polarHexCount =
      30 * radius * (ranges.top.end - ranges.top.start + ranges.bottom.end - ranges.bottom.start + 2);
    expect(counts.ocean / polarHexCount).toBeCloseTo(0.28 / 0.88, 1);
    expect(counts.ice / polarHexCount).toBeCloseTo(0.05 / 0.88, 1);
    expect(counts.forest / polarHexCount).toBeCloseTo(0.22 / 0.88, 1);
    expect(counts.mountain / polarHexCount).toBeCloseTo(0.18 / 0.88, 1);
    expect(counts.plain / polarHexCount).toBeCloseTo(0.15 / 0.88, 1);
  });

  it('weights desert rows with renormalized ocean, forest, mountain, and desert ratios', () => {
    const radius = 15;
    const height = getPlanetGridHeight(radius);
    const range = getRockyDesertRowRange(height)!;
    const counts = { ocean: 0, forest: 0, mountain: 0, plain: 0, desert: 0 };

    for (let i = 0; i < 30; i++) {
      const surface = generator.generate({ seed: `desert-band-${i}`, radius, type: 'rocky' });
      for (const hex of surface.hexagons) {
        if (hex.coordinates.r < range.start || hex.coordinates.r > range.end) {
          continue;
        }
        counts[hex.biome as keyof typeof counts]++;
      }
    }

    const desertRowHexCount = 30 * radius * (range.end - range.start + 1);
    expect(counts.ocean / desertRowHexCount).toBeCloseTo(0.28 / 0.95, 1);
    expect(counts.forest / desertRowHexCount).toBeCloseTo(0.22 / 0.95, 1);
    expect(counts.mountain / desertRowHexCount).toBeCloseTo(0.18 / 0.95, 1);
    expect(counts.plain / desertRowHexCount).toBeCloseTo(0.15 / 0.95, 1);
    expect(counts.desert / desertRowHexCount).toBeCloseTo(0.12 / 0.95, 1);
  });

  it('covers each coordinate pair once for radius = 5', () => {
    const surface = generator.generate({ seed: 'rocky-planet-3', radius: 5, type: 'rocky' });
    const coords = surface.hexagons.map((hex) => `${hex.coordinates.q},${hex.coordinates.r}`);
    expect(new Set(coords).size).toBe(getPlanetHexCount(5));
  });

  it('is deterministic for the same seed and radius', () => {
    const options = { seed: 'stable-rocky-planet', radius: 5, type: 'rocky' as const };
    const first = generator.generate(options);
    const second = generator.generate(options);
    expect(first.hexagons).toEqual(second.hexagons);
  });
});
