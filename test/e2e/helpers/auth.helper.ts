import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { apiPath } from './create-e2e-app';

export async function registerAndGetToken(app: INestApplication): Promise<string> {
  const username = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const response = await request(app.getHttpServer())
    .post(apiPath('/auth/register'))
    .send({
      username,
      password: 'secret123',
    })
    .expect(201);

  return response.body.access_token as string;
}
