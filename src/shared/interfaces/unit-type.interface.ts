import { UNIT_CATEGORIES, UNIT_RULE_RANGES, UNIT_SIZES } from '../constants/unit.constants';

export type UnitCategory = (typeof UNIT_CATEGORIES)[number];
export type UnitSize = (typeof UNIT_SIZES)[number];
export type UnitRuleRange = (typeof UNIT_RULE_RANGES)[number];

export interface UnitRule {
  range: UnitRuleRange;
  value: number;
}

export interface UnitCargoCapability {
  size: number;
}

export interface UnitExtractionCapability {
  speed: number;
  types: string[];
}

export interface UnitCapabilities {
  cargo?: UnitCargoCapability;
  extraction?: UnitExtractionCapability;
  [key: string]: unknown;
}

export interface UnitTypeDefinition {
  id: string;
  name: string;
  type: UnitCategory;
  size: UnitSize;
  mobility: boolean;
  speed: number | null;
  environments: string[];
  rules: UnitRule[];
  capabilities: UnitCapabilities;
  description: string | null;
  metadata: Record<string, unknown>;
}
