import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../src/app.module';
import { SocketAdapter } from '../../../src/modules/socket/socket.adapter';

export const E2E_GLOBAL_PREFIX = 'infinity';

export async function createE2eApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(E2E_GLOBAL_PREFIX);
  app.enableCors({
    origin: '*',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe());
  app.useWebSocketAdapter(new SocketAdapter(app));
  await app.init();
  await app.listen(0);
  return app;
}

export function getAppPort(app: INestApplication): number {
  const address = app.getHttpServer().address();
  if (!address || typeof address === 'string') {
    throw new Error('Unable to resolve e2e app port');
  }
  return address.port;
}

export function apiPath(path: string): string {
  return `/${E2E_GLOBAL_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
}

export const shouldRunE2e = (): boolean => process.env.RUN_E2E === '1';
