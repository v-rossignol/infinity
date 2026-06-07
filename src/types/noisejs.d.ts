declare module 'noisejs' {
  export class Noise {
    seed(value: number): void;
    perlin2(x: number, y: number): number;
    perlin3(x: number, y: number, z: number): number;
  }
}
