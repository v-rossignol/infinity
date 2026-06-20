import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlanetPreviewModule } from '../planets/planet-preview.module';
import { Planet, PlanetSchema } from '../planets/entities/planet.schema';
import { Resource, ResourceSchema } from './entities/resource.schema';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';

@Module({
  imports: [
    PlanetPreviewModule,
    MongooseModule.forFeature([
      { name: Resource.name, schema: ResourceSchema },
      { name: Planet.name, schema: PlanetSchema },
    ]),
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
