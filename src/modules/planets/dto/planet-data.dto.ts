import { IsNotEmpty, IsString } from 'class-validator';

export class PlanetDataDto {
  @IsString()
  @IsNotEmpty()
  planetId: string;
}
