import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StarSystem, StarSystemSchema } from './entities/star-system.schema';
import { GalaxyService } from './galaxy.service';
import { GalaxyController } from './galaxy.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: StarSystem.name, schema: StarSystemSchema }])],
  controllers: [GalaxyController],
  providers: [GalaxyService],
  exports: [GalaxyService],
})
export class GalaxyModule {}
