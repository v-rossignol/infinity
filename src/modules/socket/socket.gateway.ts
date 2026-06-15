import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
import { PLANET_EVENTS } from './events/planet.events';
import { SYSTEM_EVENTS } from './events/system.events';
import { SocketPlayerAuthService } from './socket-player-auth.service';

@WebSocketGateway({ namespace: '/' })
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly galaxyService: GalaxyService,
    private readonly planetsService: PlanetsService,
    private readonly cubeService: CubeService,
    private readonly starService: StarService,
    private readonly socketPlayerAuthService: SocketPlayerAuthService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      await this.socketPlayerAuthService.attachPlayer(client);
    } catch {
      // Anonymous connections remain allowed for read-only galaxy requests.
    }
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(GALAXY_EVENTS.MOVE)
  async handleGalaxyMove(client: Socket, payload: { x: number; y: number; z: number }) {
    try {
      if (!this.isValidPosition(payload)) {
        this.emitGalaxyError(
          client,
          GALAXY_EVENTS.MOVE,
          'x, y, and z are required numeric fields',
          400,
        );
        return;
      }

      const playerId = await this.resolvePlayerId(client);
      await this.galaxyService.handlePlayerMove(playerId, payload);
      this.server.emit(GALAXY_EVENTS.UPDATE, { playerId, ...payload });
    } catch (error) {
      this.handleGalaxyHandlerError(client, GALAXY_EVENTS.MOVE, error);
    }
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

  @SubscribeMessage(PLANET_EVENTS.JOIN)
  async handlePlanetJoin(client: Socket, payload: { planetId: string }) {
    try {
      if (!payload?.planetId) {
        this.emitPlanetError(client, PLANET_EVENTS.JOIN, 'planetId is required', 400);
        return;
      }

      const playerId = await this.resolvePlayerId(client);
      const position = await this.planetsService.joinPlanet(playerId, payload.planetId);
      await client.join(payload.planetId);
      this.server.to(payload.planetId).emit(PLANET_EVENTS.UPDATE, {
        playerId,
        ...position,
      });
    } catch (error) {
      this.handlePlanetHandlerError(client, PLANET_EVENTS.JOIN, error);
    }
  }

  @SubscribeMessage(PLANET_EVENTS.LEAVE)
  async handlePlanetLeave(client: Socket, payload: { planetId: string }) {
    if (!payload?.planetId) {
      this.emitPlanetError(client, PLANET_EVENTS.LEAVE, 'planetId is required', 400);
      return;
    }

    await client.leave(payload.planetId);
  }

  @SubscribeMessage(PLANET_EVENTS.MOVE)
  async handlePlanetMove(client: Socket, payload: { planetId: string; q: number; r: number }) {
    try {
      if (
        !payload?.planetId ||
        !this.isValidHexCoord(payload.q) ||
        !this.isValidHexCoord(payload.r)
      ) {
        this.emitPlanetError(
          client,
          PLANET_EVENTS.MOVE,
          'planetId, q, and r are required numeric fields',
          400,
        );
        return;
      }

      const playerId = await this.resolvePlayerId(client);
      const position = await this.planetsService.handlePlayerMove(playerId, payload);
      this.server.to(payload.planetId).emit(PLANET_EVENTS.UPDATE, {
        playerId,
        ...position,
      });
    } catch (error) {
      this.handlePlanetHandlerError(client, PLANET_EVENTS.MOVE, error);
    }
  }

  @SubscribeMessage(SYSTEM_EVENTS.MOVE)
  async handleSystemMove(client: Socket, payload: { x: number; y: number }) {
    try {
      if (!this.isValidSystemPosition(payload)) {
        this.emitSystemError(
          client,
          SYSTEM_EVENTS.MOVE,
          'x and y are required numeric fields',
          400,
        );
        return;
      }

      const playerId = await this.resolvePlayerId(client);
      await this.galaxyService.handleSystemMove(playerId, payload);
      this.server.emit(SYSTEM_EVENTS.UPDATE, { playerId, ...payload });
    } catch (error) {
      this.handleSystemHandlerError(client, SYSTEM_EVENTS.MOVE, error);
    }
  }

  private async resolvePlayerId(client: Socket): Promise<string> {
    await this.socketPlayerAuthService.attachPlayer(client);
    return this.socketPlayerAuthService.getPlayerId(client);
  }

  private isValidPosition(position: { x: number; y: number; z: number }): boolean {
    return [position?.x, position?.y, position?.z].every(
      (value) => typeof value === 'number' && Number.isFinite(value),
    );
  }

  private isValidHexCoord(value: number): boolean {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private isValidSystemPosition(position: { x: number; y: number }): boolean {
    return [position?.x, position?.y].every(
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

  private emitPlanetError(
    client: Socket,
    event: string,
    message: string,
    statusCode: number,
  ): void {
    client.emit(PLANET_EVENTS.ERROR, { event, message, statusCode });
  }

  private emitSystemError(
    client: Socket,
    event: string,
    message: string,
    statusCode: number,
  ): void {
    client.emit(SYSTEM_EVENTS.ERROR, { event, message, statusCode });
  }

  private handleGalaxyHandlerError(client: Socket, event: string, error: unknown): void {
    if (error instanceof UnauthorizedException) {
      const message = typeof error.message === 'string' ? error.message : 'Unauthorized';
      this.emitGalaxyError(client, event, message, 401);
      return;
    }

    if (error instanceof ConflictException) {
      const message = typeof error.message === 'string' ? error.message : 'Conflict';
      this.emitGalaxyError(client, event, message, 409);
      return;
    }

    if (error instanceof BadRequestException) {
      const message = typeof error.message === 'string' ? error.message : 'Bad Request';
      this.emitGalaxyError(client, event, message, 400);
      return;
    }

    if (error instanceof NotFoundException) {
      const message = typeof error.message === 'string' ? error.message : 'Not Found';
      this.emitGalaxyError(client, event, message, 404);
      return;
    }

    console.error(`Galaxy socket handler error (${event}):`, error);
    this.emitGalaxyError(client, event, 'Internal server error', 500);
  }

  private handlePlanetHandlerError(client: Socket, event: string, error: unknown): void {
    if (error instanceof UnauthorizedException) {
      const message = typeof error.message === 'string' ? error.message : 'Unauthorized';
      this.emitPlanetError(client, event, message, 401);
      return;
    }

    if (error instanceof ConflictException) {
      const message = typeof error.message === 'string' ? error.message : 'Conflict';
      this.emitPlanetError(client, event, message, 409);
      return;
    }

    if (error instanceof BadRequestException) {
      const message = typeof error.message === 'string' ? error.message : 'Bad Request';
      this.emitPlanetError(client, event, message, 400);
      return;
    }

    if (error instanceof NotFoundException) {
      const message = typeof error.message === 'string' ? error.message : 'Not Found';
      this.emitPlanetError(client, event, message, 404);
      return;
    }

    console.error(`Planet socket handler error (${event}):`, error);
    this.emitPlanetError(client, event, 'Internal server error', 500);
  }

  private handleSystemHandlerError(client: Socket, event: string, error: unknown): void {
    if (error instanceof UnauthorizedException) {
      const message = typeof error.message === 'string' ? error.message : 'Unauthorized';
      this.emitSystemError(client, event, message, 401);
      return;
    }

    if (error instanceof ConflictException) {
      const message = typeof error.message === 'string' ? error.message : 'Conflict';
      this.emitSystemError(client, event, message, 409);
      return;
    }

    if (error instanceof BadRequestException) {
      const message = typeof error.message === 'string' ? error.message : 'Bad Request';
      this.emitSystemError(client, event, message, 400);
      return;
    }

    if (error instanceof NotFoundException) {
      const message = typeof error.message === 'string' ? error.message : 'Not Found';
      this.emitSystemError(client, event, message, 404);
      return;
    }

    console.error(`System socket handler error (${event}):`, error);
    this.emitSystemError(client, event, 'Internal server error', 500);
  }
}
