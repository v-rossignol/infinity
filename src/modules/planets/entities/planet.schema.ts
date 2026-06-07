import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Planet {
  @Prop({ required: true, unique: true })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  starSystemId: string;

  @Prop({ required: true })
  seed: string;

  @Prop({ type: [String], required: true })
  biomeTypes: string[];

  @Prop({ type: Object, required: true })
  resources: Record<string, number>;

  @Prop({ type: [[Number]], required: true })
  heightMap: number[][];

  @Prop({ type: [[String]], required: true })
  tileMap: string[][];

  @Prop({ default: false })
  visited: boolean;
}

export const PlanetSchema = SchemaFactory.createForClass(Planet);
export type PlanetDocument = HydratedDocument<Planet>;
