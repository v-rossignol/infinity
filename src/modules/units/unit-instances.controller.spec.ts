import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UnitInstanceService } from './unit-instance.service';
import { UnitInstancesController } from './unit-instances.controller';

describe('UnitInstancesController', () => {
  let controller: UnitInstancesController;

  const mockUnitInstanceService = {
    listByOwnerForAdmin: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnitInstancesController],
      providers: [{ provide: UnitInstanceService, useValue: mockUnitInstanceService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(UnitInstancesController);
  });

  it('lists unit instances for an owner id', async () => {
    const ownerId = '773e8400-e29b-41d4-a716-446655440003';
    const units = [{ id: '662e8400-e29b-41d4-a716-446655440002' }];
    mockUnitInstanceService.listByOwnerForAdmin.mockResolvedValue(units);

    await expect(controller.listByOwner({ ownerId })).resolves.toEqual(units);
    expect(mockUnitInstanceService.listByOwnerForAdmin).toHaveBeenCalledWith(ownerId);
  });
});
