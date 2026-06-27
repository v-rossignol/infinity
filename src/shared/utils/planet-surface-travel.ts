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
