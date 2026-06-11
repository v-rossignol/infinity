import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { CubeService } from '../galaxy/cube.service';
import { GalaxyService } from '../galaxy/galaxy.service';
import { StarService } from '../galaxy/star.service';
import { PlanetsService } from '../planets/planets.service';
import { GALAXY_EVENTS } from './events/galaxy.events';
import { PLANET_EVENTS } from './events/planet.events';
import { SocketGateway } from './socket.gateway';

describe('SocketGateway galaxy events', () => {
  let gateway: SocketGateway;

  const payload = {
    cube: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'kikyhk',
      origin: { x: 10, y: 10, z: 10 },
      star_ids: ['661e8400-e29b-41d4-a716-446655440001'],
    },
    stars: [
      {
        id: '661e8400-e29b-41d4-a716-446655440001',
        name: 'Alpha kikyhk',
        local_coords: { x: 1.0, y: 2.0, z: 3.0 },
        cube_id: '550e8400-e29b-41d4-a716-446655440000',
        properties: { type: 'yellow' as const },
      },
    ],
  };

  const star = payload.stars[0];

  const mockClient = {
    id: 'socket-1',
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
  } as unknown as Socket;

  const mockServer = {
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
  };

  const mockGalaxyService = { handlePlayerMove: jest.fn() };
  const mockPlanetsService = {
    joinPlanet: jest.fn(),
    handlePlayerMove: jest.fn(),
  };
  const mockCubeService = { getOrCreateByOrigin: jest.fn() };
  const mockStarService = { findById: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketGateway,
        { provide: GalaxyService, useValue: mockGalaxyService },
        { provide: PlanetsService, useValue: mockPlanetsService },
        { provide: CubeService, useValue: mockCubeService },
        { provide: StarService, useValue: mockStarService },
      ],
    }).compile();

    gateway = module.get(SocketGateway);
    gateway.server = mockServer as never;
  });

  it('REQUEST_CUBE resolves global position, joins cube room, and emits CUBE_DATA', async () => {
    mockCubeService.getOrCreateByOrigin.mockResolvedValue(payload);

    await gateway.handleRequestCube(mockClient, { x: 7, y: 8, z: 6 });

    expect(mockCubeService.getOrCreateByOrigin).toHaveBeenCalledWith({ x: 10, y: 10, z: 10 });
    expect(mockClient.join).toHaveBeenCalledWith('cube:550e8400-e29b-41d4-a716-446655440000');
    expect(mockClient.emit).toHaveBeenCalledWith(GALAXY_EVENTS.CUBE_DATA, payload);
  });

  it('REQUEST_CUBE emits GALAXY_ERROR for invalid position', async () => {
    await gateway.handleRequestCube(mockClient, { x: NaN, y: 8, z: 6 });

    expect(mockCubeService.getOrCreateByOrigin).not.toHaveBeenCalled();
    expect(mockClient.emit).toHaveBeenCalledWith(GALAXY_EVENTS.ERROR, {
      event: GALAXY_EVENTS.REQUEST_CUBE,
      message: 'Invalid global position',
      statusCode: 400,
    });
  });

  it('REQUEST_CUBE emits GALAXY_ERROR when cube service rejects origin', async () => {
    mockCubeService.getOrCreateByOrigin.mockRejectedValue(
      new BadRequestException('Origin must be grid-aligned'),
    );

    await gateway.handleRequestCube(mockClient, { x: 7, y: 8, z: 6 });

    expect(mockClient.emit).toHaveBeenCalledWith(GALAXY_EVENTS.ERROR, {
      event: GALAXY_EVENTS.REQUEST_CUBE,
      message: 'Origin must be grid-aligned',
      statusCode: 400,
    });
  });

  it('REQUEST_STAR emits STAR_DATA when star exists', async () => {
    mockStarService.findById.mockResolvedValue(star);

    await gateway.handleRequestStar(mockClient, { starId: star.id });

    expect(mockStarService.findById).toHaveBeenCalledWith(star.id);
    expect(mockClient.emit).toHaveBeenCalledWith(GALAXY_EVENTS.STAR_DATA, star);
  });

  it('REQUEST_STAR emits GALAXY_ERROR when star is missing', async () => {
    mockStarService.findById.mockResolvedValue(null);

    await gateway.handleRequestStar(mockClient, { starId: 'missing' });

    expect(mockClient.emit).toHaveBeenCalledWith(GALAXY_EVENTS.ERROR, {
      event: GALAXY_EVENTS.REQUEST_STAR,
      message: 'Star "missing" not found',
      statusCode: 404,
    });
  });

  it('GALAXY_MOVE remains separate from cube requests', () => {
    gateway.handleGalaxyMove(mockClient, { x: 120.5, y: -45.2, z: 10 });

    expect(mockGalaxyService.handlePlayerMove).toHaveBeenCalledWith('socket-1', {
      x: 120.5,
      y: -45.2,
      z: 10,
    });
    expect(mockServer.emit).toHaveBeenCalledWith(GALAXY_EVENTS.UPDATE, {
      playerId: 'socket-1',
      x: 120.5,
      y: -45.2,
      z: 10,
    });
    expect(mockCubeService.getOrCreateByOrigin).not.toHaveBeenCalled();
  });
});

