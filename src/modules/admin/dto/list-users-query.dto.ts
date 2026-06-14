import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_LIST_USERS_PAGE = 1;
export const DEFAULT_LIST_USERS_COUNT = 20;
export const MAX_LIST_USERS_COUNT = 100;

export class ListUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIST_USERS_COUNT)
  count?: number;
}
