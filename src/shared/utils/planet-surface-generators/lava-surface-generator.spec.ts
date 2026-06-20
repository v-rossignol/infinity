import { getPlanetHexCount } from '../planet-surface-generation';
import { LavaSurfaceGenerator } from './lava-surface-generator';

const ALLOWED_BIOMES = new Set(['volcanic', 'mountain', 'desert']);

describe('LavaSurfaceGenerator', () => {
  const generator = new LavaSurfaceGenerator();

  it('produces radius × (radius + 1) hexagons', () => {
    const surface = generator.generate({ seed: 'lava-planet-1', radius: 5, type: 'lava' });
    expect(surface.hexagons).toHaveLength(getPlanetHexCount(5));
  });

  it('only assigns volcanic, mountain, or desert biomes', () => {
    const surface = generator.generate({ seed: 'lava-planet-2', radius: 15, type: 'lava' });
    for (const hex of surface.hexagons) {
      expect(ALLOWED_BIOMES.has(hex.biome)).toBe(true);
    }
  });

  it('weights biomes roughly 10% volcanic, 30% mountain, 60% desert', () => {
    const counts = { volcanic: 0, mountain: 0, desert: 0 };

    for (let i = 0; i < 10; i++) {
      const surface = generator.generate({ seed: `distribution-${i}`, radius: 15, type: 'lava' });
      for (const hex of surface.hexagons) {
        counts[hex.biome as keyof typeof counts]++;
      }
    }

    const total = 10 * getPlanetHexCount(15);
    expect(counts.volcanic / total).toBeCloseTo(0.1, 1);
    expect(counts.mountain / total).toBeCloseTo(0.3, 1);
    expect(counts.desert / total).toBeCloseTo(0.6, 1);
  });

  it('covers each coordinate pair once for radius = 5', () => {
    const surface = generator.generate({ seed: 'lava-planet-3', radius: 5, type: 'lava' });
    const coords = surface.hexagons.map((hex) => `${hex.coordinates.q},${hex.coordinates.r}`);
    expect(new Set(coords).size).toBe(getPlanetHexCount(5));
  });

  it('is deterministic for the same seed and radius', () => {
    const options = { seed: 'stable-lava-planet', radius: 5, type: 'lava' as const };
    const first = generator.generate(options);
    const second = generator.generate(options);
    expect(first.hexagons).toEqual(second.hexagons);
  });
});
