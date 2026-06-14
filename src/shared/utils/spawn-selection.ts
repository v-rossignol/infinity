import { StarData } from '../interfaces/galaxy.interface';

export class NoStarsInCubeError extends Error {
  constructor() {
    super('No stars in spawn cube');
    this.name = 'NoStarsInCubeError';
  }
}

export class NoRockyPlanetError extends Error {
  constructor() {
    super('No rocky planet in star system');
    this.name = 'NoRockyPlanetError';
  }
}

export type PlanetSummary = {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  type: string;
  resources: Record<string, number>;
};

export const pickRandomStar = (stars: StarData[], random: () => number = Math.random): StarData => {
  if (stars.length === 0) {
    throw new NoStarsInCubeError();
  }

  const index = Math.floor(random() * stars.length);
  return stars[index];
};

export const pickLargestRockyPlanet = (planets: PlanetSummary[]): PlanetSummary => {
  const rocky = planets.filter((planet) => planet.type === 'rocky');
  if (rocky.length === 0) {
    throw new NoRockyPlanetError();
  }

  return rocky.reduce((best, current) => (current.radius > best.radius ? current : best));
};
