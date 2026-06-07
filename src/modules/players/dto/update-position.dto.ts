import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdatePositionDto {
  @IsNumber()
  @IsOptional()
  galaxyX?: number;

  @IsNumber()
  @IsOptional()
  galaxyY?: number;

  @IsNumber()
  @IsOptional()
  galaxyZ?: number;

  @IsString()
  @IsOptional()
  currentPlanetId?: string;

  @IsNumber()
  @IsOptional()
  planetX?: number;

  @IsNumber()
  @IsOptional()
  planetY?: number;
}
