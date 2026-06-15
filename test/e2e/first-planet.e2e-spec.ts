import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { registerAndGetAuth } from './helpers/auth.helper';
import { apiPath, createE2eApp, shouldRunE2e } from './helpers/create-e2e-app';

const describeE2e = shouldRunE2e() ? describe : describe.skip;

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

    expect(response.body).toEqual({
      player: expect.objectContaining({
        id: expect.any(String),
        userId: expect.any(String),
        location: expect.objectContaining({
          cube: expect.objectContaining({ id: expect.any(String) }),
          starSystem: expect.objectContaining({ id: expect.any(String) }),
          planet: expect.objectContaining({
            id: expect.any(String),
            hex_coords: expect.objectContaining({
              q: expect.any(Number),
              r: expect.any(Number),
            }),
          }),
        }),
      }),
    });
    expect(response.body.cube).toBeUndefined();
    expect(response.body.planet).toBeUndefined();
    expect(response.body.surfacePosition).toBeUndefined();

    const planetId = response.body.player.location.planet.id;
    const planet = await request(app.getHttpServer())
      .get(apiPath(`/planets/${planetId}`))
      .expect(200);

    expect(planet.body._id).toBe(planetId);
    expect(planet.body.type).toBe('rocky');
    expect(planet.body.surface.hexagons.length).toBe(planet.body.radius * (planet.body.radius + 1));
  });

  it('GET player profile exposes location without legacy flat fields', async () => {
    const { token, userId } = await registerAndGetAuth(app);

    const spawn = await request(app.getHttpServer())
      .post(apiPath('/players/me/enter-game'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const profile = await request(app.getHttpServer())
      .get(apiPath(`/players/${userId}`))
      .expect(200);

    expect(profile.body.location).toEqual(spawn.body.player.location);
    expect(profile.body.galaxyX).toBeUndefined();
    expect(profile.body.currentPlanetId).toBeUndefined();
    expect(profile.body.planetX).toBeUndefined();
  });

  it('returns the same location on repeat enter-game', async () => {
    const { token } = await registerAndGetAuth(app);

    const first = await request(app.getHttpServer())
      .post(apiPath('/players/me/enter-game'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const second = await request(app.getHttpServer())
      .post(apiPath('/players/me/enter-game'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(second.body).toEqual({ player: first.body.player });
  });

  it('reloads planet via GET after enter-game without systemId', async () => {
    const { token } = await registerAndGetAuth(app);

    const spawn = await request(app.getHttpServer())
      .post(apiPath('/players/me/enter-game'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const planetId = spawn.body.player.location.planet.id;

    const reload = await request(app.getHttpServer())
      .get(apiPath(`/planets/${planetId}`))
      .expect(200);

    expect(reload.body._id).toBe(planetId);
    expect(reload.body.surface.generatedAt).toBeDefined();
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
