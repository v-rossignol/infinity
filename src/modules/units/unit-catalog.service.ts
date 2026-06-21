import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UNIT_CATALOG } from './constants/unit-catalog';
import { UnitType } from './entities/unit-type.entity';
import { UnitCategory, UnitTypeDefinition } from '../../shared/interfaces/unit-type.interface';

export interface UnitCatalogCounts {
  vehicules: number;
  buildings: number;
}

@Injectable()
export class UnitCatalogService implements OnModuleInit {
  private readonly logger = new Logger(UnitCatalogService.name);

  constructor(
    @InjectRepository(UnitType)
    private readonly unitTypeRepository: Repository<UnitType>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureCatalog();
  }

  async ensureCatalog(): Promise<void> {
    for (const definition of UNIT_CATALOG) {
      await this.ensureUnitType(definition);
    }
  }

  async listVehicules(): Promise<UnitType[]> {
    return this.unitTypeRepository.find({
      where: { type: 'vehicule' },
      order: { id: 'ASC' },
    });
  }

  async getVehiculeById(vehiculeId: string): Promise<UnitType | null> {
    return this.unitTypeRepository.findOne({
      where: { id: vehiculeId, type: 'vehicule' },
    });
  }

  getCatalogCounts(): UnitCatalogCounts {
    return {
      vehicules: this.countCatalogByType('vehicule'),
      buildings: this.countCatalogByType('building'),
    };
  }

  private countCatalogByType(type: UnitCategory): number {
    return UNIT_CATALOG.filter((definition) => definition.type === type).length;
  }

  private async ensureUnitType(definition: UnitTypeDefinition): Promise<void> {
    const existing = await this.unitTypeRepository.findOneBy({ id: definition.id });
    if (existing) {
      return;
    }

    const unitType = this.unitTypeRepository.create(definition);
    await this.unitTypeRepository.save(unitType);
    this.logger.log(`Seeded unit type catalog entry: ${definition.id}`);
  }
}
