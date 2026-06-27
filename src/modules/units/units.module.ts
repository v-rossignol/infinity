import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Planet, PlanetSchema } from '../planets/entities/planet.schema';
import { Player } from '../players/entities/player.entity';
import { UnitInstance } from './entities/unit-instance.entity';
import { UnitType } from './entities/unit-type.entity';
import { UnitCatalogService } from './unit-catalog.service';
import { UnitInstanceService } from './unit-instance.service';
import { UnitMovementService } from './unit-movement.service';
import { UnitInstancesController } from './unit-instances.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UnitType, UnitInstance, Player]),
    MongooseModule.forFeature([{ name: Planet.name, schema: PlanetSchema }]),
  ],
  controllers: [UnitInstancesController],
  providers: [UnitCatalogService, UnitInstanceService, UnitMovementService],
  exports: [UnitCatalogService, UnitInstanceService, UnitMovementService],
})
export class UnitsModule {}
