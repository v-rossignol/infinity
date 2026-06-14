import { PlayerLocation } from './player-location.interface';

export interface PlayerState {
  id: string;
  userId: string;
  location: PlayerLocation | null;
}
