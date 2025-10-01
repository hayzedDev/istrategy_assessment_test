import { ApiProperty } from '@nestjs/swagger';
import { EPaymentMethodType } from '../enums';

export class PaymentMethodResponse {
  @ApiProperty({
    description: 'Payment Method ID',
    example: '12345678-1234-1234-1234-123456789012',
  })
  id: string;

  @ApiProperty({
    description: 'Payment Method name',
    example: 'Visa Card',
  })
  name: string;

  @ApiProperty({
    description: 'Payment Method type',
    enum: EPaymentMethodType,
    example: EPaymentMethodType.CREDIT_CARD,
  })
  type: EPaymentMethodType;

  @ApiProperty({
    description: 'Whether the payment method is active',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: 'Payment Method configuration',
    example: {
      provider: 'STRIPE',
      cardNumber: '************4242',
      expiryMonth: '12',
      expiryYear: '2030',
    },
  })
  configuration: Record<string, any>;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-09-30T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-09-30T12:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Merchant ID',
    example: '12345678-1234-1234-1234-123456789012',
  })
  merchantId: string;
}

export class PaymentMethodsListResponse {
  @ApiProperty({
    description: 'List of payment methods',
    type: [PaymentMethodResponse],
  })
  paymentMethods: PaymentMethodResponse[];

  @ApiProperty({
    description: 'Total number of payment methods',
    example: 3,
  })
  total: number;
}
