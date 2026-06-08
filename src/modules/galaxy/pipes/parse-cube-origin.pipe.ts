import { BadRequestException } from '@nestjs/common';
import { Vec3 } from '../../../shared/interfaces/galaxy.interface';

export const parseCubeOrigin = (x: string, y: string, z: string): Vec3 => {
  const origin = {
    x: Number(x),
    y: Number(y),
    z: Number(z),
  };

  if (![origin.x, origin.y, origin.z].every(Number.isFinite)) {
    throw new BadRequestException('Cube coordinates must be valid numbers');
  }

  return origin;
};
