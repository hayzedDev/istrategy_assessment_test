import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { EPaymentStatus } from '../../common/enums';

export class PaymentWebhookDto {
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
