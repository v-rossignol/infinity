import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  buildCubeLocation,
  buildPlanetLocation,
  buildStarSystemLocation,
} from '../../shared/utils/player-location';
import { Player } from './entities/player.entity';
import { PlayerLocationService } from './player-location.service';
import { StarService } from '../galaxy/star.service';
import { StarSystemService } from '../galaxy/star-system.service';
import { PlanetsService } from '../planets/planets.service';

describe('PlayerLocationService', () => {
  const playerId = 'player-uuid';
  const cubeId = 'cube-uuid';
  const starSystemId = 'star-uuid';
  const planetId = `${starSystemId}_planet_0`;

  const cubeDepth = buildCubeLocation({
    cubeId,
    position: { x: 2.1, y: 3.4, z: 5.6 },
  });

  const starSystemDepth = buildStarSystemLocation({
    cubeId,
    starSystemId,
    position: { x: 145.2, y: 34.8 },
  });

  const planetDepth = buildPlanetLocation({
    cubeId,
    starSystemId,
    planetId,
    hex_coords: { q: 4, r: 7 },
  });

  let service: PlayerLocationService;
  let repository: { findOneBy: jest.Mock; save: jest.Mock };
  let starService: { findById: jest.Mock };
  let starSystemService: { getStarSystem: jest.Mock };
  let planetsService: { getPlanet: jest.Mock };

  const savePlayer = (location: Player['location']): Player =>
    ({
      id: playerId,
      userId: 'user-uuid',
      location,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as Player;

  beforeEach(async () => {
    repository = {
      findOneBy: jest.fn(),
      save: jest.fn(async (player) => player),
    };
    starService = {
      findById: jest.fn(),
    };
    starSystemService = {
      getStarSystem: jest.fn(),
    };
    planetsService = {
      getPlanet: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerLocationService,
        { provide: getRepositoryToken(Player), useValue: repository },
        { provide: StarService, useValue: starService },
        { provide: StarSystemService, useValue: starSystemService },
        { provide: PlanetsService, useValue: planetsService },
      ],
    }).compile();

    service = module.get(PlayerLocationService);
  });

  it('getLocation returns null for a freshy', async () => {
    repository.findOneBy.mockResolvedValue(savePlayer(null));

    await expect(service.getLocation(playerId)).resolves.toBeNull();
  });

  describe('canEnter', () => {
    it('canEnterCube returns true for admin regardless of location', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(null));

      await expect(service.canEnterCube(playerId, cubeId, { isAdmin: true })).resolves.toBe(true);
      expect(repository.findOneBy).not.toHaveBeenCalled();
    });

    it('canEnterCube returns true when player is in the target cube', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(planetDepth));

      await expect(service.canEnterCube(playerId, cubeId)).resolves.toBe(true);
    });

    it('canEnterCube returns false when player is in another cube', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(planetDepth));

      await expect(service.canEnterCube(playerId, 'other-cube')).resolves.toBe(false);
    });

    it('canEnterCube returns false for freshy players', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(null));

      await expect(service.canEnterCube(playerId, cubeId)).resolves.toBe(false);
    });

    it('canEnterStarSystem returns true for admin regardless of location', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(cubeDepth));

      await expect(
        service.canEnterStarSystem(playerId, starSystemId, { isAdmin: true }),
      ).resolves.toBe(true);
      expect(repository.findOneBy).not.toHaveBeenCalled();
    });

    it('canEnterStarSystem returns true when player is in the target system', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(starSystemDepth));

      await expect(service.canEnterStarSystem(playerId, starSystemId)).resolves.toBe(true);
    });

    it('canEnterStarSystem returns true when player is on a planet in the target system', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(planetDepth));

      await expect(service.canEnterStarSystem(playerId, starSystemId)).resolves.toBe(true);
    });

    it('canEnterStarSystem returns false when player is at cube depth only', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(cubeDepth));

      await expect(service.canEnterStarSystem(playerId, starSystemId)).resolves.toBe(false);
    });

    it('canEnterStarSystem returns false when player is in another system', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(starSystemDepth));

      await expect(service.canEnterStarSystem(playerId, 'other-star')).resolves.toBe(false);
    });

    it('canEnterPlanet returns true for admin regardless of location', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(cubeDepth));

      await expect(service.canEnterPlanet(playerId, planetId, { isAdmin: true })).resolves.toBe(
        true,
      );
      expect(repository.findOneBy).not.toHaveBeenCalled();
    });

    it('canEnterPlanet returns true when player is on the target planet', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(planetDepth));

      await expect(service.canEnterPlanet(playerId, planetId)).resolves.toBe(true);
    });

    it('canEnterPlanet returns false when player is at star system depth', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(starSystemDepth));

      await expect(service.canEnterPlanet(playerId, planetId)).resolves.toBe(false);
    });

    it('canEnterPlanet returns false when player is on another planet', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(planetDepth));

      await expect(service.canEnterPlanet(playerId, `${starSystemId}_planet_1`)).resolves.toBe(
        false,
      );
    });
  });

  it('setLocation persists a valid planet-depth location', async () => {
    repository.findOneBy.mockResolvedValue(savePlayer(null));

    const result = await service.setLocation(playerId, planetDepth);

    expect(result.location).toEqual(planetDepth);
    expect(repository.save).toHaveBeenCalled();
  });

  it('setLocation rejects invalid shapes with BadRequestException', async () => {
    repository.findOneBy.mockResolvedValue(savePlayer(null));

    await expect(
      service.setLocation(playerId, {
        cube: { id: cubeId, position: { x: 0, y: 0, z: 0 } },
        planet: planetDepth.planet,
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updatePlanetHex patches hex coordinates at planet depth', async () => {
    repository.findOneBy.mockResolvedValue(savePlayer(planetDepth));

    const result = await service.updatePlanetHex(playerId, { q: 9, r: 1 });

    expect(result.location).toEqual(
      buildPlanetLocation({
        cubeId,
        starSystemId,
        planetId,
        hex_coords: { q: 9, r: 1 },
      }),
    );
  });

  it('updatePlanetHex throws ConflictException when not at planet depth', async () => {
    repository.findOneBy.mockResolvedValue(savePlayer(cubeDepth));

    await expect(service.updatePlanetHex(playerId, { q: 0, r: 0 })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('updateCubePosition patches local cube coordinates', async () => {
    repository.findOneBy.mockResolvedValue(savePlayer(cubeDepth));

    const result = await service.updateCubePosition(playerId, { x: 1, y: 2, z: 3 });

    expect(result.location).toEqual(buildCubeLocation({ cubeId, position: { x: 1, y: 2, z: 3 } }));
  });

  it('updateStarSystemPosition patches system map coordinates', async () => {
    repository.findOneBy.mockResolvedValue(savePlayer(starSystemDepth));

    const result = await service.updateStarSystemPosition(playerId, { x: 10, y: 20 });

    expect(result.location).toEqual(
      buildStarSystemLocation({
        cubeId,
        starSystemId,
        position: { x: 10, y: 20 },
      }),
    );
  });

  describe('transitionTo', () => {
    it('enterStarSystem moves from cube to star system depth', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(cubeDepth));

      const result = await service.transitionTo(playerId, {
        type: 'enterStarSystem',
        starSystemId,
        position: { x: 50, y: 60 },
      });

      expect(result.location).toEqual(
        buildStarSystemLocation({
          cubeId,
          starSystemId,
          position: { x: 50, y: 60 },
        }),
      );
      expect(result.location).not.toHaveProperty('planet');
      if (result.location) {
        expect(result.location.cube).toEqual({ id: cubeId });
      }
    });

    it('enterPlanet moves from star system to planet depth', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(starSystemDepth));

      const result = await service.transitionTo(playerId, {
        type: 'enterPlanet',
        planetId,
        hex_coords: { q: 2, r: 3 },
      });

      expect(result.location).toEqual(
        buildPlanetLocation({
          cubeId,
          starSystemId,
          planetId,
          hex_coords: { q: 2, r: 3 },
        }),
      );
      if (result.location && 'planet' in result.location) {
        expect(result.location.starSystem).toEqual({ id: starSystemId });
        expect(result.location.planet.id).toBe(planetId);
      }
    });

    it('enterPlanet without hex moves to planet overview', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(starSystemDepth));

      const result = await service.transitionTo(playerId, {
        type: 'enterPlanet',
        planetId,
      });

      expect(result.location).toEqual(
        buildPlanetLocation({
          cubeId,
          starSystemId,
          planetId,
        }),
      );
    });

    it('updatePlanetHex selects hex from planet overview', async () => {
      repository.findOneBy.mockResolvedValue(
        savePlayer(
          buildPlanetLocation({
            cubeId,
            starSystemId,
            planetId,
          }),
        ),
      );

      const result = await service.updatePlanetHex(playerId, { q: 5, r: 6 });

      expect(result.location).toEqual(
        buildPlanetLocation({
          cubeId,
          starSystemId,
          planetId,
          hex_coords: { q: 5, r: 6 },
        }),
      );
    });

    it('leavePlanet moves from planet to star system depth', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(planetDepth));

      const result = await service.transitionTo(playerId, {
        type: 'leavePlanet',
        position: { x: 80, y: 90 },
      });

      expect(result.location).toEqual(
        buildStarSystemLocation({
          cubeId,
          starSystemId,
          position: { x: 80, y: 90 },
        }),
      );
      expect(result.location).not.toHaveProperty('planet');
    });

    it('leaveStarSystem moves from star system to cube depth', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(starSystemDepth));

      const result = await service.transitionTo(playerId, {
        type: 'leaveStarSystem',
        position: { x: 4, y: 5, z: 6 },
      });

      expect(result.location).toEqual(
        buildCubeLocation({ cubeId, position: { x: 4, y: 5, z: 6 } }),
      );
      expect(result.location).not.toHaveProperty('starSystem');
    });

    it('admin enterStarSystem relocates from any depth', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(planetDepth));
      starService.findById.mockResolvedValue({
        id: starSystemId,
        cube_id: cubeId,
      });
      starSystemService.getStarSystem.mockResolvedValue({ planets: [] });

      const result = await service.transitionTo(
        playerId,
        {
          type: 'enterStarSystem',
          starSystemId,
          position: { x: 50, y: 60 },
        },
        { adminBypass: true },
      );

      expect(result.location).toEqual(
        buildStarSystemLocation({
          cubeId,
          starSystemId,
          position: { x: 50, y: 60 },
        }),
      );
    });

    it('admin enterStarSystem rejects missing star with NotFoundException', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(planetDepth));
      starService.findById.mockResolvedValue(null);

      await expect(
        service.transitionTo(
          playerId,
          {
            type: 'enterStarSystem',
            starSystemId,
            position: { x: 0, y: 0 },
          },
          { adminBypass: true },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects enterStarSystem when not at cube depth', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(planetDepth));

      await expect(
        service.transitionTo(playerId, {
          type: 'enterStarSystem',
          starSystemId,
          position: { x: 0, y: 0 },
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('admin enterPlanet relocates from any depth', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(cubeDepth));
      starService.findById.mockResolvedValue({
        id: starSystemId,
        cube_id: cubeId,
      });
      starSystemService.getStarSystem.mockResolvedValue({
        planets: [{ id: planetId, type: 'rocky', radius: 7 }],
      });
      planetsService.getPlanet.mockResolvedValue({ _id: planetId, radius: 7 });

      const result = await service.transitionTo(
        playerId,
        {
          type: 'enterPlanet',
          planetId,
          hex_coords: { q: 2, r: 3 },
        },
        { adminBypass: true },
      );

      expect(planetsService.getPlanet).toHaveBeenCalledWith(planetId, starSystemId);
      expect(result.location).toEqual(
        buildPlanetLocation({
          cubeId,
          starSystemId,
          planetId,
          hex_coords: { q: 2, r: 3 },
        }),
      );
    });

    it('admin enterPlanet without hex relocates to planet overview', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(cubeDepth));
      starService.findById.mockResolvedValue({
        id: starSystemId,
        cube_id: cubeId,
      });
      starSystemService.getStarSystem.mockResolvedValue({
        planets: [{ id: planetId, type: 'rocky', radius: 7 }],
      });
      planetsService.getPlanet.mockResolvedValue({ _id: planetId, radius: 7 });

      const result = await service.transitionTo(
        playerId,
        {
          type: 'enterPlanet',
          planetId,
        },
        { adminBypass: true },
      );

      expect(result.location).toEqual(
        buildPlanetLocation({
          cubeId,
          starSystemId,
          planetId,
        }),
      );
    });

    it('admin enterPlanet rejects missing star with NotFoundException', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(cubeDepth));
      starService.findById.mockResolvedValue(null);

      await expect(
        service.transitionTo(
          playerId,
          {
            type: 'enterPlanet',
            planetId,
            hex_coords: { q: 0, r: 0 },
          },
          { adminBypass: true },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('admin enterPlanet rejects gas planets with UnprocessableEntityException', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(null));
      starService.findById.mockResolvedValue({
        id: starSystemId,
        cube_id: cubeId,
      });
      starSystemService.getStarSystem.mockResolvedValue({
        planets: [{ id: planetId, type: 'gas', radius: 7 }],
      });

      await expect(
        service.transitionTo(
          playerId,
          {
            type: 'enterPlanet',
            planetId,
            hex_coords: { q: 0, r: 0 },
          },
          { adminBypass: true },
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('admin enterPlanet rejects invalid planet id format', async () => {
      repository.findOneBy.mockResolvedValue(savePlayer(null));

      await expect(
        service.transitionTo(
          playerId,
          {
            type: 'enterPlanet',
            planetId: 'invalid-planet-id',
            hex_coords: { q: 0, r: 0 },
          },
          { adminBypass: true },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('throws NotFoundException when player is missing', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.getLocation(playerId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
