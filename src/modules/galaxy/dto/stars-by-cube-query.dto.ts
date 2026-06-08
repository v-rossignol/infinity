import { IsUUID } from 'class-validator';

export class StarsByCubeQueryDto {
  @IsUUID()
  cube_id: string;
}
