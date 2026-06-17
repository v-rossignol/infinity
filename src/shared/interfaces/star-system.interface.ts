export interface SystemPlanet {
  id: string;
  name: string;
  distanceFromStar: number;
  radius: number;
  type: string;
  resources: Record<string, number>;
}

export interface StarSystemData {
  id: string;
  name: string;
  planets: SystemPlanet[];
  visited: boolean;
}
