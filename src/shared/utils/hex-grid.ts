import { HexCoords } from '../interfaces/player-location.interface';

/**
 * Returns the hex distance between two axial-coordinate hexes.
 * Uses the cube-coordinate equivalence: s = -q - r.
 */
export function hexDistance(a: HexCoords, b: HexCoords): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}
