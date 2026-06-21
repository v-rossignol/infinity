import { PlanetSurface, PlanetType } from './planet.interface';

export interface PlanetPreview {
  _id: string;
  name: string;
  type: Exclude<PlanetType, 'gas'>;
  radius: number;
  surface: PlanetSurface;
}

/** @deprecated Use PlanetPreview */
export type AdminGeneratedPlanetPreview = PlanetPreview;
