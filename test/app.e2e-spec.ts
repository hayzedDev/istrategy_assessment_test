import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { SqsService } from '../src/sqs/sqs.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Override the SQS service with our mock
      .overrideProvider(SqsService)
      .useValue({
        publishPaymentEvent: jest
          .fn()
          .mockResolvedValue({ MessageId: 'mock-message-id' }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    // Make sure to apply all pipes and middleware that the main.ts would apply
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    // Don't set global prefix for e2e tests to match main.ts configuration
    app.setGlobalPrefix('v1', { exclude: ['health'] });
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }

    // Add a delay to allow all connections to fully close
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Close all remaining handles
    jest.resetAllMocks();
  });
});
