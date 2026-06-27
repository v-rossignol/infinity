import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class TargetHexDto {
  @IsInt()
  q: number;

  @IsInt()
  r: number;
}

class TargetPositionDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  x: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y: number;
}

export class MoveUnitDto {
  @IsString()
  planetId: string;

  @ValidateNested()
  @Type(() => TargetHexDto)
  targetHex: TargetHexDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TargetPositionDto)
  targetPosition?: TargetPositionDto;
}
