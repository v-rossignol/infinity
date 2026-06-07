import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from './entities/player.entity';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
  ) {}

  async findByUserId(userId: string) {
    return this.playersRepository.findOneBy({ userId });
  }

  async createForUser(userId: string) {
    const player = this.playersRepository.create({ userId });
    return this.playersRepository.save(player);
  }

  async updatePosition(playerId: string, position: UpdatePositionDto) {
    const player = await this.playersRepository.findOneBy({ id: playerId });
    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }
    Object.assign(player, position);
    return this.playersRepository.save(player);
  }
}
