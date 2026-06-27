import { GAME_CONSTANTS } from '../constants/game.constants';
import {
  computeMovementProgress,
  computeMovementWorldPosition,
  computePlanetSurfaceTravelDistance,
  computePlanetSurfaceTravelMs,
  getMaxIntraHexDistance,
  planetSurfaceToWorldPoint,
  worldPointToPlanetSurfacePoint,
} from './planet-surface-travel';

describe('planet-surface-travel', () => {
  it('calibrates max intra-hex distance to one hex unit', () => {
    const maxDistance = getMaxIntraHexDistance();
    const hexUnits = computePlanetSurfaceTravelDistance(
      { hex: { q: 0, r: 0 }, position: { x: 0, y: 0.25 } },
      { hex: { q: 0, r: 0 }, position: { x: 1, y: 0.75 } },
    );

    expect(hexUnits).toBeCloseTo(1, 5);
    expect(maxDistance).toBeGreaterThan(GAME_CONSTANTS.PLANET_HEX_LAYOUT_HEIGHT * 0.9);
  });

  it('returns zero distance for identical points', () => {
    const point = { hex: { q: 2, r: 3 }, position: { x: 0.4, y: 0.6 } };

    expect(computePlanetSurfaceTravelDistance(point, point)).toBe(0);
    expect(computePlanetSurfaceTravelMs(point, point, 1)).toBe(0);
  });

  it('computes travel time from distance, speed, and base constant', () => {
    const from = { hex: { q: 0, r: 0 }, position: { x: 0, y: 0.25 } };
    const to = { hex: { q: 0, r: 0 }, position: { x: 1, y: 0.75 } };

    expect(computePlanetSurfaceTravelMs(from, to, 1)).toBe(GAME_CONSTANTS.PLANET_BASE_MOVEMENT_MS_PER_HEX);
    expect(computePlanetSurfaceTravelMs(from, to, 2)).toBe(
      GAME_CONSTANTS.PLANET_BASE_MOVEMENT_MS_PER_HEX / 2,
    );
  });

  it('accounts for in-hex positions when hex coordinates match', () => {
    const from = { hex: { q: 1, r: 1 }, position: { x: 0.2, y: 0.5 } };
    const to = { hex: { q: 1, r: 1 }, position: { x: 0.8, y: 0.5 } };

    expect(computePlanetSurfaceTravelMs(from, to, 1)).toBeGreaterThan(0);
    expect(computePlanetSurfaceTravelMs(from, to, 1)).toBeLessThan(
      GAME_CONSTANTS.PLANET_BASE_MOVEMENT_MS_PER_HEX,
    );
  });

  it('computes movement progress from startAt and arrivalAt', () => {
    const startAt = '2026-01-01T00:00:00.000Z';
    const arrivalAt = '2026-01-01T00:10:00.000Z';
    const midpoint = Date.parse('2026-01-01T00:05:00.000Z');

    expect(computeMovementProgress(startAt, arrivalAt, Date.parse(startAt))).toBe(0);
    expect(computeMovementProgress(startAt, arrivalAt, midpoint)).toBe(0.5);
    expect(computeMovementProgress(startAt, arrivalAt, Date.parse(arrivalAt))).toBe(1);
  });

  it('interpolates between origin and destination in world space', () => {
    const origin = { hex: { q: 0, r: 0 }, position: { x: 0, y: 0 } };
    const destination = { hex: { q: 0, r: 0 }, position: { x: 1, y: 1 } };

    expect(computeMovementWorldPosition(origin, destination, 0.5)).toEqual(
      planetSurfaceToWorldPoint({ q: 0, r: 0 }, { x: 0.5, y: 0.5 }),
    );
  });

  it('maps a world point back to its containing hex', () => {
    const surface = { hex: { q: 2, r: 3 }, position: { x: 0.35, y: 0.72 } };
    const world = planetSurfaceToWorldPoint(surface.hex, surface.position);
    const mapped = worldPointToPlanetSurfacePoint(world);

    expect(mapped.hex).toEqual(surface.hex);
    expect(mapped.position.x).toBeCloseTo(surface.position.x);
    expect(mapped.position.y).toBeCloseTo(surface.position.y);
  });
});
