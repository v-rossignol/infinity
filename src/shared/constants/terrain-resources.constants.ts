import { HexBiome } from '../interfaces/planet.interface';

export interface TerrainResourceEntry {
  id: string;
  name: string;
  quantity: number;
}

/** Permanent resources from documentation/resources/resources.md */
export const PERMANENT_TERRAIN_RESOURCES: Record<HexBiome, TerrainResourceEntry[]> = {
  plain: [
    { id: 'food', name: 'Food', quantity: 10 },
    { id: 'fresh-water', name: 'Fresh water', quantity: 10 },
  ],
  forest: [
    { id: 'wood', name: 'Wood', quantity: 50 },
    { id: 'food', name: 'Food', quantity: 5 },
  ],
  mountain: [
    { id: 'stone', name: 'Stone', quantity: 75 },
    { id: 'iron-ore', name: 'Iron ore', quantity: 10 },
    { id: 'copper-ore', name: 'Copper ore', quantity: 10 },
    { id: 'coal', name: 'Coal', quantity: 5 },
  ],
  desert: [
    { id: 'silica', name: 'Silica', quantity: 100 },
    { id: 'alkaline-minerals', name: 'Alkaline minerals', quantity: 5 },
  ],
  ocean: [
    { id: 'food', name: 'Food', quantity: 30 },
    { id: 'salt-water', name: 'Salt water', quantity: 100 },
  ],
  ice: [
    { id: 'ice', name: 'Ice', quantity: 100 },
    { id: 'cryogenic-materials', name: 'Cryogenic materials', quantity: 5 },
  ],
  volcanic: [
    { id: 'obsidian', name: 'Obsidian', quantity: 10 },
    { id: 'sulfur', name: 'Sulfur', quantity: 10 },
    { id: 'basalt', name: 'Basalt', quantity: 10 },
  ],
};
