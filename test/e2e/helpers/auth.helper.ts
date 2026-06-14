import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AUTH_COOKIE_NAME } from '../../../src/modules/auth/constants/auth-cookie';
import { apiPath } from './create-e2e-app';

export function getUserIdFromToken(token: string): string {
  const [, payloadPart] = token.split('.');
  const json = Buffer.from(payloadPart, 'base64url').toString('utf8');
  return (JSON.parse(json) as { sub: string }).sub;
}

export function buildAuthCookie(token: string): string {
  return `${AUTH_COOKIE_NAME}=${token}`;
}

export function parseTokenFromSetCookie(setCookieHeader: string | string[] | undefined): string {
  const headers = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];
  const cookieHeader = headers.find((header) => header.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!cookieHeader) {
    throw new Error(`No ${AUTH_COOKIE_NAME} in Set-Cookie`);
  }
  const token = cookieHeader.slice(`${AUTH_COOKIE_NAME}=`.length).split(';')[0];
  if (!token) {
    throw new Error(`Empty ${AUTH_COOKIE_NAME} value in Set-Cookie`);
  }
  return token;
}

export async function registerAndGetToken(app: INestApplication): Promise<string> {
  const { token } = await registerAndGetAuth(app);
  return token;
}

export async function registerAndGetAuth(
  app: INestApplication,
): Promise<{ token: string; userId: string }> {
  const username = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const response = await request(app.getHttpServer())
    .post(apiPath('/auth/register'))
    .send({
      username,
      password: 'secret123',
    })
    .expect(201);

  expect(response.body.user).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      username,
      email: '',
    }),
  );

  const token = parseTokenFromSetCookie(response.headers['set-cookie']);
  return { token, userId: response.body.user.id as string };
}
