import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitType } from './entities/unit-type.entity';
import { UnitCatalogService } from './unit-catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([UnitType])],
  providers: [UnitCatalogService],
  exports: [UnitCatalogService],
})
export class UnitsModule {}
