import { StarData } from '../interfaces/galaxy.interface';
import {
  NoRockyPlanetError,
  NoStarsInCubeError,
  pickLargestRockyPlanet,
  pickRandomStar,
  PlanetSummary,
} from './spawn-selection';

const star = (id: string): StarData => ({
  id,
  name: `Star ${id}`,
  local_coords: { x: 1, y: 2, z: 3 },
  cube_id: 'cube-1',
  properties: { type: 'yellow' },
});

const summary = (
  id: string,
  type: string,
  radius: number,
): PlanetSummary => ({
  id,
  name: id,
  x: 0,
  y: 0,
  radius,
  type,
  resources: { iron: 100 },
});

describe('spawn-selection', () => {
  describe('pickRandomStar', () => {
    const stars = [star('a'), star('b'), star('c')];

    it('returns a star at the index chosen by random', () => {
      expect(pickRandomStar(stars, () => 0)).toBe(stars[0]);
      expect(pickRandomStar(stars, () => 0.99)).toBe(stars[2]);
    });

    it('throws NoStarsInCubeError when stars array is empty', () => {
      expect(() => pickRandomStar([])).toThrow(NoStarsInCubeError);
    });
  });

  describe('pickLargestRockyPlanet', () => {
    it('returns the rocky planet with the largest radius', () => {
      const planets = [
        summary('p0', 'rocky', 7),
        summary('p1', 'gas', 15),
        summary('p2', 'rocky', 11),
        summary('p3', 'lava', 9),
      ];

      expect(pickLargestRockyPlanet(planets)).toEqual(planets[2]);
    });

    it('tie-breaks toward the first rocky planet in planets[] order', () => {
      const planets = [
        summary('p0', 'ice', 5),
        summary('p1', 'rocky', 9),
        summary('p2', 'rocky', 9),
      ];

      expect(pickLargestRockyPlanet(planets)).toEqual(planets[1]);
    });

    it('throws NoRockyPlanetError when no rocky planet exists', () => {
      const planets = [summary('p0', 'gas', 9), summary('p1', 'ice', 11)];

      expect(() => pickLargestRockyPlanet(planets)).toThrow(NoRockyPlanetError);
    });
  });
});
