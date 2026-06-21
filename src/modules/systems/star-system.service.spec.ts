import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { StarService } from '../galaxy/star.service';
import { StarSystem } from './entities/star-system.schema';
import { StarSystemService } from './star-system.service';

describe('StarSystemService', () => {
  let service: StarSystemService;
  let mockSave: jest.Mock;
  let capturedDoc: Record<string, unknown> | undefined;

  const mockFindById = jest.fn();
  const mockStarService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSave = jest.fn();

    const MockStarSystemModel = jest.fn().mockImplementation((doc) => {
      capturedDoc = doc;
      return {
        ...doc,
        save: mockSave,
      };
    });

    Object.assign(MockStarSystemModel, { findById: mockFindById });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StarSystemService,
        {
          provide: getModelToken(StarSystem.name),
          useValue: MockStarSystemModel,
        },
        {
          provide: StarService,
          useValue: mockStarService,
        },
      ],
    }).compile();

    service = module.get(StarSystemService);
  });

  it('returns an existing star system without regenerating', async () => {
    const existing = { _id: 'star-uuid', name: 'Alpha Ces Luf Top', planets: [], visited: true };
    mockFindById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existing),
    });

    const result = await service.getStarSystem('star-uuid');
    expect(result).toBe(existing);
    expect(mockStarService.findById).not.toHaveBeenCalled();
  });

  it('generates a star system with the parent star name', async () => {
    mockFindById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockStarService.findById.mockResolvedValue({
      id: 'star-uuid',
      name: 'Alpha Ces Luf Top',
      local_coords: { x: 1, y: 2, z: 3 },
      cube_id: 'cube-uuid',
      properties: { type: 'yellow' },
    });
    mockSave.mockResolvedValue({ _id: 'star-uuid', name: 'Alpha Ces Luf Top' });

    const result = await service.generateStarSystem('star-uuid');

    expect(mockStarService.findById).toHaveBeenCalledWith('star-uuid');
    expect(mockSave).toHaveBeenCalled();
    expect(capturedDoc).toBeDefined();
    expect(capturedDoc).not.toHaveProperty('stars');
    expect(capturedDoc?.planets).toEqual(expect.any(Array));
    const planets = capturedDoc?.planets as Array<{ name: string }> | undefined;
    expect(planets?.[0]?.name).toBe('Alpha CesLufTop I');
    expect(result).toEqual({ _id: 'star-uuid', name: 'Alpha Ces Luf Top' });
  });

  it('throws when generating a system for an unknown star', async () => {
    mockStarService.findById.mockResolvedValue(null);

    await expect(service.generateStarSystem('missing-star')).rejects.toThrow(NotFoundException);
  });
});
