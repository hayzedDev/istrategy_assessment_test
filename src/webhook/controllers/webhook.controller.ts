import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

import { PaymentResponseDto } from 'src/payment/dto';
import { WebhookService } from '../services';
import { PaymentWebhookDto } from '../dto';

@ApiTags('Webhooks')
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: 'Internal server error',
})
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @ApiOperation({ summary: 'Process payment status webhook' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The payment status has been updated.',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  @ApiHeader({
    name: 'x-webhook-signature',
    description: 'Webhook signature for verification',
    required: true,
  })
  @Post('payment/ndsiuhfjwmpeoimfesdfs/:reference')
  @HttpCode(HttpStatus.OK)
  async processPaymentWebhook(
    @Param('reference') reference: string,
    @Body() webhookDto: PaymentWebhookDto,
    @Headers('x-webhook-signature') signature: string,
  ): Promise<any> {
    return this.webhookService.processPaymentWebhook(
      signature,
      reference,
      webhookDto,
    );
  }
}
