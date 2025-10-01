import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsUUID,
  Min,
  IsEnum,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EPaymentStatus } from '../../common/enums';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'The payment amount',
    example: 100.5,
    required: true,
  })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'The currency code (ISO 4217)',
    example: 'USD',
    default: 'USD',
  })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @ApiProperty({
    description: 'Payment Method ID',
    example: '12345678-1234-1234-1234-123456789012',
  })
  @IsUUID()
  @IsNotEmpty()
  paymentMethodId: string;

  @ApiProperty({
    description: 'Additional metadata for the payment',
    example: {
      orderId: '123456',
      customerEmail: 'customer@example.com',
      customerName: 'John Doe',
    },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class PaymentResponseDto {
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
    description: 'Creation timestamp',
    example: '2023-01-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-01-01T12:00:00Z',
  })
  updatedAt: Date;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({
    description: 'Payment reference from the gateway',
    example: 'GATEWAY-123456',
  })
  @IsString()
  @IsNotEmpty()
  gatewayReference: string;

  @ApiProperty({
    description: 'New payment status',
    enum: EPaymentStatus,
    example: EPaymentStatus.COMPLETED,
  })
  @IsEnum(EPaymentStatus)
  @IsNotEmpty()
  status: EPaymentStatus;

  @ApiProperty({
    description: 'Gateway response code',
    example: '00',
    required: false,
  })
  @IsString()
  @IsOptional()
  gatewayResponseCode?: string;

  @ApiProperty({
    description: 'Error message in case of failure',
    example: 'Insufficient funds',
    required: false,
  })
  @IsString()
  @IsOptional()
  errorMessage?: string;

  @ApiProperty({
    description: 'Additional metadata from gateway',
    example: {
      authCode: '123456',
      transactionId: 'TX123456',
    },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (starts from 1)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
