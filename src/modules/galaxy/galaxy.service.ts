import { Injectable } from '@nestjs/common';
import { Vec2Local, Vec3Local } from '../../shared/interfaces/player-location.interface';
import { Player } from '../players/entities/player.entity';
import { PlayerLocationService } from '../players/player-location.service';

@Injectable()
export class GalaxyService {
  constructor(private readonly playerLocationService: PlayerLocationService) {}

  async handlePlayerMove(playerId: string, position: Vec3Local): Promise<Player> {
    return this.playerLocationService.updateCubePosition(playerId, position);
  }

  async handleSystemMove(playerId: string, position: Vec2Local): Promise<Player> {
    return this.playerLocationService.updateStarSystemPosition(playerId, position);
  }
}
