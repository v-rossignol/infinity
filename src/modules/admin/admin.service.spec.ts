import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getPlanetHexCount } from '../../shared/utils/planet-surface-generation';
import { AdminService } from './admin.service';
import { PlanetPreviewCacheService } from '../planets/planet-preview-cache.service';
import { User } from '../auth/entities/user.entity';
import { Cube } from '../galaxy/entities/cube.schema';
import { StarSystem } from '../galaxy/entities/star-system.schema';
import { Planet } from '../planets/entities/planet.schema';

describe('AdminService', () => {
  let service: AdminService;

  const usersRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
  };

  const cubeModel = {
    countDocuments: jest.fn(),
  };

  const starSystemModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
  };

  const planetModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
  };

  const planetPreviewCacheService = {
    getByParams: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: getModelToken(Cube.name),
          useValue: cubeModel,
        },
        {
          provide: getModelToken(StarSystem.name),
          useValue: starSystemModel,
        },
        {
          provide: getModelToken(Planet.name),
          useValue: planetModel,
        },
        {
          provide: PlanetPreviewCacheService,
          useValue: planetPreviewCacheService,
        },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  it('returns a user summary by id', async () => {
    const user = {
      id: 'user-id',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      createdAt: new Date(),
    };
    usersRepository.findOne.mockResolvedValue(user);

    await expect(service.getUserById('user-id')).resolves.toEqual(user);
  });

  it('throws when the user does not exist', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.getUserById('missing-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists users without passwords using default pagination', async () => {
    const users = [
      {
        id: 'user-id',
        username: 'admin',
        email: '',
        role: 'admin',
        createdAt: new Date(),
      },
    ];
    usersRepository.findAndCount.mockResolvedValue([users, 1]);

    await expect(service.listUsers()).resolves.toEqual({
      items: users,
      total: 1,
      page: 1,
      count: 20,
    });
    expect(usersRepository.findAndCount).toHaveBeenCalledWith({
      select: ['id', 'username', 'email', 'role', 'createdAt'],
      order: { createdAt: 'ASC' },
      skip: 0,
      take: 20,
    });
  });

  it('lists users with custom page and count', async () => {
    const users = [
      {
        id: 'user-id-2',
        username: 'pilot',
        email: 'pilot@example.com',
        role: 'user',
        createdAt: new Date(),
      },
    ];
    usersRepository.findAndCount.mockResolvedValue([users, 42]);

    await expect(service.listUsers({ page: 3, count: 10 })).resolves.toEqual({
      items: users,
      total: 42,
      page: 3,
      count: 10,
    });
    expect(usersRepository.findAndCount).toHaveBeenCalledWith({
      select: ['id', 'username', 'email', 'role', 'createdAt'],
      order: { createdAt: 'ASC' },
      skip: 20,
      take: 10,
    });
  });

  it('generates a preview planet with defaults', async () => {
    planetPreviewCacheService.getByParams.mockResolvedValue(null);

    const preview = await service.generatePlanetPreview();

    expect(preview.name).toBe('Preview Planet');
    expect(preview.type).toBe('rocky');
    expect(preview.radius).toBe(10);
    expect(preview._id).toEqual(expect.any(String));
    expect(preview.surface.hexagons).toHaveLength(getPlanetHexCount(10));
    expect(preview.surface.generatedAt).toBeInstanceOf(Date);
    expect(planetPreviewCacheService.save).toHaveBeenCalledWith(preview);
  });

  it('generates a deterministic preview planet from seed', async () => {
    planetPreviewCacheService.getByParams.mockResolvedValue(null);

    const first = await service.generatePlanetPreview({
      seed: 'fixed-seed',
      radius: 8,
      type: 'ice',
    });
    const second = await service.generatePlanetPreview({
      seed: 'fixed-seed',
      radius: 8,
      type: 'ice',
    });

    expect(first).toEqual(second);
    expect(first._id).toBe('fixed-seed');
    expect(first.type).toBe('ice');
    expect(first.radius).toBe(8);
    expect(first.surface.hexagons).toHaveLength(getPlanetHexCount(8));
    expect(planetPreviewCacheService.save).toHaveBeenCalledTimes(2);
  });

  it('returns a cached preview planet when redis has an entry', async () => {
    const cachedPreview = {
      _id: 'fixed-seed',
      name: 'Preview Planet',
      type: 'ice' as const,
      radius: 8,
      surface: {
        hexagons: [],
        generatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    };
    planetPreviewCacheService.getByParams.mockResolvedValue(cachedPreview);

    const preview = await service.generatePlanetPreview({
      seed: 'fixed-seed',
      radius: 8,
      type: 'ice',
    });

    expect(preview).toEqual(cachedPreview);
    expect(planetPreviewCacheService.save).not.toHaveBeenCalled();
  });

  it('lists planets without surface data using default pagination', async () => {
    const planets = [
      {
        _id: 'planet-1',
        name: 'Terra',
        starSystemId: 'system-1',
        type: 'rocky',
        radius: 10,
        resources: { iron: 0.5 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const lean = jest.fn().mockResolvedValue(planets);
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    const select = jest.fn().mockReturnValue({ sort });
    planetModel.find.mockReturnValue({ select });
    planetModel.countDocuments.mockResolvedValue(1);

    await expect(service.listPlanets()).resolves.toEqual({
      items: planets,
      total: 1,
      page: 1,
      count: 20,
    });
    expect(planetModel.find).toHaveBeenCalledWith();
    expect(select).toHaveBeenCalledWith(
      '_id name starSystemId type radius resources createdAt updatedAt',
    );
    expect(sort).toHaveBeenCalledWith({ createdAt: 1 });
    expect(skip).toHaveBeenCalledWith(0);
    expect(limit).toHaveBeenCalledWith(20);
    expect(lean).toHaveBeenCalled();
    expect(planetModel.countDocuments).toHaveBeenCalled();
  });

  it('lists planets with custom page and count', async () => {
    const planets = [
      {
        _id: 'planet-2',
        name: 'Ice World',
        starSystemId: 'system-2',
        type: 'ice',
        radius: 8,
        resources: { water: 0.9 },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const lean = jest.fn().mockResolvedValue(planets);
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    const select = jest.fn().mockReturnValue({ sort });
    planetModel.find.mockReturnValue({ select });
    planetModel.countDocuments.mockResolvedValue(42);

    await expect(service.listPlanets({ page: 3, count: 10 })).resolves.toEqual({
      items: planets,
      total: 42,
      page: 3,
      count: 10,
    });
    expect(skip).toHaveBeenCalledWith(20);
    expect(limit).toHaveBeenCalledWith(10);
  });

  it('lists star systems using default pagination', async () => {
    const systems = [
      {
        _id: 'system-1',
        name: 'Alpha Centauri',
        planets: [
          {
            id: 'planet-1',
            name: 'Terra',
            distanceFromStar: 100,
            radius: 10,
            type: 'rocky',
            resources: { iron: 0.5 },
          },
        ],
        visited: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const lean = jest.fn().mockResolvedValue(systems);
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    const select = jest.fn().mockReturnValue({ sort });
    starSystemModel.find.mockReturnValue({ select });
    starSystemModel.countDocuments.mockResolvedValue(1);

    await expect(service.listStarSystems()).resolves.toEqual({
      items: systems,
      total: 1,
      page: 1,
      count: 20,
    });
    expect(starSystemModel.find).toHaveBeenCalledWith();
    expect(select).toHaveBeenCalledWith('_id name planets visited createdAt updatedAt');
    expect(sort).toHaveBeenCalledWith({ createdAt: 1 });
    expect(skip).toHaveBeenCalledWith(0);
    expect(limit).toHaveBeenCalledWith(20);
    expect(lean).toHaveBeenCalled();
    expect(starSystemModel.countDocuments).toHaveBeenCalled();
  });

  it('lists star systems with custom page and count', async () => {
    const systems = [
      {
        _id: 'system-2',
        name: 'Proxima',
        planets: [],
        visited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const lean = jest.fn().mockResolvedValue(systems);
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    const select = jest.fn().mockReturnValue({ sort });
    starSystemModel.find.mockReturnValue({ select });
    starSystemModel.countDocuments.mockResolvedValue(42);

    await expect(service.listStarSystems({ page: 3, count: 10 })).resolves.toEqual({
      items: systems,
      total: 42,
      page: 3,
      count: 10,
    });
    expect(skip).toHaveBeenCalledWith(20);
    expect(limit).toHaveBeenCalledWith(10);
  });

  it('returns entity counts for admin statistics', async () => {
    usersRepository.count.mockResolvedValue(3);
    cubeModel.countDocuments.mockResolvedValue(12);
    starSystemModel.countDocuments.mockResolvedValue(8);
    planetModel.countDocuments.mockResolvedValue(24);

    await expect(service.getStatistics()).resolves.toEqual({
      users: 3,
      cubes: 12,
      starSystems: 8,
      planets: 24,
    });
  });
});
