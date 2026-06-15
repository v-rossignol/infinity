import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_LIST_PLANETS_PAGE = 1;
export const DEFAULT_LIST_PLANETS_COUNT = 20;
export const MAX_LIST_PLANETS_COUNT = 100;

export class ListPlanetsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIST_PLANETS_COUNT)
  count?: number;
}
