import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { GAME_CONSTANTS } from '../../../shared/constants/game.constants';
import { StarProperties, Vec3 } from '../../../shared/interfaces/galaxy.interface';
import { Vec3Schema } from './cube.schema';

@Schema({ _id: false })
export class StarPropertiesSchema implements StarProperties {
  @Prop({ required: true, type: String, enum: GAME_CONSTANTS.STAR_TYPES })
  type: StarProperties['type'];
}

@Schema({ timestamps: true, collection: 'stars' })
export class Star {
  @Prop({ required: true, unique: true })
  _id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ type: Vec3Schema, required: true })
  local_coords: Vec3;

  @Prop({ required: true, index: true })
  cube_id: string;

  @Prop({ type: StarPropertiesSchema, required: true })
  properties: StarProperties;
}

export const StarSchema = SchemaFactory.createForClass(Star);

export type StarDocument = HydratedDocument<Star>;
