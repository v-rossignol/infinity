import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayersModule } from '../players/players.module';
import { UnitInstance } from './entities/unit-instance.entity';
import { UnitType } from './entities/unit-type.entity';
import { UnitCatalogService } from './unit-catalog.service';
import { UnitInstanceService } from './unit-instance.service';
import { UnitMovementService } from './unit-movement.service';
import { UnitInstancesController } from './unit-instances.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UnitType, UnitInstance]), forwardRef(() => PlayersModule)],
  controllers: [UnitInstancesController],
  providers: [UnitCatalogService, UnitInstanceService, UnitMovementService],
  exports: [UnitCatalogService, UnitInstanceService, UnitMovementService],
})
export class UnitsModule {}
