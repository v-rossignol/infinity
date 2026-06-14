import { IsOptional, ValidateIf } from 'class-validator';
import { PlayerLocation } from '../../../shared/interfaces/player-location.interface';

export class UpdateLocationDto {
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  location?: PlayerLocation | null;
}
