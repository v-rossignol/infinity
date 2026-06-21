import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { GalaxyModule } from '../galaxy/galaxy.module';
import { UnitsModule } from '../units/units.module';
import { StarSystem, StarSystemSchema } from './entities/star-system.schema';
import { StarSystemService } from './star-system.service';
import { SystemsController } from './systems.controller';

@Module({
  imports: [
    AuthModule,
    GalaxyModule,
    forwardRef(() => UnitsModule),
    MongooseModule.forFeature([{ name: StarSystem.name, schema: StarSystemSchema }]),
  ],
  controllers: [SystemsController],
  providers: [StarSystemService],
  exports: [StarSystemService],
})
export class SystemsModule {}
