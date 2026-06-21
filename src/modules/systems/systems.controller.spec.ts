import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UnitInstanceService } from '../units/unit-instance.service';
import { StarSystemService } from './star-system.service';
import { SystemsController } from './systems.controller';

describe('SystemsController', () => {
  let controller: SystemsController;

  const mockStarSystemService = {
    getStarSystem: jest.fn(),
  };

  const mockUnitInstanceService = {
    listByStarSystem: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemsController],
      providers: [
        { provide: StarSystemService, useValue: mockStarSystemService },
        { provide: UnitInstanceService, useValue: mockUnitInstanceService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(SystemsController);
  });

  it('returns a star system by id', async () => {
    const system = { _id: 'star-uuid', name: 'Alpha Ces Luf Top', planets: [], visited: true };
    mockStarSystemService.getStarSystem.mockResolvedValue(system);

    await expect(controller.getStarSystem('star-uuid')).resolves.toEqual(system);
    expect(mockStarSystemService.getStarSystem).toHaveBeenCalledWith('star-uuid');
  });

  it('lists star-system-depth unit instances', async () => {
    const units = [{ id: '662e8400-e29b-41d4-a716-446655440002' }];
    mockUnitInstanceService.listByStarSystem.mockResolvedValue(units);

    await expect(controller.listSystemUnits('star-uuid')).resolves.toEqual(units);
    expect(mockUnitInstanceService.listByStarSystem).toHaveBeenCalledWith('star-uuid');
  });
});
