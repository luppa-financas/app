import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AUTH_CLIENT } from '../src/auth/auth.constants';

const mockVerifyToken = jest.fn();

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_CLIENT)
      .useValue({ verifyToken: mockVerifyToken })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /health without token → 200 (public route)', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  it('GET /health with invalid token → 200 (public route ignores token)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .set('Authorization', 'Bearer bad-token')
      .expect(200);
  });

  it('protected route without token → 401', () => {
    return request(app.getHttpServer()).get('/').expect(401);
  });

  it('protected route with invalid token → 401', () => {
    mockVerifyToken.mockRejectedValue(new Error('Invalid token'));

    return request(app.getHttpServer())
      .get('/')
      .set('Authorization', 'Bearer bad-token')
      .expect(401);
  });
});
