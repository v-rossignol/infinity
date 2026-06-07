export interface PlayerPosition {
  galaxyX: number;
  galaxyY: number;
  galaxyZ: number;
  currentPlanetId?: string | null;
  planetX?: number;
  planetY?: number;
}

export interface PlayerState extends PlayerPosition {
  id: string;
  userId: string;
}
