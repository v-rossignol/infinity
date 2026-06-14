export interface PlanetHexPosition {
  q: number;
  r: number;
}

export interface PlanetMovePayload {
  planetId: string;
  q: number;
  r: number;
}

export interface PlanetJoinPayload {
  planetId: string;
}

export interface PlanetLeavePayload {
  planetId: string;
}

export interface PlanetPositionUpdate {
  playerId: string;
  planetId: string;
  q: number;
  r: number;
}
