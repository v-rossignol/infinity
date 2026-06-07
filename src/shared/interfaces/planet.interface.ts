export interface PlanetData {
  id: string;
  name: string;
  starSystemId: string;
  seed: string;
  biomeTypes: string[];
  resources: Record<string, number>;
  heightMap: number[][];
  tileMap: string[][];
  visited: boolean;
}
