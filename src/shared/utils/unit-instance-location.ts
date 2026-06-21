import { Location } from '../interfaces/player-location.interface';
import { UnitInstanceDenormalizedFields } from '../interfaces/unit-instance.interface';
import {
  assertValidLocation,
  isPlayerLocationInCube,
  isPlayerLocationInStarSystem,
  isPlayerLocationOnPlanet,
} from './player-location';

export function computeDenormalizedFields(location: Location): UnitInstanceDenormalizedFields {
  assertValidLocation(location, { subject: 'unit' });

  const cubeId = location.cube.id;

  if (isPlayerLocationOnPlanet(location)) {
    return {
      placeLevel: 'planet',
      cubeId,
      starSystemId: null,
      planetId: location.planet.id,
    };
  }

  if (isPlayerLocationInStarSystem(location)) {
    return {
      placeLevel: 'starSystem',
      cubeId,
      starSystemId: location.starSystem.id,
      planetId: null,
    };
  }

  if (isPlayerLocationInCube(location)) {
    return {
      placeLevel: 'cube',
      cubeId,
      starSystemId: null,
      planetId: null,
    };
  }

  throw new Error('location depth could not be resolved');
}
