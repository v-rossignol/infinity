import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp, apiPath, shouldRunE2e } from './helpers/create-e2e-app';

const describeE2e = shouldRunE2e() ? describe : describe.skip;

describeE2e('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /infinity/health returns OK', async () => {
    const response = await request(app.getHttpServer()).get(apiPath('/health')).expect(200);

    expect(response.body.status).toBe('OK');
    expect(response.body.name).toBe('infinity-server');
    expect(response.body.version).toBeDefined();
  });
});

describe('AppModule (e2e) skipped hint', () => {
  it('documents how to run app e2e tests', () => {
    if (shouldRunE2e()) {
      expect(true).toBe(true);
      return;
    }

    expect(process.env.RUN_E2E).not.toBe('1');
  });
});
