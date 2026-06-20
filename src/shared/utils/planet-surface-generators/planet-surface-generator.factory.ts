import { PlanetType } from '../../interfaces/planet.interface';
import { IPlanetSurfaceGenerator } from './iplanet-surface-generator';
import { RandomSurfaceGenerator } from './random-surface-generator';

export class PlanetSurfaceGeneratorFactory {
  static create(_type: PlanetType, _radius: number): IPlanetSurfaceGenerator {
    return new RandomSurfaceGenerator();
  }
}
