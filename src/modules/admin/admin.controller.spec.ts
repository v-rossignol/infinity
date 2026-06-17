import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;

  const adminUser = {
    id: 'admin-id',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mockAdminService = {
    getUserById: jest.fn(),
    listUsers: jest.fn(),
    listPlanets: jest.fn(),
    listStarSystems: jest.fn(),
    getStatistics: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminController);
  });

  it('returns the current admin profile', async () => {
    mockAdminService.getUserById.mockResolvedValue(adminUser);

    const result = await controller.getMe({
      user: { id: adminUser.id, username: adminUser.username, role: 'admin' },
    } as never);

    expect(mockAdminService.getUserById).toHaveBeenCalledWith(adminUser.id);
    expect(result).toEqual(adminUser);
  });

  it('lists users', async () => {
    const paginatedUsers = {
      items: [adminUser],
      total: 1,
      page: 1,
      count: 20,
    };
    mockAdminService.listUsers.mockResolvedValue(paginatedUsers);

    const result = await controller.listUsers({ page: 1, count: 20 });

    expect(mockAdminService.listUsers).toHaveBeenCalledWith({ page: 1, count: 20 });
    expect(result).toEqual(paginatedUsers);
  });

  it('lists planets', async () => {
    const paginatedPlanets = {
      items: [
        {
          _id: 'planet-1',
          name: 'Terra',
          starSystemId: 'system-1',
          type: 'rocky',
          radius: 10,
          resources: { iron: 0.5 },
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      total: 1,
      page: 1,
      count: 20,
    };
    mockAdminService.listPlanets.mockResolvedValue(paginatedPlanets);

    const result = await controller.listPlanets({ page: 1, count: 20 });

    expect(mockAdminService.listPlanets).toHaveBeenCalledWith({ page: 1, count: 20 });
    expect(result).toEqual(paginatedPlanets);
  });

  it('lists star systems', async () => {
    const paginatedSystems = {
      items: [
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
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      total: 1,
      page: 1,
      count: 20,
    };
    mockAdminService.listStarSystems.mockResolvedValue(paginatedSystems);

    const result = await controller.listStarSystems({ page: 1, count: 20 });

    expect(mockAdminService.listStarSystems).toHaveBeenCalledWith({ page: 1, count: 20 });
    expect(result).toEqual(paginatedSystems);
  });

  it('returns admin statistics', async () => {
    const statistics = {
      users: 3,
      cubes: 12,
      starSystems: 8,
      planets: 24,
    };
    mockAdminService.getStatistics.mockResolvedValue(statistics);

    const result = await controller.getStatistics();

    expect(mockAdminService.getStatistics).toHaveBeenCalled();
    expect(result).toEqual(statistics);
  });
});
