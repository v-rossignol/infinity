import { IsUUID } from 'class-validator';

export class ListUnitsByOwnerQueryDto {
  @IsUUID()
  ownerId: string;
}
