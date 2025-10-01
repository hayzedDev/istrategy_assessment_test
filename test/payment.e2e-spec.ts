import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { PaymentStatus } from '../src/payment/entities/payment.entity';
import { getDatabaseConfig } from '../src/common/config/database.config';
import { setupTestData } from './payment.e2e-setup';
import { SqsService } from '../src/sqs/sqs.service';
import { MockSqsService } from './mocks/sqs.service.mock';

// Create mock data for a consistent test environment
const TEST_MERCHANT_ID = 'bb095a12-cd42-4e8e-944d-be1fd229bfab';
const TEST_PAYMENT_METHOD_ID = 'a77c8823-9607-42b9-921d-b62bbb9e2182';
const TEST_PAYMENT_REFERENCE = 'TEST-REFERENCE';

// Mock the auth guard to add our merchant to the request
jest.mock('../src/auth/guards', () => {
  return {
    AuthenticationGuard: jest.fn().mockImplementation(() => ({
      canActivate: jest.fn().mockImplementation((context) => {
        // Add merchant data to the request
        const request = context.switchToHttp().getRequest();
        request.merchant = {
          id: TEST_MERCHANT_ID,
          email: 'test@example.com',
        };
        return true;
      }),
    })),
  };
});

// Mock the SQS service to avoid actual AWS calls
jest.mock('../src/sqs/sqs.service', () => {
  return {
    SqsService: jest.fn().mockImplementation(() => ({
      publishPaymentEvent: jest
        .fn()
        .mockResolvedValue({ MessageId: 'mock-message-id' }),
    })),
  };
});

// Create mock responses for payment service
const mockPaymentResponse = {
  id: 'payment-123',
  reference: TEST_PAYMENT_REFERENCE,
  amount: 100.5,
  currency: 'USD',
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PaymentController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    authToken = 'test-api-key';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test', // Use a test environment file
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const dbConfig = getDatabaseConfig(configService);
            return {
              ...dbConfig,
              synchronize: true, // Force synchronize for tests
              dropSchema: true, // Drop schema for clean tests
            };
          },
        }),
        AppModule,
      ],
    })
      // Override the SQS service with our mock class
      .overrideProvider(SqsService)
      .useClass(MockSqsService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    try {
      // Setup test data
      await setupTestData(app);
    } catch (error) {
      console.error('Failed to set up test data:', error);
    }
  });

  afterAll(async () => {
    if (app) {
      // Properly close all connections
      await app.close();
    }

    // Add a delay to allow all connections to fully close
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Close all remaining handles
    jest.resetAllMocks();
  });

  describe('/payments (POST)', () => {
    it('should create a new payment', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100.5,
          currency: 'USD',
          paymentMethodId: TEST_PAYMENT_METHOD_ID,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('reference');
          expect(res.body.status).toBe(PaymentStatus.PENDING);
        });
    });

    it('should fail with invalid payment data', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          currency: 'USD',
        })
        .expect(400);
    });
  });

  describe('/payments/:reference (GET)', () => {
    it('should return payment details by reference', () => {
      return request(app.getHttpServer())
        .get(`/payments/${TEST_PAYMENT_REFERENCE}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('reference', TEST_PAYMENT_REFERENCE);
        });
    });

    it('should return 404 for non-existent payment reference', () => {
      return request(app.getHttpServer())
        .get('/payments/NON-EXISTENT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/webhooks/payment/:reference (POST)', () => {
    // Increase timeout for webhook test
    it('should update payment status via webhook', () => {
      jest.setTimeout(15000); // 15 seconds timeout
      return request(app.getHttpServer())
        .post(
          `/webhooks/payment/ndsiuhfjwmpeoimfesdfs/${TEST_PAYMENT_REFERENCE}`,
        ) // Correct path from webhook controller
        .set('X-Webhook-Signature', 'test-signature')
        .send({
          gatewayReference: 'GATEWAY-123',
          status: PaymentStatus.COMPLETED,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', PaymentStatus.COMPLETED);
        });
    });

    it('should reject webhook without signature', () => {
      return request(app.getHttpServer())
        .post(
          `/webhooks/payment/ndsiuhfjwmpeoimfesdfs/${TEST_PAYMENT_REFERENCE}`,
        ) // Correct path from webhook controller
        .send({
          gatewayReference: 'GATEWAY-123',
          status: PaymentStatus.COMPLETED,
        })
        .expect(400); // Service throws BadRequestException for missing signature
    });
  });
});
