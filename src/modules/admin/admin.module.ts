import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { Cube, CubeSchema } from '../galaxy/entities/cube.schema';
import { StarSystem, StarSystemSchema } from '../systems/entities/star-system.schema';
import { Planet, PlanetSchema } from '../planets/entities/planet.schema';
import { PlanetPreviewModule } from '../planets/planet-preview.module';
import { UnitsModule } from '../units/units.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    AuthModule,
    PlanetPreviewModule,
    UnitsModule,
    TypeOrmModule.forFeature([User]),
    MongooseModule.forFeature([
      { name: Cube.name, schema: CubeSchema },
      { name: StarSystem.name, schema: StarSystemSchema },
      { name: Planet.name, schema: PlanetSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
