import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Cube, CubeSchema } from './entities/cube.schema';
import { Star, StarSchema } from './entities/star.schema';
import { StarSystem, StarSystemSchema } from './entities/star-system.schema';
import { GalaxyService } from './galaxy.service';
import { GalaxyController } from './galaxy.controller';
import { CubesController } from './cubes.controller';
import { StarsController } from './stars.controller';
import { CubeService } from './cube.service';
import { StarService } from './star.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Cube.name, schema: CubeSchema },
      { name: Star.name, schema: StarSchema },
      { name: StarSystem.name, schema: StarSystemSchema },
    ]),
  ],
  controllers: [GalaxyController, CubesController, StarsController],
  providers: [GalaxyService, CubeService, StarService],
  exports: [GalaxyService, CubeService, StarService],
})
export class GalaxyModule {}
