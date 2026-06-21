import { Injectable } from '@nestjs/common';
import {
  ADMIN_CONSTANTS,
  buildPlanetPreviewCacheKey,
  buildPlanetPreviewIdCacheKey,
} from '../../shared/constants/admin.constants';
import { PlanetPreview } from '../../shared/interfaces/planet-preview.interface';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PlanetPreviewCacheService {
  constructor(private readonly redisService: RedisService) {}

  async getByParams(seed: string, radius: number, type: string): Promise<PlanetPreview | null> {
    return this.getFromKey(buildPlanetPreviewCacheKey(seed, radius, type));
  }

  async getById(id: string): Promise<PlanetPreview | null> {
    return this.getFromKey(buildPlanetPreviewIdCacheKey(id));
  }

  async save(preview: PlanetPreview): Promise<void> {
    const serialized = JSON.stringify(preview);
    const ttl = ADMIN_CONSTANTS.PLANET_PREVIEW_CACHE_TTL_SECONDS;
    const { _id: seed, radius, type } = preview;

    await Promise.all([
      this.redisService.set(buildPlanetPreviewCacheKey(seed, radius, type), serialized, ttl),
      this.redisService.set(buildPlanetPreviewIdCacheKey(seed), serialized, ttl),
    ]);
  }

  private async getFromKey(key: string): Promise<PlanetPreview | null> {
    const cached = await this.redisService.get(key);
    if (!cached) {
      return null;
    }

    return this.parsePreview(cached);
  }

  private parsePreview(cached: string): PlanetPreview {
    const preview = JSON.parse(cached) as PlanetPreview;
    preview.surface.generatedAt = new Date(preview.surface.generatedAt);
    return preview;
  }
}
