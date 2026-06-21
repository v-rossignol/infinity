import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { PlayersModule } from '../players/players.module';
import { Cube, CubeSchema } from './entities/cube.schema';
import { Star, StarSchema } from './entities/star.schema';
import { GalaxyService } from './galaxy.service';
import { CubesController } from './cubes.controller';
import { StarsController } from './stars.controller';
import { CubeService } from './cube.service';
import { StarService } from './star.service';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => PlayersModule),
    MongooseModule.forFeature([
      { name: Cube.name, schema: CubeSchema },
      { name: Star.name, schema: StarSchema },
    ]),
  ],
  controllers: [CubesController, StarsController],
  providers: [GalaxyService, CubeService, StarService],
  exports: [GalaxyService, CubeService, StarService],
})
export class GalaxyModule {}
