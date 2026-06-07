import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StarSystem } from './entities/star-system.schema';
import { generateStarSystem } from '../../shared/utils/procedural-generation';

@Injectable()
export class GalaxyService {
  constructor(
    @InjectModel(StarSystem.name)
    private starSystemModel: Model<StarSystem>,
  ) {}

  async getStarSystem(systemId: string) {
    let system = await this.starSystemModel.findById(systemId).exec();
    if (!system) {
      system = await this.generateStarSystem(systemId);
    }
    return system;
  }

  async generateStarSystem(systemId: string) {
    const systemData = generateStarSystem({ seed: systemId });
    const system = new this.starSystemModel({
      _id: systemId,
      ...systemData,
      visited: true,
      createdAt: new Date(),
    });
    return system.save();
  }

  async handlePlayerMove(playerId: string, position: { x: number; y: number; z: number }) {
    console.log(`Player ${playerId} moved to (${position.x}, ${position.y}, ${position.z})`);
  }
}
