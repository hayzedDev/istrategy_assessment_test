import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { PaymentStatus } from '../src/payment/entities/payment.entity';
import { getDatabaseConfig } from '../src/common/config/database.config';

describe('PaymentController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    // This is a placeholder for generating a test auth token
    // In a real test, you would authenticate first
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
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    // Here you would set up test data (merchants, payment methods)
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/payments (POST)', () => {
    it('should create a new payment', () => {
      // This is a placeholder test that would need actual test data
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100.5,
          currency: 'USD',
          merchantId: 'test-merchant-id',
          paymentMethodId: 'test-payment-method-id',
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
      const paymentReference = 'TEST-REFERENCE'; // Would be from a created test payment

      return request(app.getHttpServer())
        .get(`/payments/${paymentReference}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('reference', paymentReference);
        });
    });

    it('should return 404 for non-existent payment reference', () => {
      return request(app.getHttpServer())
        .get('/payments/NON-EXISTENT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/payments/webhook/:reference (POST)', () => {
    it('should update payment status via webhook', () => {
      const paymentReference = 'TEST-REFERENCE'; // Would be from a created test payment

      return request(app.getHttpServer())
        .post(`/payments/webhook/${paymentReference}`)
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
      const paymentReference = 'TEST-REFERENCE';

      return request(app.getHttpServer())
        .post(`/payments/webhook/${paymentReference}`)
        .send({
          gatewayReference: 'GATEWAY-123',
          status: PaymentStatus.COMPLETED,
        })
        .expect(500); // In our simple implementation, this throws an Error
    });
  });
});
