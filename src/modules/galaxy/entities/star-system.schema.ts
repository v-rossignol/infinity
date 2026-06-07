import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class StarSystem {
  @Prop({ required: true, unique: true })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [Object], required: true })
  stars: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    mass: number;
    temperature: number;
  }>;

  @Prop({ type: [Object], required: true })
  planets: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    radius: number;
    type: string;
    resources: Record<string, number>;
  }>;

  @Prop({ default: false })
  visited: boolean;
}

export const StarSystemSchema = SchemaFactory.createForClass(StarSystem);
export type StarSystemDocument = HydratedDocument<StarSystem>;
