import { GALAXY_CONSTANTS } from '../constants/galaxy.constants';
import { Vec3 } from '../interfaces/galaxy.interface';

const { CUBE_SIZE_LY, CUBE_HALF_LY } = GALAXY_CONSTANTS;

export const getMinCorner = (origin: Vec3): Vec3 => ({
  x: origin.x - CUBE_HALF_LY,
  y: origin.y - CUBE_HALF_LY,
  z: origin.z - CUBE_HALF_LY,
});

export const resolveCubeCenterFromGlobal = (global: Vec3): Vec3 => ({
  x: Math.floor((global.x + CUBE_HALF_LY) / CUBE_SIZE_LY) * CUBE_SIZE_LY,
  y: Math.floor((global.y + CUBE_HALF_LY) / CUBE_SIZE_LY) * CUBE_SIZE_LY,
  z: Math.floor((global.z + CUBE_HALF_LY) / CUBE_SIZE_LY) * CUBE_SIZE_LY,
});

export const localToGlobal = (origin: Vec3, local: Vec3): Vec3 => {
  const minCorner = getMinCorner(origin);
  return {
    x: minCorner.x + local.x,
    y: minCorner.y + local.y,
    z: minCorner.z + local.z,
  };
};

export const globalToLocal = (origin: Vec3, global: Vec3): Vec3 => {
  const minCorner = getMinCorner(origin);
  return {
    x: global.x - minCorner.x,
    y: global.y - minCorner.y,
    z: global.z - minCorner.z,
  };
};

export const isValidLocalCoords = (local: Vec3): boolean =>
  local.x >= 0 &&
  local.x < CUBE_SIZE_LY &&
  local.y >= 0 &&
  local.y < CUBE_SIZE_LY &&
  local.z >= 0 &&
  local.z < CUBE_SIZE_LY;

export const isGlobalInCube = (origin: Vec3, global: Vec3): boolean =>
  isValidLocalCoords(globalToLocal(origin, global));

export const formatOriginKey = (origin: Vec3): string => `${origin.x},${origin.y},${origin.z}`;
