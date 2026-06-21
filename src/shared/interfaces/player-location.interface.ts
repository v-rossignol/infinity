export interface Vec3Local {
  x: number;
  y: number;
  z: number;
}

export interface Vec2Local {
  x: number;
  y: number;
}

export interface HexCoords {
  q: number;
  r: number;
}

export interface CubeIdentity {
  id: string;
}

export interface CubeLocation extends CubeIdentity {
  position: Vec3Local;
}

export interface StarSystemIdentity {
  id: string;
}

export interface StarSystemLocation extends StarSystemIdentity {
  position: Vec2Local;
}

export interface PlanetIdentity {
  id: string;
}

export interface PlanetLocation extends PlanetIdentity {
  hex_coords?: HexCoords;
  position?: Vec2Local;
}

/** Player at Terra View — planet depth. */
export interface PlayerLocationOnPlanet {
  cube: CubeIdentity;
  starSystem: StarSystemIdentity;
  planet: PlanetLocation;
}

/** Player in Solaris — star-system depth. */
export interface PlayerLocationInStarSystem {
  cube: CubeIdentity;
  starSystem: StarSystemLocation;
}

/** Player in Galaxy View — cube depth. */
export interface PlayerLocationInCube {
  cube: CubeLocation;
}

export type Location = PlayerLocationInCube | PlayerLocationInStarSystem | PlayerLocationOnPlanet;

/** @deprecated Use Location — kept as alias for player presence. */
export type PlayerLocation = Location;

export type LocationSubject = 'player' | 'unit';

export interface LocationValidationOptions {
  subject: LocationSubject;
}

export type PlayerLocationDepth = 'cube' | 'starSystem' | 'planet';

export interface PlayerWithLocation {
  location?: PlayerLocation | null;
}

export interface EnterStarSystemTransition {
  type: 'enterStarSystem';
  starSystemId: string;
  position: Vec2Local;
}

export interface EnterPlanetTransition {
  type: 'enterPlanet';
  planetId: string;
  hex_coords?: HexCoords;
}

export interface LeavePlanetTransition {
  type: 'leavePlanet';
  position: Vec2Local;
}

export interface LeaveStarSystemTransition {
  type: 'leaveStarSystem';
  position: Vec3Local;
}

export type LocationTransition =
  | EnterStarSystemTransition
  | EnterPlanetTransition
  | LeavePlanetTransition
  | LeaveStarSystemTransition;
