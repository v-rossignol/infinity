import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GALAXY_CONSTANTS } from '../../shared/constants/galaxy.constants';
import { CubeWithStars, Vec3 } from '../../shared/interfaces/galaxy.interface';
import { formatOriginKey } from '../../shared/utils/coordinates';
import { generateCube } from '../../shared/utils/galaxy';
import { isGridAlignedOrigin } from '../../shared/utils/galaxy-generation';
import { RedisService } from '../redis/redis.service';
import { Cube } from './entities/cube.schema';
import { StarService } from './star.service';
import { buildCubeCacheKeys, toCubeData } from './galaxy.mapper';

@Injectable()
export class CubeService {
  constructor(
    @InjectModel(Cube.name)
    private readonly cubeModel: Model<Cube>,
    private readonly starService: StarService,
    private readonly redisService: RedisService,
  ) {}

  async getOrCreateByOrigin(origin: Vec3): Promise<CubeWithStars> {
    if (!isGridAlignedOrigin(origin)) {
      throw new BadRequestException(
        `Origin must be grid-aligned (multiples of ${GALAXY_CONSTANTS.CUBE_SIZE_LY} LY)`,
      );
    }

    const existing = await this.findInMongoByOrigin(origin);
    if (existing) {
      await this.cachePayload(existing);
      return existing;
    }

    const cached = await this.findInCacheByOrigin(origin);
    if (cached) {
      await this.persistBestEffort(cached);
      return cached;
    }

    const generated = generateCube({ origin });
    await this.cachePayload(generated);
    await this.persistBestEffort(generated);
    return generated;
  }

  async findByName(name: string): Promise<CubeWithStars | null> {
    const cubeDoc = await this.cubeModel.findOne({ name }).exec();
    if (cubeDoc) {
      const payload = await this.hydrateFromCubeDoc(cubeDoc);
      await this.cachePayload(payload);
      return payload;
    }

    const cached = await this.redisService.get(`galaxy:cube:name:${name}`);
    if (!cached) {
      return null;
    }

    const payload = JSON.parse(cached) as CubeWithStars;
    await this.persistBestEffort(payload);
    return payload;
  }

  async invalidateCache(cube: CubeWithStars['cube']): Promise<void> {
    const keys = Object.values(buildCubeCacheKeys(cube));
    await this.redisService.del(...keys);
  }

  private async findInMongoByOrigin(origin: Vec3): Promise<CubeWithStars | null> {
    const cubeDoc = await this.cubeModel.findOne({ origin }).exec();
    if (!cubeDoc) {
      return null;
    }
    return this.hydrateFromCubeDoc(cubeDoc);
  }

  private async hydrateFromCubeDoc(cubeDoc: Cube): Promise<CubeWithStars> {
    const cube = toCubeData(cubeDoc);
    const stars = await this.starService.findByCubeId(cube.id);
    return { cube, stars };
  }

  private async findInCacheByOrigin(origin: Vec3): Promise<CubeWithStars | null> {
    const originKey = formatOriginKey(origin);
    const cached = await this.redisService.get(`galaxy:cube:origin:${originKey}`);
    if (!cached) {
      return null;
    }
    return JSON.parse(cached) as CubeWithStars;
  }

  private async cachePayload(payload: CubeWithStars): Promise<void> {
    const keys = Object.values(buildCubeCacheKeys(payload.cube));
    const serialized = JSON.stringify(payload);
    await Promise.all(
      keys.map((key) =>
        this.redisService.set(key, serialized, GALAXY_CONSTANTS.CUBE_CACHE_TTL_SECONDS),
      ),
    );
  }

  private async persistBestEffort(payload: CubeWithStars): Promise<void> {
    try {
      await this.cubeModel.create({
        _id: payload.cube.id,
        name: payload.cube.name,
        origin: payload.cube.origin,
        star_ids: payload.cube.star_ids,
      });
    } catch {
      // Best-effort: cube may already exist from a concurrent request.
    }

    await this.starService.saveManyBestEffort(payload.stars);
  }
}
