import { Location } from './player-location.interface';
import { UnitTypeDefinition } from './unit-type.interface';

export const UNIT_INSTANCE_STATUSES = ['inactive', 'active', 'destroyed'] as const;
export type UnitInstanceStatus = (typeof UNIT_INSTANCE_STATUSES)[number];

export const UNIT_PLACE_LEVELS = ['cube', 'starSystem', 'planet'] as const;
export type UnitPlaceLevel = (typeof UNIT_PLACE_LEVELS)[number];

export interface UnitInstanceWithType {
  id: string;
  typeId: string;
  ownerId: string;
  location: Location;
  status: UnitInstanceStatus;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  type: UnitTypeDefinition;
}

export interface UnitInstanceDenormalizedFields {
  placeLevel: UnitPlaceLevel;
  cubeId: string;
  starSystemId: string | null;
  planetId: string | null;
}
