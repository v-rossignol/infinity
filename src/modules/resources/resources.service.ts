import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource } from './entities/resource.schema';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectModel(Resource.name)
    private resourceModel: Model<Resource>,
  ) {}

  async findByPlanetId(planetId: string) {
    return this.resourceModel.find({ planetId }).exec();
  }

  async harvest(resourceId: string, amount: number) {
    const resource = await this.resourceModel.findById(resourceId).exec();
    if (!resource) {
      return null;
    }
    resource.quantity = Math.max(0, resource.quantity - amount);
    return resource.save();
  }
}
