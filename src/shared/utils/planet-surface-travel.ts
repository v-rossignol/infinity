import { GAME_CONSTANTS } from '../constants/game.constants';
import { HexCoords, Vec2Local } from '../interfaces/player-location.interface';

/** Pointy-top hex vertices as fractions of cell width/height (terra-view hexLocalPosition). */
const HEX_VERTEX_FRACTIONS: ReadonlyArray<Vec2Local> = [
  { x: 0.5, y: 0 },
  { x: 1, y: 0.25 },
  { x: 1, y: 0.75 },
  { x: 0.5, y: 1 },
  { x: 0, y: 0.75 },
  { x: 0, y: 0.25 },
];

export interface PlanetSurfacePoint {
  hex: HexCoords;
  position: Vec2Local;
}

function hexVerticalStep(hexHeight: number): number {
  return hexHeight * 0.75;
}

function axialToSurfacePoint(q: number, r: number): Vec2Local {
  const hexWidth = GAME_CONSTANTS.PLANET_HEX_LAYOUT_WIDTH;
  const hexHeight = GAME_CONSTANTS.PLANET_HEX_LAYOUT_HEIGHT;

  return {
    x: q * hexWidth + (r % 2) * (hexWidth / 2),
    y: r * hexVerticalStep(hexHeight),
  };
}

/** Maps a planet hex + in-hex position to continuous surface coordinates. */
export function planetSurfaceToWorldPoint(hex: HexCoords, position: Vec2Local): Vec2Local {
  const origin = axialToSurfacePoint(hex.q, hex.r);
  return {
    x: origin.x + position.x * GAME_CONSTANTS.PLANET_HEX_LAYOUT_WIDTH,
    y: origin.y + position.y * GAME_CONSTANTS.PLANET_HEX_LAYOUT_HEIGHT,
  };
}

function maxPairDistance(points: ReadonlyArray<Vec2Local>): number {
  let maxDistance = 0;

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      maxDistance = Math.max(maxDistance, Math.hypot(dx, dy));
    }
  }

  return maxDistance;
}

/** Longest vertex-to-vertex distance inside one hex (1.0 hex unit at speed calibration). */
export function getMaxIntraHexDistance(): number {
  const hexWidth = GAME_CONSTANTS.PLANET_HEX_LAYOUT_WIDTH;
  const hexHeight = GAME_CONSTANTS.PLANET_HEX_LAYOUT_HEIGHT;
  const vertices = HEX_VERTEX_FRACTIONS.map((vertex) => ({
    x: vertex.x * hexWidth,
    y: vertex.y * hexHeight,
  }));

  return maxPairDistance(vertices);
}

/** Returns travel distance in hex units (1 = largest distance within a single hex). */
export function computePlanetSurfaceTravelDistance(from: PlanetSurfacePoint, to: PlanetSurfacePoint): number {
  const fromWorld = planetSurfaceToWorldPoint(from.hex, from.position);
  const toWorld = planetSurfaceToWorldPoint(to.hex, to.position);
  const worldDistance = Math.hypot(toWorld.x - fromWorld.x, toWorld.y - fromWorld.y);

  return worldDistance / getMaxIntraHexDistance();
}

export function computePlanetSurfaceTravelMs(from: PlanetSurfacePoint, to: PlanetSurfacePoint, speed: number): number {
  const effectiveSpeed = speed > 0 ? speed : 1;
  const distanceHexUnits = computePlanetSurfaceTravelDistance(from, to);

  return Math.round((distanceHexUnits / effectiveSpeed) * GAME_CONSTANTS.PLANET_BASE_MOVEMENT_MS_PER_HEX);
}

function isPointInPolygon(x: number, y: number, polygon: ReadonlyArray<Vec2Local>): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function isHexLocalPointInside(position: Vec2Local): boolean {
  return isPointInPolygon(position.x, position.y, HEX_VERTEX_FRACTIONS);
}

