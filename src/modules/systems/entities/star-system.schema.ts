import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class StarSystem {
  @Prop({ required: true, unique: true })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [Object], required: true })
  planets: Array<{
    id: string;
    name: string;
    distanceFromStar: number;
    radius: number;
    type: string;
    resources: Record<string, number>;
  }>;

  @Prop({ default: false })
  visited: boolean;
}

export const StarSystemSchema = SchemaFactory.createForClass(StarSystem);
export type StarSystemDocument = HydratedDocument<StarSystem>;
