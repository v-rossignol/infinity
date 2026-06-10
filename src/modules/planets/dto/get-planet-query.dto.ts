import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetPlanetQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  systemId?: string;
}
