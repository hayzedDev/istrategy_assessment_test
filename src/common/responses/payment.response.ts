import { ApiProperty } from '@nestjs/swagger';
import { EPaymentStatus } from '../enums';

export class PaymentResponse {
  @ApiProperty({
    description: 'Payment ID',
    example: '12345678-1234-1234-1234-123456789012',
  })
  id: string;

  @ApiProperty({
    description: 'Payment reference number',
    example: 'PAY-123456789',
  })
  reference: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 100.5,
  })
  amount: number;

  @ApiProperty({
    description: 'Payment currency',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Payment status',
    enum: EPaymentStatus,
    example: EPaymentStatus.PENDING,
  })
  status: EPaymentStatus;

  @ApiProperty({
    description: 'Merchant ID',
    example: '12345678-1234-1234-1234-123456789012',
  })
  merchantId: string;

  @ApiProperty({
    description: 'Payment Method ID',
    example: '12345678-1234-1234-1234-123456789012',
  })
  paymentMethodId: string;

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
    description: 'Completion timestamp',
    example: '2025-09-30T12:05:00Z',
    nullable: true,
  })
  completedAt: Date | null;

  @ApiProperty({
    description: 'Gateway reference',
    example: 'GATEWAY-123456',
    nullable: true,
  })
  gatewayReference: string | null;

  @ApiProperty({
    description: 'Gateway response code',
    example: '00',
    nullable: true,
  })
  gatewayResponseCode: string | null;

  @ApiProperty({
    description: 'Error message',
    example: 'Insufficient funds',
    nullable: true,
  })
  errorMessage: string | null;

  @ApiProperty({
    description: 'Additional metadata',
    example: {
      orderId: '123456',
      customerEmail: 'customer@example.com',
    },
    nullable: true,
  })
  metadata: Record<string, any> | null;
}

export class PaymentListResponse {
  @ApiProperty({
    description: 'List of payments',
    type: [PaymentResponse],
  })
  payments: PaymentResponse[];

  @ApiProperty({
    description: 'Total number of payments',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: 'Current page',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of payments per page',
    example: 10,
  })
  limit: number;
}

export class PaymentInitiatedResponse {
  @ApiProperty({
    description: 'Payment ID',
    example: '12345678-1234-1234-1234-123456789012',
  })
  id: string;

  @ApiProperty({
    description: 'Payment reference number',
    example: 'PAY-123456789',
  })
  reference: string;

  @ApiProperty({
    description: 'Payment status',
    enum: EPaymentStatus,
    example: EPaymentStatus.PENDING,
  })
  status: EPaymentStatus;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-09-30T12:00:00Z',
  })
  createdAt: Date;
}

export class WebhookResponse {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Updated payment reference',
    example: 'PAY-123456789',
  })
  reference: string;

  @ApiProperty({
    description: 'New payment status',
    enum: EPaymentStatus,
    example: EPaymentStatus.COMPLETED,
  })
  status: EPaymentStatus;

  @ApiProperty({
    description: 'Timestamp of update',
    example: '2025-09-30T12:05:00Z',
  })
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pageCount: number;
  };
}