describe('SocketGateway planet events', () => {
  let gateway: SocketGateway;

  const mockClient = {
    id: 'socket-1',
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
  } as unknown as Socket;

  const mockServer = {
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
  };

  const mockPlanetsService = {
    joinPlanet: jest.fn(),
    handlePlayerMove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketGateway,
        { provide: GalaxyService, useValue: { handlePlayerMove: jest.fn() } },
        { provide: PlanetsService, useValue: mockPlanetsService },
        { provide: CubeService, useValue: { getOrCreateByOrigin: jest.fn() } },
        { provide: StarService, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    gateway = module.get(SocketGateway);
    gateway.server = mockServer as never;
  });

  it('PLANET_JOIN joins room, resolves spawn, and broadcasts PLANET_UPDATE', async () => {
    mockPlanetsService.joinPlanet.mockResolvedValue({
      planetId: 'alpha-centauri_planet_0',
      q: 2,
      r: 3,
    });

    await gateway.handlePlanetJoin(mockClient, { planetId: 'alpha-centauri_planet_0' });

    expect(mockPlanetsService.joinPlanet).toHaveBeenCalledWith(
      'socket-1',
      'alpha-centauri_planet_0',
    );
    expect(mockClient.join).toHaveBeenCalledWith('alpha-centauri_planet_0');
    expect(mockServer.to).toHaveBeenCalledWith('alpha-centauri_planet_0');
    expect(mockServer.emit).toHaveBeenCalledWith(PLANET_EVENTS.UPDATE, {
      playerId: 'socket-1',
      planetId: 'alpha-centauri_planet_0',
      q: 2,
      r: 3,
    });
  });

  it('PLANET_LEAVE removes client from planet room', async () => {
    await gateway.handlePlanetLeave(mockClient, { planetId: 'alpha-centauri_planet_0' });

    expect(mockClient.leave).toHaveBeenCalledWith('alpha-centauri_planet_0');
  });

  it('PLANET_MOVE persists position and broadcasts PLANET_UPDATE with q/r', async () => {
    mockPlanetsService.handlePlayerMove.mockResolvedValue({
      planetId: 'alpha-centauri_planet_0',
      q: 4,
      r: 1,
    });

    await gateway.handlePlanetMove(mockClient, {
      planetId: 'alpha-centauri_planet_0',
      q: 4,
      r: 1,
    });

    expect(mockPlanetsService.handlePlayerMove).toHaveBeenCalledWith('socket-1', {
      planetId: 'alpha-centauri_planet_0',
      q: 4,
      r: 1,
    });
    expect(mockServer.to).toHaveBeenCalledWith('alpha-centauri_planet_0');
    expect(mockServer.emit).toHaveBeenCalledWith(PLANET_EVENTS.UPDATE, {
      playerId: 'socket-1',
      planetId: 'alpha-centauri_planet_0',
      q: 4,
      r: 1,
    });
  });
});

