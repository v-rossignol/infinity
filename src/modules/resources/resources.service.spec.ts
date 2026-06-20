import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { PlanetPreviewCacheService } from '../planets/planet-preview-cache.service';
import { Planet } from '../planets/entities/planet.schema';
import { Resource } from './entities/resource.schema';
import { ResourcesService } from './resources.service';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let planetModel: jest.Mocked<Pick<Model<Planet>, 'findById'>>;
  let resourceModel: jest.Mocked<Pick<Model<Resource>, 'find'>>;

  const planetPreviewCacheService = {
    getById: jest.fn(),
  };

  const planetId = 'star-uuid_planet_0';
  const planet = {
    _id: planetId,
    surface: {
      hexagons: [
        {
          biome: 'mountain',
          resources: [],
          dangerLevel: 2,
          coordinates: { q: 1, r: 2 },
        },
        {
          biome: 'plain',
          resources: [],
          dangerLevel: 0,
          coordinates: { q: 0, r: 0 },
        },
      ],
    },
  };

  beforeEach(async () => {
    planetModel = {
      findById: jest.fn(),
    };
    resourceModel = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: getModelToken(Resource.name), useValue: resourceModel },
        { provide: getModelToken(Planet.name), useValue: planetModel },
        { provide: PlanetPreviewCacheService, useValue: planetPreviewCacheService },
      ],
    }).compile();

    service = module.get(ResourcesService);
    jest.clearAllMocks();
  });

  describe('findByPlanetHex', () => {
    it('returns resolved resources for an existing hex', async () => {
      planetModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(planet),
      } as never);

      const result = await service.findByPlanetHex(planetId, 1, 2);

      expect(result).toEqual({
        planetId,
        coordinates: { q: 1, r: 2 },
        biome: 'mountain',
        resources: expect.arrayContaining([
          { type: 'stone', abundance: 75, rarity: 'common' },
          { type: 'iron-ore', abundance: 10, rarity: 'common' },
        ]),
      });
    });

    it('throws NotFoundException when planet is missing', async () => {
      planetModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as never);
      planetPreviewCacheService.getById.mockResolvedValue(null);

      await expect(service.findByPlanetHex(planetId, 0, 0)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns resolved resources for a cached preview planet hex', async () => {
      planetModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as never);
      planetPreviewCacheService.getById.mockResolvedValue({
        _id: '1',
        name: 'Preview Planet',
        type: 'rocky',
        radius: 10,
        surface: {
          hexagons: [
            {
              biome: 'forest',
              resources: [],
              dangerLevel: 0,
              coordinates: { q: 2, r: 1 },
            },
          ],
          generatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      });

      const result = await service.findByPlanetHex('1', 2, 1);

      expect(result).toEqual({
        planetId: '1',
        coordinates: { q: 2, r: 1 },
        biome: 'forest',
        resources: expect.arrayContaining([
          { type: 'wood', abundance: 50, rarity: 'common' },
        ]),
      });
    });

    it('throws NotFoundException when hex coordinates are missing', async () => {
      planetModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(planet),
      } as never);

      await expect(service.findByPlanetHex(planetId, 9, 9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByPlanetId', () => {
    it('returns an empty array for cached preview planets', async () => {
      planetPreviewCacheService.getById.mockResolvedValue({
        _id: '1',
        name: 'Preview Planet',
        type: 'rocky',
        radius: 10,
        surface: { hexagons: [], generatedAt: new Date() },
      });

      await expect(service.findByPlanetId('1')).resolves.toEqual([]);
      expect(resourceModel.find).not.toHaveBeenCalled();
    });
  });

  describe('parseHexCoordinate', () => {
    it('accepts non-negative integers', () => {
      expect(service.parseHexCoordinate('0', 'q')).toBe(0);
      expect(service.parseHexCoordinate('12', 'r')).toBe(12);
    });

    it('rejects invalid coordinates', () => {
      expect(() => service.parseHexCoordinate('-1', 'q')).toThrow(BadRequestException);
      expect(() => service.parseHexCoordinate('1.5', 'r')).toThrow(BadRequestException);
      expect(() => service.parseHexCoordinate('abc', 'q')).toThrow(BadRequestException);
    });
  });
});
