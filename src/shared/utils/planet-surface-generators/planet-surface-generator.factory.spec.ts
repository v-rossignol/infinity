import { IcePlanetSurfaceGenerator } from './ice-planet-surface-generator';
import { LavaSurfaceGenerator } from './lava-surface-generator';
import { PlanetSurfaceGeneratorFactory } from './planet-surface-generator.factory';
import { RockyPlanetSurfaceGenerator } from './rocky-planet-surface-generator';

describe('PlanetSurfaceGeneratorFactory', () => {
  it('returns LavaSurfaceGenerator for lava planets', () => {
    const generator = PlanetSurfaceGeneratorFactory.create('lava', 7);
    expect(generator).toBeInstanceOf(LavaSurfaceGenerator);
  });

  it('returns IcePlanetSurfaceGenerator for ice planets', () => {
    const generator = PlanetSurfaceGeneratorFactory.create('ice', 7);
    expect(generator).toBeInstanceOf(IcePlanetSurfaceGenerator);
  });

  it('returns RockyPlanetSurfaceGenerator for rocky planets', () => {
    const generator = PlanetSurfaceGeneratorFactory.create('rocky', 7);
    expect(generator).toBeInstanceOf(RockyPlanetSurfaceGenerator);
  });

  it('returns RockyPlanetSurfaceGenerator regardless of radius', () => {
    for (const radius of [5, 7, 15]) {
      const generator = PlanetSurfaceGeneratorFactory.create('rocky', radius);
      expect(generator).toBeInstanceOf(RockyPlanetSurfaceGenerator);
    }
  });
});
