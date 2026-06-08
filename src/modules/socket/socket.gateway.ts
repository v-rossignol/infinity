import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { resolveCubeCenterFromGlobal } from '../../shared/utils/coordinates';
import { CubeService } from '../galaxy/cube.service';
import { GalaxyService } from '../galaxy/galaxy.service';
import { StarService } from '../galaxy/star.service';
import { PlanetsService } from '../planets/planets.service';
import { GALAXY_EVENTS, getCubeRoomName } from './events/galaxy.events';

@WebSocketGateway({ namespace: '/' })
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly galaxyService: GalaxyService,
    private readonly planetsService: PlanetsService,
    private readonly cubeService: CubeService,
    private readonly starService: StarService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(GALAXY_EVENTS.MOVE)
  handleGalaxyMove(client: Socket, payload: { x: number; y: number; z: number }) {
    this.galaxyService.handlePlayerMove(client.id, payload);
    this.server.emit(GALAXY_EVENTS.UPDATE, { playerId: client.id, ...payload });
  }

  @SubscribeMessage(GALAXY_EVENTS.REQUEST_CUBE)
  async handleRequestCube(client: Socket, payload: { x: number; y: number; z: number }) {
    try {
      if (!this.isValidPosition(payload)) {
        this.emitGalaxyError(client, GALAXY_EVENTS.REQUEST_CUBE, 'Invalid global position', 400);
        return;
      }

      const origin = resolveCubeCenterFromGlobal(payload);
      const cubeData = await this.cubeService.getOrCreateByOrigin(origin);
      await client.join(getCubeRoomName(cubeData.cube.id));
      client.emit(GALAXY_EVENTS.CUBE_DATA, cubeData);
    } catch (error) {
      this.handleGalaxyHandlerError(client, GALAXY_EVENTS.REQUEST_CUBE, error);
    }
  }

  @SubscribeMessage(GALAXY_EVENTS.REQUEST_STAR)
  async handleRequestStar(client: Socket, payload: { starId: string }) {
    try {
      if (!payload?.starId) {
        this.emitGalaxyError(client, GALAXY_EVENTS.REQUEST_STAR, 'starId is required', 400);
        return;
      }

      const star = await this.starService.findById(payload.starId);
      if (!star) {
        this.emitGalaxyError(
          client,
          GALAXY_EVENTS.REQUEST_STAR,
          `Star "${payload.starId}" not found`,
          404,
        );
        return;
      }

      client.emit(GALAXY_EVENTS.STAR_DATA, star);
    } catch (error) {
      this.handleGalaxyHandlerError(client, GALAXY_EVENTS.REQUEST_STAR, error);
    }
  }

  @SubscribeMessage('PLANET_MOVE')
  handlePlanetMove(client: Socket, payload: { planetId: string; x: number; y: number }) {
    this.planetsService.handlePlayerMove(client.id, payload);
    this.server.to(payload.planetId).emit('PLANET_UPDATE', { playerId: client.id, ...payload });
  }

  private isValidPosition(position: { x: number; y: number; z: number }): boolean {
    return [position?.x, position?.y, position?.z].every(
      (value) => typeof value === 'number' && Number.isFinite(value),
    );
  }

  private emitGalaxyError(
    client: Socket,
    event: string,
    message: string,
    statusCode: number,
  ): void {
    client.emit(GALAXY_EVENTS.ERROR, { event, message, statusCode });
  }

  private handleGalaxyHandlerError(client: Socket, event: string, error: unknown): void {
    if (error instanceof BadRequestException) {
      const message =
        typeof error.message === 'string' ? error.message : 'Bad Request';
      this.emitGalaxyError(client, event, message, 400);
      return;
    }

    if (error instanceof NotFoundException) {
      const message =
        typeof error.message === 'string' ? error.message : 'Not Found';
      this.emitGalaxyError(client, event, message, 404);
      return;
    }

    console.error(`Galaxy socket handler error (${event}):`, error);
    this.emitGalaxyError(client, event, 'Internal server error', 500);
  }
}
