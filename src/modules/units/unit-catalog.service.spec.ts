import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SCOUT_X1 } from './constants/unit-catalog';
import { UnitType } from './entities/unit-type.entity';
import { UnitCatalogService } from './unit-catalog.service';

describe('UnitCatalogService', () => {
  let service: UnitCatalogService;
  let unitTypeRepository: {
    findOneBy: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    unitTypeRepository = {
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((unitType: Partial<UnitType>) => unitType),
      save: jest.fn(async (unitType: Partial<UnitType>) => unitType),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitCatalogService,
        {
          provide: getRepositoryToken(UnitType),
          useValue: unitTypeRepository,
        },
      ],
    }).compile();

    service = module.get(UnitCatalogService);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  describe('ensureCatalog', () => {
    it('seeds Scout-X1 when the catalog entry does not exist', async () => {
      unitTypeRepository.findOneBy.mockResolvedValue(null);

      await service.ensureCatalog();

      expect(unitTypeRepository.findOneBy).toHaveBeenCalledWith({ id: SCOUT_X1.id });
      expect(unitTypeRepository.create).toHaveBeenCalledWith(SCOUT_X1);
      expect(unitTypeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: SCOUT_X1.id,
          name: SCOUT_X1.name,
          type: SCOUT_X1.type,
          size: SCOUT_X1.size,
          mobility: SCOUT_X1.mobility,
          speed: SCOUT_X1.speed,
          environments: SCOUT_X1.environments,
          rules: SCOUT_X1.rules,
          capabilities: SCOUT_X1.capabilities,
          description: SCOUT_X1.description,
          metadata: SCOUT_X1.metadata,
        }),
      );
    });

    it('does not duplicate Scout-X1 when it already exists', async () => {
      unitTypeRepository.findOneBy.mockResolvedValue({
        id: SCOUT_X1.id,
        name: SCOUT_X1.name,
        type: SCOUT_X1.type,
        size: SCOUT_X1.size,
        mobility: SCOUT_X1.mobility,
        speed: SCOUT_X1.speed,
        environments: SCOUT_X1.environments,
        rules: SCOUT_X1.rules,
        capabilities: SCOUT_X1.capabilities,
        description: SCOUT_X1.description,
        metadata: SCOUT_X1.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.ensureCatalog();

      expect(unitTypeRepository.findOneBy).toHaveBeenCalledWith({ id: SCOUT_X1.id });
      expect(unitTypeRepository.create).not.toHaveBeenCalled();
      expect(unitTypeRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('listVehicules', () => {
    it('returns vehicule unit types ordered by id', async () => {
      const vehicules = [
        {
          id: SCOUT_X1.id,
          name: SCOUT_X1.name,
          type: SCOUT_X1.type,
          size: SCOUT_X1.size,
          mobility: SCOUT_X1.mobility,
          speed: SCOUT_X1.speed,
          environments: SCOUT_X1.environments,
          rules: SCOUT_X1.rules,
          capabilities: SCOUT_X1.capabilities,
          description: SCOUT_X1.description,
          metadata: SCOUT_X1.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      unitTypeRepository.find.mockResolvedValue(vehicules);

      await expect(service.listVehicules()).resolves.toEqual(vehicules);
      expect(unitTypeRepository.find).toHaveBeenCalledWith({
        where: { type: 'vehicule' },
        order: { id: 'ASC' },
      });
    });
  });

  describe('getCatalogCounts', () => {
    it('returns catalog counts by unit category', () => {
      expect(service.getCatalogCounts()).toEqual({
        vehicules: 1,
        buildings: 0,
      });
    });
  });

  describe('getVehiculeById', () => {
    it('returns the vehicule when it exists in the catalog', async () => {
      const vehicule = {
        id: SCOUT_X1.id,
        name: SCOUT_X1.name,
        type: SCOUT_X1.type,
        size: SCOUT_X1.size,
        mobility: SCOUT_X1.mobility,
        speed: SCOUT_X1.speed,
        environments: SCOUT_X1.environments,
        rules: SCOUT_X1.rules,
        capabilities: SCOUT_X1.capabilities,
        description: SCOUT_X1.description,
        metadata: SCOUT_X1.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      unitTypeRepository.findOne.mockResolvedValue(vehicule);

      await expect(service.getVehiculeById(SCOUT_X1.id)).resolves.toEqual(vehicule);
      expect(unitTypeRepository.findOne).toHaveBeenCalledWith({
        where: { id: SCOUT_X1.id, type: 'vehicule' },
      });
    });

    it('returns null when the vehicule does not exist', async () => {
      unitTypeRepository.findOne.mockResolvedValue(null);

      await expect(service.getVehiculeById('missing-id')).resolves.toBeNull();
    });
  });
});
