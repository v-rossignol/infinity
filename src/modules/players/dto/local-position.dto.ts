import { IsNumber } from 'class-validator';

export class Vec3LocalDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  z: number;
}

export class Vec2LocalDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}
