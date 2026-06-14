import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GalaxyModule } from '../galaxy/galaxy.module';
import { PlayersModule } from '../players/players.module';
import { Planet, PlanetSchema } from './entities/planet.schema';
import { PlanetsService } from './planets.service';
import { PlanetsController } from './planets.controller';

@Module({
  imports: [
    GalaxyModule,
    forwardRef(() => PlayersModule),
    MongooseModule.forFeature([{ name: Planet.name, schema: PlanetSchema }]),
  ],
  controllers: [PlanetsController],
  providers: [PlanetsService],
  exports: [PlanetsService],
})
export class PlanetsModule {}
