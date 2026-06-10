import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StarData } from '../../shared/interfaces/galaxy.interface';
import { Star } from './entities/star.schema';
import { toStarData } from './galaxy.mapper';

@Injectable()
export class StarService {
  constructor(
    @InjectModel(Star.name)
    private readonly starModel: Model<Star>,
  ) {}

  async findByCubeId(cubeId: string): Promise<StarData[]> {
    const stars = await this.starModel.find({ cube_id: cubeId }).exec();
    return stars.map(toStarData);
  }

  async findById(starId: string): Promise<StarData | null> {
    const star = await this.starModel.findById(starId).exec();
    return star ? toStarData(star) : null;
  }

  async saveManyBestEffort(stars: StarData[]): Promise<void> {
    for (const star of stars) {
      try {
        await this.starModel.create({
          _id: star.id,
          name: star.name,
          local_coords: star.local_coords,
          cube_id: star.cube_id,
          properties: star.properties,
        });
      } catch {
        // Best-effort: skip duplicates or transient write failures.
      }
    }
  }
}
