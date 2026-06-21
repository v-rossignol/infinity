import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  buildCubeLocation,
  buildPlanetLocation,
  buildStarSystemLocation,
} from '../../shared/utils/player-location';
import { PlayerLocationController } from './player-location.controller';
import { PlayerLocationService } from './player-location.service';
import { PlayersService } from './players.service';

describe('PlayerLocationController', () => {
  const userId = 'user-uuid';
  const playerId = 'player-uuid';
  const cubeId = 'cube-uuid';
  const starSystemId = 'star-uuid';
  const planetId = `${starSystemId}_planet_0`;

  const player = {
    id: playerId,
    userId,
    location: buildPlanetLocation({
      cubeId,
      starSystemId,
      planetId,
      hex_coords: { q: 2, r: 4 },
    }),
  };

  const mockPlayersService = {
    findByUserId: jest.fn(),
  };

  const mockPlayerLocationService = {
    transitionTo: jest.fn(),
    updateCubePosition: jest.fn(),
    updateStarSystemPosition: jest.fn(),
    updatePlanetHex: jest.fn(),
    setLocation: jest.fn(),
  };

  let controller: PlayerLocationController;

  const authReq = { user: { id: userId, username: 'pilot' } };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPlayersService.findByUserId.mockResolvedValue(player);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerLocationController],
      providers: [
        { provide: PlayersService, useValue: mockPlayersService },
        { provide: PlayerLocationService, useValue: mockPlayerLocationService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PlayerLocationController);
  });

  it('updateLocation replaces player location via setLocation', async () => {
    const location = buildPlanetLocation({
      cubeId,
      starSystemId,
      planetId,
      hex_coords: { q: 1, r: 2 },
    });
    const updated = { ...player, location };
    mockPlayerLocationService.setLocation.mockResolvedValue(updated);

    const result = await controller.updateLocation(authReq as never, { location });

    expect(mockPlayerLocationService.setLocation).toHaveBeenCalledWith(playerId, location);
    expect(result).toEqual({ player: updated });
  });

  it('leavePlanet transitions to star system depth', async () => {
    const updated = {
      ...player,
      location: buildStarSystemLocation({
        cubeId,
        starSystemId,
        position: { x: 50, y: 60 },
      }),
    };
    mockPlayerLocationService.transitionTo.mockResolvedValue(updated);

    const result = await controller.leavePlanet(authReq as never, { x: 50, y: 60 });

    expect(mockPlayerLocationService.transitionTo).toHaveBeenCalledWith(playerId, {
      type: 'leavePlanet',
      position: { x: 50, y: 60 },
    });
    expect(result).toEqual({ player: updated });
  });

  it('leaveStarSystem transitions to cube depth', async () => {
    const updated = {
      ...player,
      location: buildCubeLocation({ cubeId, position: { x: 1, y: 2, z: 3 } }),
    };
    mockPlayerLocationService.transitionTo.mockResolvedValue(updated);

    const result = await controller.leaveStarSystem(authReq as never, { x: 1, y: 2, z: 3 });

    expect(mockPlayerLocationService.transitionTo).toHaveBeenCalledWith(playerId, {
      type: 'leaveStarSystem',
      position: { x: 1, y: 2, z: 3 },
    });
    expect(result).toEqual({ player: updated });
  });

  it('enterStarSystem transitions from cube to system depth', async () => {
    const updated = {
      ...player,
      location: buildStarSystemLocation({
        cubeId,
        starSystemId,
        position: { x: 10, y: 20 },
      }),
    };
    mockPlayerLocationService.transitionTo.mockResolvedValue(updated);

    const result = await controller.enterStarSystem(authReq as never, {
      starSystemId,
      x: 10,
      y: 20,
    });

    expect(mockPlayerLocationService.transitionTo).toHaveBeenCalledWith(
      playerId,
      {
        type: 'enterStarSystem',
        starSystemId,
        position: { x: 10, y: 20 },
      },
      { adminBypass: false },
    );
    expect(result).toEqual({ player: updated });
  });

  it('enterStarSystem enables admin bypass for admin users', async () => {
    const updated = {
      ...player,
      location: buildStarSystemLocation({
        cubeId,
        starSystemId,
        position: { x: 10, y: 20 },
      }),
    };
    mockPlayerLocationService.transitionTo.mockResolvedValue(updated);

    const result = await controller.enterStarSystem(
      { user: { id: userId, username: 'admin', role: 'admin' } } as never,
      {
        starSystemId,
        x: 10,
        y: 20,
      },
    );

    expect(mockPlayerLocationService.transitionTo).toHaveBeenCalledWith(
      playerId,
      {
        type: 'enterStarSystem',
        starSystemId,
        position: { x: 10, y: 20 },
      },
      { adminBypass: true },
    );
    expect(result).toEqual({ player: updated });
  });

  it('enterPlanet transitions from system to planet depth', async () => {
    const updated = { ...player };
    mockPlayerLocationService.transitionTo.mockResolvedValue(updated);

    const result = await controller.enterPlanet(authReq as never, {
      planetId,
      q: 3,
      r: 4,
    });

    expect(mockPlayerLocationService.transitionTo).toHaveBeenCalledWith(
      playerId,
      {
        type: 'enterPlanet',
        planetId,
        hex_coords: { q: 3, r: 4 },
      },
      { adminBypass: false },
    );
    expect(result).toEqual({ player: updated });
  });

  it('enterPlanet without hex transitions to planet overview', async () => {
    const updated = {
      ...player,
      location: buildPlanetLocation({
        cubeId,
        starSystemId,
        planetId,
      }),
    };
    mockPlayerLocationService.transitionTo.mockResolvedValue(updated);

    const result = await controller.enterPlanet(authReq as never, {
      planetId,
    });

    expect(mockPlayerLocationService.transitionTo).toHaveBeenCalledWith(
      playerId,
      {
        type: 'enterPlanet',
        planetId,
        hex_coords: undefined,
      },
      { adminBypass: false },
    );
    expect(result).toEqual({ player: updated });
  });

  it('enterPlanet enables admin bypass for admin users', async () => {
    const updated = { ...player };
    mockPlayerLocationService.transitionTo.mockResolvedValue(updated);

    const result = await controller.enterPlanet(
      { user: { id: userId, username: 'admin', role: 'admin' } } as never,
      {
        planetId,
        q: 3,
        r: 4,
      },
    );

    expect(mockPlayerLocationService.transitionTo).toHaveBeenCalledWith(
      playerId,
      {
        type: 'enterPlanet',
        planetId,
        hex_coords: { q: 3, r: 4 },
      },
      { adminBypass: true },
    );
    expect(result).toEqual({ player: updated });
  });

  it('updateCubePosition patches cube coordinates', async () => {
    const updated = {
      ...player,
      location: buildCubeLocation({ cubeId, position: { x: 4, y: 5, z: 6 } }),
    };
    mockPlayerLocationService.updateCubePosition.mockResolvedValue(updated);

    const result = await controller.updateCubePosition(authReq as never, { x: 4, y: 5, z: 6 });

    expect(mockPlayerLocationService.updateCubePosition).toHaveBeenCalledWith(playerId, {
      x: 4,
      y: 5,
      z: 6,
    });
    expect(result).toEqual({ player: updated });
  });

  it('updateSystemPosition patches system map coordinates', async () => {
    const updated = {
      ...player,
      location: buildStarSystemLocation({
        cubeId,
        starSystemId,
        position: { x: 7, y: 8 },
      }),
    };
    mockPlayerLocationService.updateStarSystemPosition.mockResolvedValue(updated);

    const result = await controller.updateSystemPosition(authReq as never, { x: 7, y: 8 });

    expect(mockPlayerLocationService.updateStarSystemPosition).toHaveBeenCalledWith(playerId, {
      x: 7,
      y: 8,
    });
    expect(result).toEqual({ player: updated });
  });

  it('updatePlanetHex patches hex coordinates at planet depth', async () => {
    const updated = {
      ...player,
      location: buildPlanetLocation({
        cubeId,
        starSystemId,
        planetId,
        hex_coords: { q: 9, r: 8 },
      }),
    };
    mockPlayerLocationService.updatePlanetHex.mockResolvedValue(updated);

    const result = await controller.updatePlanetHex(authReq as never, { q: 9, r: 8 });

    expect(mockPlayerLocationService.updatePlanetHex).toHaveBeenCalledWith(playerId, {
      q: 9,
      r: 8,
    });
    expect(result).toEqual({ player: updated });
  });

  it('throws NotFoundException when player is missing', async () => {
    mockPlayersService.findByUserId.mockResolvedValue(null);

    await expect(
      controller.updateCubePosition(authReq as never, { x: 0, y: 0, z: 0 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
