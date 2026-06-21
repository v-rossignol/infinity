import { IsNotEmpty, IsString } from 'class-validator';

export class SystemDataDto {
  @IsString()
  @IsNotEmpty()
  systemId: string;
}
