import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GalaxyController } from './galaxy.controller';
import { StarSystemService } from './star-system.service';

describe('GalaxyController', () => {
  let controller: GalaxyController;

  const mockStarSystemService = {
    getStarSystem: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GalaxyController],
      providers: [{ provide: StarSystemService, useValue: mockStarSystemService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(GalaxyController);
  });

  it('returns a star system by id', async () => {
    const system = { _id: 'star-uuid', name: 'Alpha Ces Luf Top', planets: [], visited: true };
    mockStarSystemService.getStarSystem.mockResolvedValue(system);

    await expect(controller.getStarSystem('star-uuid')).resolves.toEqual(system);
    expect(mockStarSystemService.getStarSystem).toHaveBeenCalledWith('star-uuid');
  });
});
