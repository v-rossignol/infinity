import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GalaxyModule } from '../galaxy/galaxy.module';
import { SystemsModule } from '../systems/systems.module';
import { PlanetsModule } from '../planets/planets.module';
import { Player } from './entities/player.entity';
import { PlayerCanEnterController } from './player-can-enter.controller';
import { PlayerLocationController } from './player-location.controller';
import { PlayerLocationService } from './player-location.service';
import { PlayerSpawnService } from './player-spawn.service';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Player]),
    AuthModule,
    forwardRef(() => GalaxyModule),
    SystemsModule,
    forwardRef(() => PlanetsModule),
  ],
  controllers: [PlayersController, PlayerLocationController, PlayerCanEnterController],
  providers: [PlayersService, PlayerLocationService, PlayerSpawnService],
  exports: [PlayersService, PlayerLocationService, PlayerSpawnService],
})
export class PlayersModule {}
