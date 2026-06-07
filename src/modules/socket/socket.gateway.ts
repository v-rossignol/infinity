import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GalaxyService } from '../galaxy/galaxy.service';
import { PlanetsService } from '../planets/planets.service';

@WebSocketGateway({ namespace: '/' })
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly galaxyService: GalaxyService,
    private readonly planetsService: PlanetsService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('GALAXY_MOVE')
  handleGalaxyMove(client: Socket, payload: { x: number; y: number; z: number }) {
    this.galaxyService.handlePlayerMove(client.id, payload);
    this.server.emit('GALAXY_UPDATE', { playerId: client.id, ...payload });
  }

  @SubscribeMessage('PLANET_MOVE')
  handlePlanetMove(client: Socket, payload: { planetId: string; x: number; y: number }) {
    this.planetsService.handlePlayerMove(client.id, payload);
    this.server.to(payload.planetId).emit('PLANET_UPDATE', { playerId: client.id, ...payload });
  }
}
