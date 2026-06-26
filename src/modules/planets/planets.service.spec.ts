import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { buildPlanetLocation } from '../../shared/utils/player-location';
import { getPlanetHexCount } from '../../shared/utils/planet-surface-generation';
import { StarService } from '../galaxy/star.service';
import { StarSystemService } from '../systems/star-system.service';
import { PlayerLocationService } from '../players/player-location.service';
import { Planet } from './entities/planet.schema';
import { PlanetsService } from './planets.service';

describe('PlanetsService', () => {
  const planetId = 'star-uuid-p1';
  const starSystemId = 'star-uuid';
  const cubeId = 'cube-uuid';
  const playerId = 'player-uuid';
  const summary = {
    id: planetId,
    name: 'Planet 1',
    distanceFromStar: 100,
    radius: 5,
    type: 'rocky',
    resources: { iron: 100, gold: 50, water: 200 },
  };

  const findById = jest.fn();
  const PlanetModel = jest.fn().mockImplementation((doc) => {
    const instance = { ...doc };
    instance.save = jest.fn().mockResolvedValue(instance);
    return instance;
  }) as unknown as jest.Mock & { findById: jest.Mock };

  PlanetModel.findById = findById;

  const mockStarSystemService = {
    getStarSystem: jest.fn(),
  };

  const mockStarService = {
    findById: jest.fn(),
  };

  const mockPlayerLocationService = {
    getLocation: jest.fn(),
    setLocation: jest.fn(),
    updatePlanetHex: jest.fn(),
  };

  let service: PlanetsService;

  beforeEach(async () => {
    findById.mockReset();
    PlanetModel.mockClear();
    mockStarSystemService.getStarSystem.mockReset();
    mockStarService.findById.mockReset();
    mockPlayerLocationService.getLocation.mockReset();
    mockPlayerLocationService.setLocation.mockReset();
    mockPlayerLocationService.updatePlanetHex.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanetsService,
        { provide: getModelToken(Planet.name), useValue: PlanetModel },
        { provide: StarSystemService, useValue: mockStarSystemService },
        { provide: StarService, useValue: mockStarService },
        { provide: PlayerLocationService, useValue: mockPlayerLocationService },
      ],
    }).compile();

    service = module.get(PlanetsService);
  });

  it('returns an existing planet without requiring systemId', async () => {
    const existing = { _id: planetId, name: 'Planet 1' };
    findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(existing) });

    await expect(service.getPlanet(planetId)).resolves.toBe(existing);
    expect(mockStarSystemService.getStarSystem).not.toHaveBeenCalled();
  });

  it('requires systemId on first entry', async () => {
    findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.getPlanet(planetId)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects gas planets with 422 and does not create a Planet document', async () => {
    findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    mockStarSystemService.getStarSystem.mockResolvedValue({
      planets: [{ ...summary, type: 'gas' }],
    });

    await expect(service.getPlanet(planetId, starSystemId)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(PlanetModel).not.toHaveBeenCalled();
  });

  it('throws 404 when summary id is missing', async () => {
    findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    mockStarSystemService.getStarSystem.mockResolvedValue({ planets: [] });

    await expect(service.getPlanet(planetId, starSystemId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the existing planet when a concurrent save hits E11000', async () => {
    const raced = { _id: planetId, name: summary.name };
    const exec = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(raced);
    findById.mockReturnValue({ exec });
    mockStarSystemService.getStarSystem.mockResolvedValue({ planets: [summary] });

    PlanetModel.mockImplementationOnce((doc) => {
      const instance = { ...doc };
      instance.save = jest.fn().mockRejectedValue({ code: 11000 });
      return instance;
    });

    await expect(service.getPlanet(planetId, starSystemId)).resolves.toBe(raced);
    expect(exec).toHaveBeenCalledTimes(2);
  });

  it('creates a landable planet with inherited summary fields', async () => {
    findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    mockStarSystemService.getStarSystem.mockResolvedValue({ planets: [summary] });

    const planet = await service.getPlanet(planetId, starSystemId);

    expect(PlanetModel).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: summary.id,
        name: summary.name,
        starSystemId,
        type: summary.type,
        radius: summary.radius,
        resources: summary.resources,
        surface: expect.objectContaining({
          hexagons: expect.arrayContaining([
            expect.objectContaining({ resources: [], coordinates: expect.any(Object) }),
          ]),
        }),
      }),
    );
    expect(planet._id).toBe(summary.id);
    expect(planet.name).toBe(summary.name);
    expect(planet.type).toBe(summary.type);
    expect(planet.radius).toBe(summary.radius);
    expect(planet.resources).toEqual(summary.resources);
    expect(planet.surface.hexagons).toHaveLength(getPlanetHexCount(summary.radius));
  });

  it('returns the same saved planet on reload without regenerating', async () => {
    const saved = {
      _id: planetId,
      name: summary.name,
      type: summary.type,
      radius: summary.radius,
      resources: summary.resources,
      surface: { hexagons: Array(getPlanetHexCount(summary.radius)).fill({ resources: [] }) },
    };
    const exec = jest.fn().mockResolvedValue(saved);
    findById.mockReturnValue({ exec });

    const first = await service.getPlanet(planetId);
    const second = await service.getPlanet(planetId, starSystemId);

    expect(first).toBe(saved);
    expect(second).toBe(saved);
    expect(exec).toHaveBeenCalledTimes(2);
    expect(mockStarSystemService.getStarSystem).not.toHaveBeenCalled();
    expect(PlanetModel).not.toHaveBeenCalled();
  });

  describe('joinPlanet', () => {
    it('returns hex from PostgreSQL location when already on the same planet', async () => {
      mockPlayerLocationService.getLocation.mockResolvedValue(
        buildPlanetLocation({
          cubeId,
          starSystemId,
          planetId,
          hex_coords: { q: 2, r: 3 },
        }),
      );
      findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: planetId, starSystemId, radius: 5 }),
      });

      const position = await service.joinPlanet(playerId, planetId);

      expect(position).toEqual({ planetId, q: 2, r: 3 });
      expect(mockPlayerLocationService.setLocation).not.toHaveBeenCalled();
    });

    it('returns planetId only when already on the same planet without hex', async () => {
      mockPlayerLocationService.getLocation.mockResolvedValue(
        buildPlanetLocation({
          cubeId,
          starSystemId,
          planetId,
        }),
      );
      findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: planetId, starSystemId, radius: 5 }),
      });

      const position = await service.joinPlanet(playerId, planetId);

      expect(position).toEqual({ planetId });
      expect(mockPlayerLocationService.setLocation).not.toHaveBeenCalled();
    });

    it('sets planet overview when player is not on the planet', async () => {
      mockPlayerLocationService.getLocation.mockResolvedValue(null);
      findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: planetId, starSystemId, radius: 5 }),
      });
      mockStarService.findById.mockResolvedValue({ id: starSystemId, cube_id: cubeId });
      mockPlayerLocationService.setLocation.mockResolvedValue(undefined);

      const position = await service.joinPlanet(playerId, planetId);

      expect(position).toEqual({ planetId });
      expect(mockPlayerLocationService.setLocation).toHaveBeenCalledWith(
        playerId,
        buildPlanetLocation({
          cubeId,
          starSystemId,
          planetId,
        }),
      );
    });

    it('throws 409 when player is on a different planet', async () => {
      findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: planetId, starSystemId, radius: 5 }),
      });
      mockPlayerLocationService.getLocation.mockResolvedValue(
        buildPlanetLocation({
          cubeId,
          starSystemId,
          planetId: 'other-planet',
          hex_coords: { q: 0, r: 0 },
        }),
      );

      await expect(service.joinPlanet(playerId, planetId)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws 404 when planet document is missing on join', async () => {
      mockPlayerLocationService.getLocation.mockResolvedValue(null);
      findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.joinPlanet(playerId, planetId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('handlePlayerMove', () => {
    it('selects hex from planet overview via handlePlayerMove', async () => {
      mockPlayerLocationService.getLocation.mockResolvedValue(
        buildPlanetLocation({
          cubeId,
          starSystemId,
          planetId,
        }),
      );

      const result = await service.handlePlayerMove(playerId, {
        planetId,
        q: 4,
        r: 1,
      });

      expect(result).toEqual({ planetId, q: 4, r: 1 });
      expect(mockPlayerLocationService.updatePlanetHex).toHaveBeenCalledWith(playerId, {
        q: 4,
        r: 1,
      });
    });

    it('persists hex position to PostgreSQL', async () => {
      mockPlayerLocationService.getLocation.mockResolvedValue(
        buildPlanetLocation({
          cubeId,
          starSystemId,
          planetId,
          hex_coords: { q: 0, r: 0 },
        }),
      );

      const result = await service.handlePlayerMove(playerId, {
        planetId,
        q: 4,
        r: 1,
      });

      expect(result).toEqual({ planetId, q: 4, r: 1 });
      expect(mockPlayerLocationService.updatePlanetHex).toHaveBeenCalledWith(playerId, {
        q: 4,
        r: 1,
      });
    });

    it('calls updatePlanetHex on every move', async () => {
      mockPlayerLocationService.getLocation.mockResolvedValue(
        buildPlanetLocation({
          cubeId,
          starSystemId,
          planetId,
          hex_coords: { q: 0, r: 0 },
        }),
      );

      await service.handlePlayerMove(playerId, { planetId, q: 1, r: 2 });
      await service.handlePlayerMove(playerId, { planetId, q: 3, r: 4 });

      expect(mockPlayerLocationService.updatePlanetHex).toHaveBeenCalledTimes(2);
      expect(mockPlayerLocationService.updatePlanetHex).toHaveBeenNthCalledWith(1, playerId, {
        q: 1,
        r: 2,
      });
      expect(mockPlayerLocationService.updatePlanetHex).toHaveBeenNthCalledWith(2, playerId, {
        q: 3,
        r: 4,
      });
    });

    it('throws 409 when player is not at planet depth', async () => {
      mockPlayerLocationService.getLocation.mockResolvedValue(null);

      await expect(
        service.handlePlayerMove(playerId, { planetId, q: 1, r: 2 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws 409 when player is on a different planet', async () => {
      mockPlayerLocationService.getLocation.mockResolvedValue(
        buildPlanetLocation({
          cubeId,
          starSystemId,
          planetId: 'other-planet',
          hex_coords: { q: 0, r: 0 },
        }),
      );

      await expect(
        service.handlePlayerMove(playerId, { planetId, q: 1, r: 2 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
