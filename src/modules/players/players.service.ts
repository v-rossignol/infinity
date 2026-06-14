import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from './entities/player.entity';
import { PlayerLocationService } from './player-location.service';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    private readonly playerLocationService: PlayerLocationService,
  ) {}

  async findByUserId(userId: string) {
    return this.playersRepository.findOneBy({ userId });
  }

  async createForUser(userId: string) {
    const player = this.playersRepository.create({ userId, location: null });
    return this.playersRepository.save(player);
  }

  async setLocation(playerId: string, location: Player['location']) {
    return this.playerLocationService.setLocation(playerId, location);
  }
}
