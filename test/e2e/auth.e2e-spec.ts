import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AUTH_COOKIE_NAME } from '../../src/modules/auth/constants/auth-cookie';
import {
  parseTokenFromSetCookie,
  registerAndGetAuth,
  buildAuthCookie,
} from './helpers/auth.helper';
import { apiPath, createE2eApp, shouldRunE2e } from './helpers/create-e2e-app';

const describeE2e = shouldRunE2e() ? describe : describe.skip;

describeE2e('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('registers, restores session, and logs out via cookie', async () => {
    const username = `e2e_auth_${Date.now()}`;
    const registerResponse = await request(app.getHttpServer())
      .post(apiPath('/auth/register'))
      .send({ username, password: 'secret123', email: 'pilot@example.com' })
      .expect(201);

    expect(registerResponse.body.user).toEqual({
      id: expect.any(String),
      username,
      email: 'pilot@example.com',
    });
    expect(registerResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining(`${AUTH_COOKIE_NAME}=`)]),
    );

    const setCookie = registerResponse.headers['set-cookie'];
    const cookie = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    expect(cookie.length).toBeGreaterThan(0);

    const token = parseTokenFromSetCookie(setCookie);

    const meResponse = await request(app.getHttpServer())
      .get(apiPath('/auth/me'))
      .set('Cookie', buildAuthCookie(token))
      .expect(200);

    expect(meResponse.body).toEqual(registerResponse.body.user);

    await request(app.getHttpServer())
      .post(apiPath('/auth/logout'))
      .set('Cookie', buildAuthCookie(token))
      .expect(200);

    await request(app.getHttpServer()).get(apiPath('/auth/me')).expect(401);
  });

  it('returns 409 when username is already taken', async () => {
    const username = `e2e_dup_${Date.now()}`;
    await request(app.getHttpServer())
      .post(apiPath('/auth/register'))
      .send({ username, password: 'secret123' })
      .expect(201);

    const duplicate = await request(app.getHttpServer())
      .post(apiPath('/auth/register'))
      .send({ username, password: 'secret123' })
      .expect(409);

    expect(duplicate.body).toEqual(
      expect.objectContaining({
        statusCode: 409,
        message: 'Username already taken',
        error: 'Conflict',
      }),
    );
  });

  it('supports Bearer token from Set-Cookie for enter-game', async () => {
    const { token } = await registerAndGetAuth(app);

    await request(app.getHttpServer())
      .post(apiPath('/players/me/enter-game'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('returns success from forgot-password stub', async () => {
    const response = await request(app.getHttpServer())
      .post(apiPath('/auth/forgot-password'))
      .send({ email: 'unknown@example.com' })
      .expect(200);

    expect(response.body).toEqual({ success: true });
  });
});

describe('Auth (e2e) skipped hint', () => {
  it('documents how to enable auth e2e tests', () => {
    if (!shouldRunE2e()) {
      expect(process.env.RUN_E2E).not.toBe('1');
    }
  });
});

describeE2e('Auth login (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('sets cookie on login', async () => {
    const username = `e2e_login_${Date.now()}`;
    await request(app.getHttpServer())
      .post(apiPath('/auth/register'))
      .send({ username, password: 'secret123' })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post(apiPath('/auth/login'))
      .send({ username, password: 'secret123' })
      .expect(200);

    expect(loginResponse.body.user.username).toBe(username);
    const token = parseTokenFromSetCookie(loginResponse.headers['set-cookie']);
    expect(token).toBeTruthy();
  });
});
