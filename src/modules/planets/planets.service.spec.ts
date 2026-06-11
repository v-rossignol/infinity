import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { getPlanetPositionRedisKey } from '../../shared/constants/planet.constants';
import { StarSystemService } from '../galaxy/star-system.service';
import { RedisService } from '../redis/redis.service';
import { Planet } from './entities/planet.schema';
import { PlanetsService } from './planets.service';

describe('PlanetsService', () => {
  const planetId = 'star-uuid_planet_0';
  const starSystemId = 'star-uuid';
  const playerId = 'socket-1';
  const summary = {
    id: planetId,
    name: 'Planet 1',
    x: 100,
    y: 0,
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

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  let service: PlanetsService;

  beforeEach(async () => {
    findById.mockReset();
    PlanetModel.mockClear();
    mockStarSystemService.getStarSystem.mockReset();
    mockRedisService.get.mockReset();
    mockRedisService.set.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanetsService,
        { provide: getModelToken(Planet.name), useValue: PlanetModel },
        { provide: StarSystemService, useValue: mockStarSystemService },
        { provide: RedisService, useValue: mockRedisService },
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
    expect(planet.surface.hexagons).toHaveLength(25);
  });

  it('returns the same saved planet on reload without regenerating', async () => {
    const saved = {
      _id: planetId,
      name: summary.name,
      type: summary.type,
      radius: summary.radius,
      resources: summary.resources,
      surface: { hexagons: Array(25).fill({ resources: [] }) },
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
    it('restores cached Redis position when present', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify({ q: 2, r: 3 }));

      const position = await service.joinPlanet(playerId, planetId);

      expect(position).toEqual({ planetId, q: 2, r: 3 });
      expect(findById).not.toHaveBeenCalled();
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });

    it('assigns random spawn and writes Redis when no cache exists', async () => {
      mockRedisService.get.mockResolvedValue(null);
      findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: planetId, radius: 5 }),
      });

      const position = await service.joinPlanet(playerId, planetId);

      expect(position.planetId).toBe(planetId);
      expect(position.q).toBeGreaterThanOrEqual(0);
      expect(position.q).toBeLessThan(5);
      expect(position.r).toBeGreaterThanOrEqual(0);
      expect(position.r).toBeLessThan(5);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        getPlanetPositionRedisKey(planetId, playerId),
        JSON.stringify({ q: position.q, r: position.r }),
        expect.any(Number),
      );
    });

    it('throws 404 when planet document is missing on join', async () => {
      mockRedisService.get.mockResolvedValue(null);
      findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.joinPlanet(playerId, planetId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('handlePlayerMove', () => {
    it('persists hex position to Redis', async () => {
      const result = await service.handlePlayerMove(playerId, {
        planetId,
        q: 4,
        r: 1,
      });

      expect(result).toEqual({ planetId, q: 4, r: 1 });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        getPlanetPositionRedisKey(planetId, playerId),
        JSON.stringify({ q: 4, r: 1 }),
        expect.any(Number),
      );
    });
  });
});
