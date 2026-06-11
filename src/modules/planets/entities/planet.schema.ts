import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { GAME_CONSTANTS } from '../../../shared/constants/game.constants';

@Schema({ _id: false })
export class HexCoordinates {
  @Prop({ required: true })
  q: number;

  @Prop({ required: true })
  r: number;
}

@Schema({ _id: false })
export class Hexagon {
  @Prop({ required: true, enum: GAME_CONSTANTS.HEX_BIOMES })
  biome: string;

  @Prop({ type: [Object], default: [] })
  resources: Array<{
    type: string;
    abundance: number;
    rarity: string;
  }>;

  @Prop({ required: true, min: 0, max: 10 })
  dangerLevel: number;

  @Prop({ type: HexCoordinates, required: true })
  coordinates: HexCoordinates;
}

@Schema({ _id: false })
export class PlanetSurface {
  @Prop({ type: [Hexagon], required: true })
  hexagons: Hexagon[];

  @Prop({ required: true })
  generatedAt: Date;
}

@Schema({ timestamps: true })
export class Planet {
  @Prop({ required: true, unique: true })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  starSystemId: string;

  @Prop({ required: true, enum: GAME_CONSTANTS.PLANET_TYPES })
  type: string;

  @Prop({ required: true })
  radius: number;

  @Prop({ type: Object, required: true })
  resources: Record<string, number>;

  @Prop({ type: PlanetSurface, required: true })
  surface: PlanetSurface;
}

export const PlanetSchema = SchemaFactory.createForClass(Planet);
export type PlanetDocument = HydratedDocument<Planet>;
