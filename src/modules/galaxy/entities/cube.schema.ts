import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Vec3 } from '../../../shared/interfaces/galaxy.interface';

@Schema({ _id: false })
export class Vec3Schema implements Vec3 {
  @Prop({ required: true })
  x: number;

  @Prop({ required: true })
  y: number;

  @Prop({ required: true })
  z: number;
}

@Schema({ timestamps: true, collection: 'cubes' })
export class Cube {
  @Prop({ required: true, unique: true })
  _id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ type: Vec3Schema, required: true })
  origin: Vec3;

  @Prop({ type: [String], default: [] })
  star_ids: string[];
}

export const CubeSchema = SchemaFactory.createForClass(Cube);

CubeSchema.index({ 'origin.x': 1, 'origin.y': 1, 'origin.z': 1 }, { unique: true });

export type CubeDocument = HydratedDocument<Cube>;
