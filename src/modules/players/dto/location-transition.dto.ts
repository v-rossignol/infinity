import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Vec2LocalDto, Vec3LocalDto } from './local-position.dto';

export class EnterStarSystemDto extends Vec2LocalDto {
  @IsString()
  @IsNotEmpty()
  starSystemId: string;
}

export class EnterPlanetDto {
  @IsString()
  @IsNotEmpty()
  planetId: string;

  @IsOptional()
  @IsInt()
  q?: number;

  @IsOptional()
  @IsInt()
  r?: number;
}

export class UpdatePlanetHexDto {
  @IsInt()
  q: number;

  @IsInt()
  r: number;
}

export class LeavePlanetDto extends Vec2LocalDto {}

export class LeaveStarSystemDto extends Vec3LocalDto {}
