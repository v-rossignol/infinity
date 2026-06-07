import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Planet, PlanetSchema } from './entities/planet.schema';
import { PlanetsService } from './planets.service';
import { PlanetsController } from './planets.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Planet.name, schema: PlanetSchema }])],
  controllers: [PlanetsController],
  providers: [PlanetsService],
  exports: [PlanetsService],
})
export class PlanetsModule {}
