import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { AppService } from '../../src/app.service';

describe('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('AppService returns health status', () => {
    const appService = app.get(AppService);
    const health = appService.getHealth();
    expect(health.status).toBe('ok');
    expect(health.service).toBe('infinity-server');
  });
});
