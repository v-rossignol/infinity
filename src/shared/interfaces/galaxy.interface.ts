import { GAME_CONSTANTS } from '../constants/game.constants';

export type StarType = (typeof GAME_CONSTANTS.STAR_TYPES)[number];

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface StarProperties {
  type: StarType;
}

export interface CubeData {
  id: string;
  name: string;
  origin: Vec3;
  star_ids: string[];
}

export interface StarData {
  id: string;
  name: string;
  local_coords: Vec3;
  cube_id: string;
  properties: StarProperties;
}

export interface CubeWithStars {
  cube: CubeData;
  stars: StarData[];
}
