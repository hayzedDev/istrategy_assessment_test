import { Merchant } from '../src/auth/entities';
import { PaymentMethod } from '../src/payment/entities';
import { EPaymentMethodType } from '../src/common/enums';
import { Repository } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Payment } from '../src/payment/entities';
import { PaymentStatus } from '../src/payment/entities/payment.entity';

/**
 * Setup test data for e2e tests
 */
export async function setupTestData(app: INestApplication) {
  // Get repositories
  const merchantRepo = app.get<Repository<Merchant>>(
    getRepositoryToken(Merchant),
  );
  const paymentMethodRepo = app.get<Repository<PaymentMethod>>(
    getRepositoryToken(PaymentMethod),
  );
  const paymentRepo = app.get<Repository<Payment>>(
    getRepositoryToken(Payment),
  );

  // Create test merchant
  const merchant = await merchantRepo.save({
    name: 'Test Merchant',
    email: 'test@example.com',
    password: 'password-hash',
    isActive: true,
  });

  // Create test payment method
  const paymentMethod = await paymentMethodRepo.save({
    name: 'Test Credit Card',
    type: EPaymentMethodType.CREDIT_CARD,
    merchantId: merchant.id,
    configuration: {
      cardNumber: '4242424242424242',
      expiryMonth: '12',
      expiryYear: '2025',
    },
    active: true,
  });

  // Create a test payment
  const payment = await paymentRepo.save({
    reference: 'TEST-REFERENCE',
    amount: 100.5,
    currency: 'USD',
    status: PaymentStatus.PENDING,
    merchant,
    paymentMethod,
    metadata: {
      testData: true,
    }
  });

  return {
    merchant,
    paymentMethod,
    payment,
  };
}
