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

/** Shortest hex distance on a toroidal grid (q wraps by `width`, r wraps by `height`). */
export function toroidalHexDistance(a: HexCoords, b: HexCoords, width: number, height: number): number {
  let min = Number.POSITIVE_INFINITY;
  const maxQWraps = Math.ceil(width / 2);
  const maxRWraps = Math.ceil(height / 2);

  for (let wq = -maxQWraps; wq <= maxQWraps; wq += 1) {
    for (let wr = -maxRWraps; wr <= maxRWraps; wr += 1) {
      min = Math.min(
        min,
        hexDistance(a, {
          q: b.q + wq * width,
          r: b.r + wr * height,
        }),
      );
    }
  }

  return min;
}
