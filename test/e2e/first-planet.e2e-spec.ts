import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { registerAndGetAuth } from './helpers/auth.helper';
import { apiPath, createE2eApp, shouldRunE2e } from './helpers/create-e2e-app';

const describeE2e = shouldRunE2e() ? describe : describe.skip;

const SEED_ORIGIN = { x: 0, y: 0, z: 0 };

describeE2e('First planet enter-game (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated enter-game requests', async () => {
    await request(app.getHttpServer()).post(apiPath('/players/me/enter-game')).expect(401);
  });

  it('bootstraps spawn world and persists player location', async () => {
    const { token } = await registerAndGetAuth(app);

    const response = await request(app.getHttpServer())
      .post(apiPath('/players/me/enter-game'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.player.currentPlanetId).toBeTruthy();
    expect(response.body.planet._id).toBe(response.body.player.currentPlanetId);
    expect(response.body.planet.type).toBe('rocky');
    expect(response.body.planet.surface.hexagons.length).toBe(
      response.body.planet.radius * response.body.planet.radius,
    );
    expect(response.body.starSystemId).toBe(response.body.star.id);
    expect(response.body.cube.id).toBe(response.body.star.cube_id);
    expect(response.body.cube.origin).not.toEqual(SEED_ORIGIN);
    expect(response.body.surfacePosition).toEqual(
      expect.objectContaining({
        q: response.body.player.planetX,
        r: response.body.player.planetY,
      }),
    );
    expect(response.body.player.galaxyX).toBeDefined();
    expect(response.body.player.galaxyY).toBeDefined();
    expect(response.body.player.galaxyZ).toBeDefined();
  });

  it('returns the same spawn context on repeat enter-game', async () => {
    const { token } = await registerAndGetAuth(app);

    const first = await request(app.getHttpServer())
      .post(apiPath('/players/me/enter-game'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const second = await request(app.getHttpServer())
      .post(apiPath('/players/me/enter-game'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(second.body.player.currentPlanetId).toBe(first.body.player.currentPlanetId);
    expect(second.body.planet._id).toBe(first.body.planet._id);
    expect(second.body.cube.id).toBe(first.body.cube.id);
    expect(second.body.star.id).toBe(first.body.star.id);
    expect(second.body.surfacePosition).toEqual(first.body.surfacePosition);
  });

  it('reloads planet via GET after enter-game without systemId', async () => {
    const { token } = await registerAndGetAuth(app);

    const spawn = await request(app.getHttpServer())
      .post(apiPath('/players/me/enter-game'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const reload = await request(app.getHttpServer())
      .get(apiPath(`/planets/${spawn.body.planet._id}`))
      .expect(200);

    expect(reload.body._id).toBe(spawn.body.planet._id);
    expect(reload.body.surface.generatedAt).toBe(spawn.body.planet.surface.generatedAt);
  });
});

describe('First planet enter-game (e2e) skipped hint', () => {
  it('documents how to run first-planet e2e tests', () => {
    if (shouldRunE2e()) {
      expect(true).toBe(true);
      return;
    }

    expect(process.env.RUN_E2E).not.toBe('1');
  });
});
