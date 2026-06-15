import { formatOriginKey } from './coordinates';
import { hashOriginToName } from './cube-naming';
import { Vec3 } from '../interfaces/galaxy.interface';

export const generateCubeName = (origin: Vec3): string => hashOriginToName(formatOriginKey(origin));

export { crc32, generateCubeNameWithCollisionHandling, hashOriginToName } from './cube-naming';

export {
  generateCube,
  generateStarPositions,
  isGridAlignedOrigin,
  pickWeightedStarType,
  STAR_TYPE_WEIGHTS,
} from './galaxy-generation';

export {
  formatOriginKey,
  getMinCorner,
  globalToLocal,
  isGlobalInCube,
  isValidLocalCoords,
  localToGlobal,
  resolveCubeCenterFromGlobal,
} from './coordinates';
