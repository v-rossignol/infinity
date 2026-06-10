import { CubeData, StarData } from '../../shared/interfaces/galaxy.interface';
import { formatOriginKey } from '../../shared/utils/coordinates';

type CubeRecord = {
  _id: string;
  name: string;
  origin: CubeData['origin'];
  star_ids: string[];
};

type StarRecord = {
  _id: string;
  name: string;
  local_coords: StarData['local_coords'];
  cube_id: string;
  properties: StarData['properties'];
};

export const toCubeData = (doc: CubeRecord): CubeData => ({
  id: doc._id,
  name: doc.name,
  origin: doc.origin,
  star_ids: doc.star_ids,
});

export const toStarData = (doc: StarRecord): StarData => ({
  id: doc._id,
  name: doc.name,
  local_coords: doc.local_coords,
  cube_id: doc.cube_id,
  properties: doc.properties,
});

export const buildCubeCacheKeys = (cube: CubeData) => {
  const originKey = formatOriginKey(cube.origin);
  return {
    origin: `galaxy:cube:origin:${originKey}`,
    id: `galaxy:cube:id:${cube.id}`,
    name: `galaxy:cube:name:${cube.name}`,
  };
};
