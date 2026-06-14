import {
  HexCoords,
  PlanetLocation,
  PlayerLocation,
  PlayerLocationDepth,
  PlayerLocationInCube,
  PlayerLocationInStarSystem,
  PlayerLocationOnPlanet,
  PlayerWithLocation,
  Vec2Local,
  Vec3Local,
} from '../interfaces/player-location.interface';
import { isValidLocalCoords } from './coordinates';

export class InvalidPlayerLocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPlayerLocationError';
  }
}

export function isFreshy(player: PlayerWithLocation): boolean {
  return player.location == null;
}

export function isPlayerLocationOnPlanet(
  location: PlayerLocation,
): location is PlayerLocationOnPlanet {
  return 'planet' in location && location.planet != null;
}

export function isPlayerLocationInStarSystem(
  location: PlayerLocation,
): location is PlayerLocationInStarSystem {
  return (
    !isPlayerLocationOnPlanet(location) &&
    'starSystem' in location &&
    location.starSystem != null &&
    'position' in location.starSystem
  );
}

export function isPlayerLocationInCube(location: PlayerLocation): location is PlayerLocationInCube {
  return (
    !isPlayerLocationOnPlanet(location) &&
    !isPlayerLocationInStarSystem(location) &&
    'cube' in location &&
    location.cube != null &&
    'position' in location.cube
  );
}

export function getLocationDepth(location: PlayerLocation): PlayerLocationDepth {
  assertValidLocation(location);

  if (isPlayerLocationOnPlanet(location)) {
    return 'planet';
  }
  if (isPlayerLocationInStarSystem(location)) {
    return 'starSystem';
  }
  return 'cube';
}

export function buildPlanetLocation(params: {
  cubeId: string;
  starSystemId: string;
  planetId: string;
  hex_coords: HexCoords;
}): PlayerLocationOnPlanet {
  const location: PlayerLocationOnPlanet = {
    cube: { id: params.cubeId },
    starSystem: { id: params.starSystemId },
    planet: {
      id: params.planetId,
      hex_coords: { q: params.hex_coords.q, r: params.hex_coords.r },
    },
  };
  assertValidLocation(location);
  return location;
}

export function buildStarSystemLocation(params: {
  cubeId: string;
  starSystemId: string;
  position: Vec2Local;
}): PlayerLocationInStarSystem {
  const location: PlayerLocationInStarSystem = {
    cube: { id: params.cubeId },
    starSystem: {
      id: params.starSystemId,
      position: { x: params.position.x, y: params.position.y },
    },
  };
  assertValidLocation(location);
  return location;
}

export function buildCubeLocation(params: {
  cubeId: string;
  position: Vec3Local;
}): PlayerLocationInCube {
  const location: PlayerLocationInCube = {
    cube: {
      id: params.cubeId,
      position: { x: params.position.x, y: params.position.y, z: params.position.z },
    },
  };
  assertValidLocation(location);
  return location;
}

export function assertValidLocation(location: unknown): asserts location is PlayerLocation {
  if (!isRecord(location)) {
    throw new InvalidPlayerLocationError('location must be an object');
  }

  if (!isRecord(location.cube) || !isNonEmptyString(location.cube.id)) {
    throw new InvalidPlayerLocationError('cube.id is required');
  }

  const hasPlanet = 'planet' in location && location.planet != null;
  const hasStarSystem = 'starSystem' in location && location.starSystem != null;
  const hasStarSystemPosition =
    hasStarSystem &&
    isRecord(location.starSystem) &&
    'position' in location.starSystem &&
    location.starSystem.position != null;
  const hasCubePosition =
    isRecord(location.cube) && 'position' in location.cube && location.cube.position != null;

  if (hasPlanet) {
    if (hasStarSystemPosition) {
      throw new InvalidPlayerLocationError(
        'location cannot combine planet with starSystem.position',
      );
    }
    assertPlanetDepth(location, hasCubePosition, hasStarSystem);
    return;
  }

  if (hasStarSystemPosition) {
    assertStarSystemDepth(location, hasCubePosition);
    return;
  }

  if (hasStarSystem) {
    throw new InvalidPlayerLocationError(
      'starSystem without planet must include starSystem.position',
    );
  }

  if (hasCubePosition) {
    assertCubeDepth(location);
    return;
  }

  throw new InvalidPlayerLocationError(
    'location must be at cube, starSystem, or planet depth with coordinates at the deepest level',
  );
}

