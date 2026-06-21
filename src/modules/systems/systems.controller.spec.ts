import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StarSystemService } from './star-system.service';
import { SystemsController } from './systems.controller';

describe('SystemsController', () => {
  let controller: SystemsController;

  const mockStarSystemService = {
    getStarSystem: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemsController],
      providers: [{ provide: StarSystemService, useValue: mockStarSystemService }],
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
});
