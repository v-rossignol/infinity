import { BadRequestException } from '@nestjs/common';
import { parseCubeOrigin } from './parse-cube-origin.pipe';

describe('parseCubeOrigin', () => {
  it('parses numeric strings into a Vec3', () => {
    expect(parseCubeOrigin('10', '-10', '0')).toEqual({ x: 10, y: -10, z: 0 });
  });

  it('throws for invalid coordinates', () => {
    expect(() => parseCubeOrigin('bad', '10', '10')).toThrow(BadRequestException);
  });
});
