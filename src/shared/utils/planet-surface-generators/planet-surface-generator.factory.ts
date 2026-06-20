import { PlanetType } from '../../interfaces/planet.interface';
import { IcePlanetSurfaceGenerator } from './ice-planet-surface-generator';
import { IPlanetSurfaceGenerator } from './iplanet-surface-generator';
import { LavaSurfaceGenerator } from './lava-surface-generator';
import { RandomSurfaceGenerator } from './random-surface-generator';
import { RockyPlanetSurfaceGenerator } from './rocky-planet-surface-generator';

export class PlanetSurfaceGeneratorFactory {
  static create(type: PlanetType, _radius: number): IPlanetSurfaceGenerator {
    if (type === 'lava') {
      return new LavaSurfaceGenerator();
    }

    if (type === 'ice') {
      return new IcePlanetSurfaceGenerator();
    }

    if (type === 'rocky') {
      return new RockyPlanetSurfaceGenerator();
    }

    return new RandomSurfaceGenerator();
  }
}
