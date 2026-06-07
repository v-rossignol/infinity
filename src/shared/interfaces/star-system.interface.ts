export interface Star {
  id: string;
  type: string;
  x: number;
  y: number;
  mass: number;
  temperature: number;
}

export interface SystemPlanet {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  type: string;
  resources: Record<string, number>;
}

export interface StarSystemData {
  id: string;
  name: string;
  stars: Star[];
  planets: SystemPlanet[];
  visited: boolean;
}
