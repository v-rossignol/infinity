import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { User } from '../auth/entities/user.entity';
import { Cube } from '../galaxy/entities/cube.schema';
import { StarSystem } from '../galaxy/entities/star-system.schema';
import { Planet } from '../planets/entities/planet.schema';

describe('AdminService', () => {
  let service: AdminService;

  const usersRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };

  const cubeModel = {
    countDocuments: jest.fn(),
  };

  const starSystemModel = {
    countDocuments: jest.fn(),
  };

  const planetModel = {
    countDocuments: jest.fn(),
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

  it('lists users without passwords', async () => {
    const users = [
      {
        id: 'user-id',
        username: 'admin',
        email: '',
        role: 'admin',
        createdAt: new Date(),
      },
    ];
    usersRepository.find.mockResolvedValue(users);

    await expect(service.listUsers()).resolves.toEqual(users);
    expect(usersRepository.find).toHaveBeenCalledWith({
      select: ['id', 'username', 'email', 'role', 'createdAt'],
      order: { createdAt: 'ASC' },
    });
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
