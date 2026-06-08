export const GALAXY_EVENTS = {
  MOVE: 'GALAXY_MOVE',
  UPDATE: 'GALAXY_UPDATE',
  REQUEST_CUBE: 'REQUEST_CUBE',
  REQUEST_STAR: 'REQUEST_STAR',
  CUBE_DATA: 'CUBE_DATA',
  STAR_DATA: 'STAR_DATA',
  ERROR: 'GALAXY_ERROR',
} as const;

export const getCubeRoomName = (cubeId: string): string => `cube:${cubeId}`;
