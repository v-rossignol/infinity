import { Injectable } from '@nestjs/common';

@Injectable()
export class GalaxyService {
  async handlePlayerMove(playerId: string, position: { x: number; y: number; z: number }) {
    console.log(`Player ${playerId} moved to (${position.x}, ${position.y}, ${position.z})`);
  }
}
