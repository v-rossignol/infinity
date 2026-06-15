import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { GALAXY_EVENTS } from '../../src/modules/socket/events/galaxy.events';
import { SYSTEM_EVENTS } from '../../src/modules/socket/events/system.events';
import { registerAndGetAuth } from './helpers/auth.helper';
import { apiPath, createE2eApp, getAppPort, shouldRunE2e } from './helpers/create-e2e-app';
import { connectSocket, emitAndWaitFor } from './helpers/socket.helper';

const describeE2e = shouldRunE2e() ? describe : describe.skip;

describeE2e('Player location (e2e)', () => {
  let app: INestApplication;
  let port: number;

  beforeAll(async () => {
    app = await createE2eApp();
    port = getAppPort(app);
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('walks view transitions and persists cube/system moves', async () => {
    const { token, userId } = await registerAndGetAuth(app);

    const enterGame = await request(app.getHttpServer())
      .post(apiPath('/players/me/enter-game'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const starSystemId = enterGame.body.player.location.starSystem.id as string;
    const planetId = enterGame.body.player.location.planet.id as string;

    const leavePlanet = await request(app.getHttpServer())
      .post(apiPath('/players/me/location/leave-planet'))
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 50, y: 60 })
      .expect(200);

    expect(leavePlanet.body.player.location).toEqual(
      expect.objectContaining({
        cube: { id: expect.any(String) },
        starSystem: {
          id: starSystemId,
          position: { x: 50, y: 60 },
        },
      }),
    );
    expect(leavePlanet.body.player.location.planet).toBeUndefined();

    const leaveSystem = await request(app.getHttpServer())
      .post(apiPath('/players/me/location/leave-system'))
      .set('Authorization', `Bearer ${token}`)
      .send({ x: 1.5, y: 2.5, z: 3.5 })
      .expect(200);

    expect(leaveSystem.body.player.location).toEqual({
      cube: {
        id: enterGame.body.player.location.cube.id,
        position: { x: 1.5, y: 2.5, z: 3.5 },
      },
    });

    const socket = await connectSocket(port, token);
    try {
      const galaxyUpdate = await emitAndWaitFor<
        { x: number; y: number; z: number },
        { playerId: string; x: number; y: number; z: number }
      >(socket, GALAXY_EVENTS.MOVE, { x: 4, y: 5, z: 6 }, GALAXY_EVENTS.UPDATE);

      expect(galaxyUpdate).toEqual(
        expect.objectContaining({
          playerId: enterGame.body.player.id,
          x: 4,
          y: 5,
          z: 6,
        }),
      );
    } finally {
      socket.disconnect();
    }

    const afterGalaxyMove = await request(app.getHttpServer())
      .get(apiPath(`/players/${userId}`))
      .expect(200);

    expect(afterGalaxyMove.body.location.cube.position).toEqual({ x: 4, y: 5, z: 6 });

    const enterSystem = await request(app.getHttpServer())
      .post(apiPath('/players/me/location/enter-system'))
      .set('Authorization', `Bearer ${token}`)
      .send({ starSystemId, x: 80, y: 90 })
      .expect(200);

    expect(enterSystem.body.player.location.starSystem).toEqual({
      id: starSystemId,
      position: { x: 80, y: 90 },
    });

    const systemSocket = await connectSocket(port, token);
    try {
      const systemUpdate = await emitAndWaitFor<
        { x: number; y: number },
        { playerId: string; x: number; y: number }
      >(systemSocket, SYSTEM_EVENTS.MOVE, { x: 11, y: 22 }, SYSTEM_EVENTS.UPDATE);

      expect(systemUpdate).toEqual(
        expect.objectContaining({
          playerId: enterGame.body.player.id,
          x: 11,
          y: 22,
        }),
      );
    } finally {
      systemSocket.disconnect();
    }

    const afterSystemMove = await request(app.getHttpServer())
      .get(apiPath(`/players/${userId}`))
      .expect(200);

    expect(afterSystemMove.body.location.starSystem.position).toEqual({ x: 11, y: 22 });

    const enterPlanet = await request(app.getHttpServer())
      .post(apiPath('/players/me/location/enter-planet'))
      .set('Authorization', `Bearer ${token}`)
      .send({ planetId, q: 3, r: 4 })
      .expect(200);

    expect(enterPlanet.body.player.location.planet).toEqual({
      id: planetId,
      hex_coords: { q: 3, r: 4 },
    });
  }, 60_000);
});

describe('Player location (e2e) skipped hint', () => {
  it('documents how to run player location e2e tests', () => {
    if (shouldRunE2e()) {
      expect(true).toBe(true);
      return;
    }

    expect(process.env.RUN_E2E).not.toBe('1');
  });
});
