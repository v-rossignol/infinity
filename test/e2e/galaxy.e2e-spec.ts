import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Socket } from 'socket.io-client';
import { GALAXY_EVENTS } from '../../src/modules/socket/events/galaxy.events';
import { registerAndGetToken } from './helpers/auth.helper';
import { apiPath, createE2eApp, getAppPort, shouldRunE2e } from './helpers/create-e2e-app';
import { globalPositionInCube, nextGridOrigin } from './helpers/grid-origin.helper';
import { connectSocket, emitAndWaitFor, waitForSocketEvent } from './helpers/socket.helper';

const describeE2e = shouldRunE2e() ? describe : describe.skip;

describeE2e('Galaxy (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let port: number;

  beforeAll(async () => {
    app = await createE2eApp();
    port = getAppPort(app);
    token = await registerAndGetToken(app);
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  describe('REST /cubes', () => {
    it('rejects unauthenticated cube requests', async () => {
      const origin = nextGridOrigin();

      await request(app.getHttpServer())
        .get(apiPath(`/cubes/${origin.x}/${origin.y}/${origin.z}`))
        .expect(401);
    });

    it('find-or-creates a cube with stars', async () => {
      const origin = nextGridOrigin();

      const response = await request(app.getHttpServer())
        .get(apiPath(`/cubes/${origin.x}/${origin.y}/${origin.z}`))
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.cube.origin).toEqual(origin);
      expect(response.body.cube.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(response.body.cube.name).toBeTruthy();
      expect(response.body.stars.length).toBeGreaterThanOrEqual(5);
      expect(response.body.stars.length).toBeLessThanOrEqual(20);
      expect(response.body.cube.star_ids).toEqual(
        response.body.stars.map((star: { id: string }) => star.id),
      );
    });

    it('returns the same cube on repeated requests', async () => {
      const origin = nextGridOrigin();

      const first = await request(app.getHttpServer())
        .get(apiPath(`/cubes/${origin.x}/${origin.y}/${origin.z}`))
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const second = await request(app.getHttpServer())
        .get(apiPath(`/cubes/${origin.x}/${origin.y}/${origin.z}`))
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(second.body.cube.id).toBe(first.body.cube.id);
      expect(second.body.cube.name).toBe(first.body.cube.name);
    });

    it('returns stars only from the stars sub-route', async () => {
      const origin = nextGridOrigin();

      const response = await request(app.getHttpServer())
        .get(apiPath(`/cubes/${origin.x}/${origin.y}/${origin.z}/stars`))
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body.stars)).toBe(true);
      expect(response.body.stars.length).toBeGreaterThanOrEqual(5);
      expect(response.body.cube).toBeUndefined();
    });

    it('finds a cube by name after creation', async () => {
      const origin = nextGridOrigin();

      const created = await request(app.getHttpServer())
        .get(apiPath(`/cubes/${origin.x}/${origin.y}/${origin.z}`))
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const byName = await request(app.getHttpServer())
        .get(apiPath(`/cubes/by-name/${created.body.cube.name}`))
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(byName.body.cube.id).toBe(created.body.cube.id);
      expect(byName.body.stars).toHaveLength(created.body.stars.length);
    });
  });

  describe('REST /stars', () => {
    it('returns a star by id and lists stars by cube_id', async () => {
      const origin = nextGridOrigin();

      const cubeResponse = await request(app.getHttpServer())
        .get(apiPath(`/cubes/${origin.x}/${origin.y}/${origin.z}`))
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const star = cubeResponse.body.stars[0];
      const encodedId = encodeURIComponent(star.id);

      const starResponse = await request(app.getHttpServer())
        .get(apiPath(`/stars/${encodedId}`))
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(starResponse.body.id).toBe(star.id);

      const listResponse = await request(app.getHttpServer())
        .get(apiPath('/stars'))
        .query({ cube_id: cubeResponse.body.cube.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(listResponse.body.stars.length).toBe(cubeResponse.body.stars.length);
    });

    it('returns an empty list for an unknown cube id', async () => {
      const response = await request(app.getHttpServer())
        .get(apiPath('/stars'))
        .query({ cube_id: '550e8400-e29b-41d4-a716-446655440000' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.stars).toEqual([]);
    });
  });

  describe('WebSocket galaxy events', () => {
    let socket: Socket;

    beforeAll(async () => {
      socket = await connectSocket(port);
    }, 30_000);

    afterAll(() => {
      socket.disconnect();
    });

    it('REQUEST_CUBE resolves global position and returns CUBE_DATA', async () => {
      const origin = nextGridOrigin();
      const global = globalPositionInCube(origin);

      const payload = await emitAndWaitFor<
        typeof global,
        { cube: { id: string; origin: typeof origin } }
      >(socket, GALAXY_EVENTS.REQUEST_CUBE, global, GALAXY_EVENTS.CUBE_DATA);

      expect(payload.cube.origin).toEqual(origin);
      expect(payload.cube.id).toBeTruthy();
    });

    it('REQUEST_STAR returns STAR_DATA for an existing star', async () => {
      const origin = nextGridOrigin();

      const cubePayload = await emitAndWaitFor<
        ReturnType<typeof globalPositionInCube>,
        { stars: Array<{ id: string }> }
      >(socket, GALAXY_EVENTS.REQUEST_CUBE, globalPositionInCube(origin), GALAXY_EVENTS.CUBE_DATA);

      const star = await emitAndWaitFor<{ starId: string }, { id: string }>(
        socket,
        GALAXY_EVENTS.REQUEST_STAR,
        { starId: cubePayload.stars[0].id },
        GALAXY_EVENTS.STAR_DATA,
      );

      expect(star.id).toBe(cubePayload.stars[0].id);
    });

    it('REQUEST_STAR emits GALAXY_ERROR for a missing star', async () => {
      const errorPromise = waitForSocketEvent<{ message: string; statusCode: number }>(
        socket,
        GALAXY_EVENTS.ERROR,
      );
      socket.emit(GALAXY_EVENTS.REQUEST_STAR, { starId: 'Missing Star' });
      const error = await errorPromise;

      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('Missing Star');
    });
  });
});

describe('Galaxy (e2e) skipped hint', () => {
  it('documents how to run galaxy e2e tests', () => {
    if (shouldRunE2e()) {
      expect(true).toBe(true);
      return;
    }

    expect(process.env.RUN_E2E).not.toBe('1');
  });
});