function hexLocalFromWorldOffset(worldPoint: Vec2Local, hex: HexCoords): Vec2Local {
  const origin = axialToSurfacePoint(hex.q, hex.r);

  return {
    x: (worldPoint.x - origin.x) / GAME_CONSTANTS.PLANET_HEX_LAYOUT_WIDTH,
    y: (worldPoint.y - origin.y) / GAME_CONSTANTS.PLANET_HEX_LAYOUT_HEIGHT,
  };
}

function distanceToHexCenter(worldPoint: Vec2Local, hex: HexCoords): number {
  const origin = axialToSurfacePoint(hex.q, hex.r);
  const centerX = origin.x + GAME_CONSTANTS.PLANET_HEX_LAYOUT_WIDTH / 2;
  const centerY = origin.y + GAME_CONSTANTS.PLANET_HEX_LAYOUT_HEIGHT / 2;

  return Math.hypot(worldPoint.x - centerX, worldPoint.y - centerY);
}

export function computeMovementProgress(startAt: string, arrivalAt: string, nowMs: number): number {
  const startMs = Date.parse(startAt);
  const arrivalMs = Date.parse(arrivalAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(arrivalMs) || arrivalMs <= startMs) {
    return 1;
  }

  return Math.min(1, Math.max(0, (nowMs - startMs) / (arrivalMs - startMs)));
}

export function computeMovementWorldPosition(
  origin: PlanetSurfacePoint,
  destination: PlanetSurfacePoint,
  progress: number,
): Vec2Local {
  const from = planetSurfaceToWorldPoint(origin.hex, origin.position);
  const to = planetSurfaceToWorldPoint(destination.hex, destination.position);

  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}

/** Maps a continuous surface world point to the containing hex and in-hex position. */
export function worldPointToPlanetSurfacePoint(worldPoint: Vec2Local): PlanetSurfacePoint {
  const hexHeight = GAME_CONSTANTS.PLANET_HEX_LAYOUT_HEIGHT;
  const hexWidth = GAME_CONSTANTS.PLANET_HEX_LAYOUT_WIDTH;
  const verticalStep = hexVerticalStep(hexHeight);
  const rGuess = Math.round(worldPoint.y / verticalStep);
  const qGuess = Math.round((worldPoint.x - (rGuess % 2) * (hexWidth / 2)) / hexWidth);

  for (let r = rGuess - 1; r <= rGuess + 1; r += 1) {
    for (let q = qGuess - 1; q <= qGuess + 1; q += 1) {
      const position = hexLocalFromWorldOffset(worldPoint, { q, r });
      if (isHexLocalPointInside(position)) {
        return { hex: { q, r }, position };
      }
    }
  }

  let bestHex: HexCoords = { q: qGuess, r: rGuess };
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let r = rGuess - 1; r <= rGuess + 1; r += 1) {
    for (let q = qGuess - 1; q <= qGuess + 1; q += 1) {
      const distance = distanceToHexCenter(worldPoint, { q, r });
      if (distance < bestDistance) {
        bestDistance = distance;
        bestHex = { q, r };
      }
    }
  }

  const position = hexLocalFromWorldOffset(worldPoint, bestHex);

  return {
    hex: bestHex,
    position: {
      x: Math.min(1, Math.max(0, position.x)),
      y: Math.min(1, Math.max(0, position.y)),
    },
  };
}

export function computeMovingUnitSurfacePointAtTime(
  origin: PlanetSurfacePoint,
  destination: PlanetSurfacePoint,
  startedAt: string,
  arrivalAt: string,
  nowMs: number = Date.now(),
): PlanetSurfacePoint {
  const progress = computeMovementProgress(startedAt, arrivalAt, nowMs);
  const worldPoint = computeMovementWorldPosition(origin, destination, progress);

  return worldPointToPlanetSurfacePoint(worldPoint);
}
