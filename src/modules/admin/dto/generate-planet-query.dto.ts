import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { GAME_CONSTANTS } from '../../../shared/constants/game.constants';
import { PlanetType } from '../../../shared/interfaces/planet.interface';

export const DEFAULT_GENERATE_PLANET_RADIUS = 10;
export const DEFAULT_GENERATE_PLANET_TYPE = 'rocky' satisfies Exclude<PlanetType, 'gas'>;

export const ENTERABLE_PLANET_TYPES = GAME_CONSTANTS.PLANET_TYPES.filter(
  (type) => type !== 'gas',
) as Exclude<PlanetType, 'gas'>[];

export class GeneratePlanetQueryDto {
  @IsOptional()
  @IsString()
  seed?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(GAME_CONSTANTS.PLANET_RADIUS_MIN)
  @Max(GAME_CONSTANTS.PLANET_RADIUS_MAX)
  radius?: number;

  @IsOptional()
  @IsIn(ENTERABLE_PLANET_TYPES)
  type?: Exclude<PlanetType, 'gas'>;
}
