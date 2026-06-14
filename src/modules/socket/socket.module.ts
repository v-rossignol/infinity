import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GalaxyModule } from '../galaxy/galaxy.module';
import { PlanetsModule } from '../planets/planets.module';
import { PlayersModule } from '../players/players.module';
import { SocketGateway } from './socket.gateway';
import { SocketPlayerAuthService } from './socket-player-auth.service';

@Module({
  imports: [AuthModule, GalaxyModule, PlanetsModule, PlayersModule],
  providers: [SocketGateway, SocketPlayerAuthService],
})
export class SocketModule {}
