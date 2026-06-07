import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Resource {
  @Prop({ required: true })
  planetId: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  x: number;

  @Prop({ required: true })
  y: number;

  @Prop({ required: true, default: 100 })
  quantity: number;
}

export const ResourceSchema = SchemaFactory.createForClass(Resource);
export type ResourceDocument = HydratedDocument<Resource>;
