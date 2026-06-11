import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { apiPath } from './create-e2e-app';

export function getUserIdFromToken(token: string): string {
  const [, payloadPart] = token.split('.');
  const json = Buffer.from(payloadPart, 'base64url').toString('utf8');
  return (JSON.parse(json) as { sub: string }).sub;
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
    .expect(200);

  const token = response.body.access_token as string;
  return { token, userId: getUserIdFromToken(token) };
}
