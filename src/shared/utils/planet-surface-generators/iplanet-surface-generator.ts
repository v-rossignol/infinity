import { PlanetSurface, PlanetType } from '../../interfaces/planet.interface';

export interface GeneratePlanetSurfaceOptions {
  seed: string;
  radius: number;
  type: PlanetType;
}

export interface IPlanetSurfaceGenerator {
  generate(options: GeneratePlanetSurfaceOptions): PlanetSurface;
}
