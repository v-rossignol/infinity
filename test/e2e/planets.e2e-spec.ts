import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Socket } from 'socket.io-client';
import { PLANET_EVENTS } from '../../src/modules/socket/events/planet.events';
import { registerAndGetToken } from './helpers/auth.helper';
import { apiPath, createE2eApp, getAppPort, shouldRunE2e } from './helpers/create-e2e-app';
import { globalPositionInCube, nextGridOrigin } from './helpers/grid-origin.helper';
import { connectSocket, emitAndWaitFor } from './helpers/socket.helper';

const describeE2e = shouldRunE2e() ? describe : describe.skip;

const LANDABLE_TYPES = new Set(['rocky', 'ice', 'lava']);

interface PlanetSummary {
  id: string;
  name: string;
  type: string;
  radius: number;
  resources: Record<string, number>;
}

async function loadStarSystem(
  app: INestApplication,
  token: string,
): Promise<{ starId: string; planets: PlanetSummary[] }> {
  const origin = nextGridOrigin();
  const global = globalPositionInCube(origin);

  const cubePayload = await request(app.getHttpServer())
    .get(apiPath(`/cubes/${origin.x}/${origin.y}/${origin.z}`))
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  const starId = cubePayload.body.stars[0].id as string;

  const systemResponse = await request(app.getHttpServer())
    .get(apiPath(`/galaxy/systems/${starId}`))
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  return {
    starId,
    planets: systemResponse.body.planets as PlanetSummary[],
  };
}

async function findStarSystemWithPlanetType(
  app: INestApplication,
  token: string,
  type: string,
  attempts = 12,
): Promise<{ starId: string; planet: PlanetSummary } | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { starId, planets } = await loadStarSystem(app, token);
    const planet = planets.find((entry) => entry.type === type);
    if (planet) {
      return { starId, planet };
    }
  }

  return null;
}

describeE2e('Planets (e2e)', () => {
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

  describe('REST /planets', () => {
    it('creates a landable planet with surface on first entry', async () => {
      const { starId, planets } = await loadStarSystem(app, token);
      const summary = planets.find((planet) => LANDABLE_TYPES.has(planet.type));
      expect(summary).toBeDefined();

      const response = await request(app.getHttpServer())
        .get(apiPath(`/planets/${summary!.id}`))
        .query({ systemId: starId })
        .expect(200);

      expect(response.body._id).toBe(summary!.id);
      expect(response.body.name).toBe(summary!.name);
      expect(response.body.type).toBe(summary!.type);
      expect(response.body.radius).toBe(summary!.radius);
      expect(response.body.radius % 2).toBe(1);
      expect(response.body.resources).toEqual(summary!.resources);
      expect(response.body.surface.hexagons).toHaveLength(summary!.radius * summary!.radius);
      for (const hex of response.body.surface.hexagons) {
        expect(hex.resources).toEqual([]);
      }
    });

    it('rejects first entry without systemId', async () => {
      const uniquePlanetId = `e2e-missing-${Date.now()}_planet_0`;

      await request(app.getHttpServer()).get(apiPath(`/planets/${uniquePlanetId}`)).expect(400);
    });

    it('returns 404 when planet id is missing from star-system summary', async () => {
      const { starId } = await loadStarSystem(app, token);

      await request(app.getHttpServer())
        .get(apiPath(`/planets/${starId}_planet_missing`))
        .query({ systemId: starId })
        .expect(404);
    });

    it('returns 422 for gas planets', async () => {
      const match = await findStarSystemWithPlanetType(app, token, 'gas');
      expect(match).not.toBeNull();

      await request(app.getHttpServer())
        .get(apiPath(`/planets/${match!.planet.id}`))
        .query({ systemId: match!.starId })
        .expect(422);
    });

    it('returns the same planet on reload without systemId', async () => {
      const { starId, planets } = await loadStarSystem(app, token);
      const summary = planets.find((planet) => LANDABLE_TYPES.has(planet.type));
      expect(summary).toBeDefined();

      const first = await request(app.getHttpServer())
        .get(apiPath(`/planets/${summary!.id}`))
        .query({ systemId: starId })
        .expect(200);

      const second = await request(app.getHttpServer())
        .get(apiPath(`/planets/${summary!.id}`))
        .expect(200);

      expect(second.body._id).toBe(first.body._id);
      expect(second.body.surface.generatedAt).toBe(first.body.surface.generatedAt);
      expect(second.body.surface.hexagons).toHaveLength(first.body.surface.hexagons.length);
    });
  });

  describe('WebSocket planet events', () => {
    let socket: Socket;

    beforeAll(async () => {
      socket = await connectSocket(port);
    }, 30_000);

    afterAll(() => {
      socket.disconnect();
    });

    it('PLANET_JOIN broadcasts hex position and PLANET_MOVE updates Redis-backed coords', async () => {
      const { starId, planets } = await loadStarSystem(app, token);
      const summary = planets.find((planet) => LANDABLE_TYPES.has(planet.type));
      expect(summary).toBeDefined();

      await request(app.getHttpServer())
        .get(apiPath(`/planets/${summary!.id}`))
        .query({ systemId: starId })
        .expect(200);

      const joinUpdate = await emitAndWaitFor<
        { planetId: string },
        { playerId: string; planetId: string; q: number; r: number }
      >(socket, PLANET_EVENTS.JOIN, { planetId: summary!.id }, PLANET_EVENTS.UPDATE);

      expect(joinUpdate.planetId).toBe(summary!.id);
      expect(joinUpdate.q).toBeGreaterThanOrEqual(0);
      expect(joinUpdate.q).toBeLessThan(summary!.radius);
      expect(joinUpdate.r).toBeGreaterThanOrEqual(0);
      expect(joinUpdate.r).toBeLessThan(summary!.radius);

      const moveUpdate = await emitAndWaitFor<
        { planetId: string; q: number; r: number },
        { playerId: string; planetId: string; q: number; r: number }
      >(
        socket,
        PLANET_EVENTS.MOVE,
        { planetId: summary!.id, q: 1, r: 2 },
        PLANET_EVENTS.UPDATE,
      );

      expect(moveUpdate).toEqual(
        expect.objectContaining({
          planetId: summary!.id,
          q: 1,
          r: 2,
        }),
      );
    });
  });
});

describe('Planets (e2e) skipped hint', () => {
  it('documents how to run planet e2e tests', () => {
    if (shouldRunE2e()) {
      expect(true).toBe(true);
      return;
    }

    expect(process.env.RUN_E2E).not.toBe('1');
  });
});
