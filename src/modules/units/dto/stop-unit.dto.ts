import { IsString } from 'class-validator';

export class StopUnitDto {
  @IsString()
  planetId: string;
}
