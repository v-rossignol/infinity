import { Vec3 } from '../../../src/shared/interfaces/galaxy.interface';

let sequence = 0;

export const nextGridOrigin = (): Vec3 => {
  sequence += 1;
  const value = (10_000 + sequence) * 10;
  return { x: value, y: value, z: value };
};

export const globalPositionInCube = (origin: Vec3): Vec3 => ({
  x: origin.x - 2,
  y: origin.y - 2,
  z: origin.z - 2,
});
