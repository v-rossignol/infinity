import { Module } from '@nestjs/common';
import { GalaxyModule } from '../galaxy/galaxy.module';
import { PlanetsModule } from '../planets/planets.module';
import { SocketGateway } from './socket.gateway';

@Module({
  imports: [GalaxyModule, PlanetsModule],
  providers: [SocketGateway],
})
export class SocketModule {}
