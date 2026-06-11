import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GalaxyModule } from '../galaxy/galaxy.module';
import { PlanetsModule } from '../planets/planets.module';
import { Player } from './entities/player.entity';
import { PlayerSpawnService } from './player-spawn.service';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Player]), AuthModule, GalaxyModule, PlanetsModule],
  controllers: [PlayersController],
  providers: [PlayersService, PlayerSpawnService],
  exports: [PlayersService, PlayerSpawnService],
})
export class PlayersModule {}
