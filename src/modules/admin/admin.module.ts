import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { Cube, CubeSchema } from '../galaxy/entities/cube.schema';
import { StarSystem, StarSystemSchema } from '../galaxy/entities/star-system.schema';
import { Planet, PlanetSchema } from '../planets/entities/planet.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    AuthModule,
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
