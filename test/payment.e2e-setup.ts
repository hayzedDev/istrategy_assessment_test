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
  const paymentRepo = app.get<Repository<Payment>>(getRepositoryToken(Payment));

  // Get test constants from the spec file
  const TEST_MERCHANT_ID = 'bb095a12-cd42-4e8e-944d-be1fd229bfab';
  const TEST_PAYMENT_METHOD_ID = 'a77c8823-9607-42b9-921d-b62bbb9e2182';
  const TEST_PAYMENT_REFERENCE = 'TEST-REFERENCE';

  // Create test merchant with predefined ID
  const merchant = await merchantRepo.save({
    id: TEST_MERCHANT_ID,
    name: 'Test Merchant',
    email: 'test@example.com',
    password: 'password-hash',
    isActive: true,
  });

  // Create test payment method with predefined ID
  const paymentMethod = await paymentMethodRepo.save({
    id: TEST_PAYMENT_METHOD_ID,
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

  // Create a test payment with predefined reference
  const payment = await paymentRepo.save({
    reference: TEST_PAYMENT_REFERENCE,
    amount: 100.5,
    currency: 'USD',
    status: PaymentStatus.PENDING,
    merchant,
    paymentMethod,
    metadata: {
      testData: true,
    },
  });

  return {
    merchant,
    paymentMethod,
    payment,
  };
}