function assertPlanetDepth(
  location: Record<string, unknown>,
  hasCubePosition: boolean,
  hasStarSystem: boolean,
): void {
  if (!hasStarSystem) {
    throw new InvalidPlayerLocationError('starSystem is required when planet is present');
  }

  if (hasCubePosition) {
    throw new InvalidPlayerLocationError('cube.position is not allowed at planet depth');
  }

  if (!isRecord(location.starSystem) || !isNonEmptyString(location.starSystem.id)) {
    throw new InvalidPlayerLocationError('starSystem.id is required at planet depth');
  }

  if ('position' in location.starSystem && location.starSystem.position != null) {
    throw new InvalidPlayerLocationError('starSystem.position is not allowed at planet depth');
  }

  if ('planet' in location && location.planet != null && !isRecord(location.planet)) {
    throw new InvalidPlayerLocationError('planet must be an object');
  }

  assertPlanetLocation(location.planet);
}

function assertStarSystemDepth(location: Record<string, unknown>, hasCubePosition: boolean): void {
  if ('planet' in location && location.planet != null) {
    throw new InvalidPlayerLocationError('planet is not allowed at starSystem depth');
  }

  if (hasCubePosition) {
    throw new InvalidPlayerLocationError('cube.position is not allowed at starSystem depth');
  }

  if (!isRecord(location.starSystem) || !isNonEmptyString(location.starSystem.id)) {
    throw new InvalidPlayerLocationError('starSystem.id is required at starSystem depth');
  }

  assertVec2(location.starSystem.position, 'starSystem.position');
}

function assertCubeDepth(location: Record<string, unknown>): void {
  if ('starSystem' in location && location.starSystem != null) {
    throw new InvalidPlayerLocationError('starSystem is not allowed at cube depth');
  }

  if ('planet' in location && location.planet != null) {
    throw new InvalidPlayerLocationError('planet is not allowed at cube depth');
  }

  assertCubeLocation(location.cube);
}

function assertPlanetLocation(planet: unknown): asserts planet is PlanetLocation {
  if (!isRecord(planet) || !isNonEmptyString(planet.id)) {
    throw new InvalidPlayerLocationError('planet.id is required');
  }

  if (!isRecord(planet.hex_coords)) {
    throw new InvalidPlayerLocationError('planet.hex_coords is required');
  }

  assertHexCoord(planet.hex_coords.q, 'planet.hex_coords.q');
  assertHexCoord(planet.hex_coords.r, 'planet.hex_coords.r');
}

function assertCubeLocation(cube: unknown): void {
  if (!isRecord(cube) || !isNonEmptyString(cube.id)) {
    throw new InvalidPlayerLocationError('cube.id is required');
  }

  if (!('position' in cube) || cube.position == null) {
    throw new InvalidPlayerLocationError('cube.position is required at cube depth');
  }

  assertVec3Local(cube.position, 'cube.position');
}

function assertVec3Local(value: unknown, field: string): asserts value is Vec3Local {
  if (!isRecord(value)) {
    throw new InvalidPlayerLocationError(`${field} must be an object`);
  }

  const x = value.x;
  const y = value.y;
  const z = value.z;
  assertFiniteNumber(x, `${field}.x`);
  assertFiniteNumber(y, `${field}.y`);
  assertFiniteNumber(z, `${field}.z`);

  const local: Vec3Local = { x, y, z };
  if (!isValidLocalCoords(local)) {
    throw new InvalidPlayerLocationError(
      `${field} must be local cube coordinates in [0, 10) on each axis`,
    );
  }
}

function assertVec2(value: unknown, field: string): asserts value is Vec2Local {
  if (!isRecord(value)) {
    throw new InvalidPlayerLocationError(`${field} must be an object`);
  }

  assertFiniteNumber(value.x, `${field}.x`);
  assertFiniteNumber(value.y, `${field}.y`);
}

function assertHexCoord(value: unknown, field: string): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new InvalidPlayerLocationError(`${field} must be a non-negative integer`);
  }
}

function assertFiniteNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new InvalidPlayerLocationError(`${field} must be a finite number`);
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
