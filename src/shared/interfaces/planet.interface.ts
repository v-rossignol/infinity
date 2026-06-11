import { GAME_CONSTANTS } from '../constants/game.constants';

export type PlanetType = (typeof GAME_CONSTANTS.PLANET_TYPES)[number];
export type HexBiome = (typeof GAME_CONSTANTS.HEX_BIOMES)[number];
export type ResourceRarity = (typeof GAME_CONSTANTS.RESOURCE_RARITIES)[number];

export interface HexCoordinates {
  q: number;
  r: number;
}

export interface HexagonResource {
  type: string;
  abundance: number;
  rarity: ResourceRarity;
}

export interface Hexagon {
  biome: HexBiome;
  resources: HexagonResource[];
  dangerLevel: number;
  coordinates: HexCoordinates;
}

export interface PlanetSurface {
  hexagons: Hexagon[];
  generatedAt: Date;
}

export interface PlanetDocument {
  _id: string;
  name: string;
  starSystemId: string;
  type: PlanetType;
  radius: number;
  resources: Record<string, number>;
  surface: PlanetSurface;
}
