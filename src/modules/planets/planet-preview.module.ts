import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { PlanetPreviewCacheService } from './planet-preview-cache.service';

@Module({
  imports: [RedisModule],
  providers: [PlanetPreviewCacheService],
  exports: [PlanetPreviewCacheService],
})
export class PlanetPreviewModule {}
