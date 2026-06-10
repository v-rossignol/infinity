import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { generateStarSystem } from '../../shared/utils/procedural-generation';
import { StarSystem } from './entities/star-system.schema';
import { StarService } from './star.service';

@Injectable()
export class StarSystemService {
  constructor(
    @InjectModel(StarSystem.name)
    private readonly starSystemModel: Model<StarSystem>,
    private readonly starService: StarService,
  ) {}

  async getStarSystem(starId: string) {
    let system = await this.starSystemModel.findById(starId).exec();
    if (!system) {
      system = await this.generateStarSystem(starId);
    }
    return system;
  }

  async generateStarSystem(starId: string) {
    const star = await this.starService.findById(starId);
    if (!star) {
      throw new NotFoundException(`Star "${starId}" not found`);
    }

    const systemData = generateStarSystem({ seed: starId });
    const system = new this.starSystemModel({
      _id: starId,
      ...systemData,
      name: star.name,
      visited: true,
    });
    return system.save();
  }
}
