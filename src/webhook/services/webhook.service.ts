import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../payment/entities';
import { SqsService } from '../../sqs/sqs.service';
import { EPaymentStatus } from '../../common/enums';
import { PaymentWebhookDto } from '../dto';
import { PaymentEventMessage } from '../../common/interfaces';

@Injectable()
export class WebhookService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly sqsService: SqsService,
  ) {}

  /**
   * Process a payment webhook
   * @param signature Webhook signature for verification
   * @param reference Payment reference
   * @param webhookDto Webhook payload
   * @returns Updated payment
   */
  async processPaymentWebhook(
    signature: string,
    reference: string,
    webhookDto: PaymentWebhookDto,
  ): Promise<Payment> {
    // In a production environment, we should verify the webhook signature
    // For this assessment, we'll just check if it exists
    if (!signature) {
      throw new BadRequestException('Webhook signature missing');
    }

    // Find the payment by reference
    const payment = await this.paymentRepository.findOne({
      where: { reference },
      relations: ['merchant'],
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment with reference ${reference} not found`,
      );
    }

    // Check if payment is already in a terminal state (COMPLETED or FAILED); "idempotency"
    if (
      payment.status === EPaymentStatus.COMPLETED ||
      payment.status === EPaymentStatus.FAILED
    ) {
      // Return the existing payment without modifying it
      // This ensures idempotency for payments that have reached a final state
      console.log(
        `Payment ${reference} is already in terminal state: ${payment.status}. No updates will be applied.`,
      );
      return this.mapPaymentToResponse(payment);
    }

    // Update payment fields
    payment.status = webhookDto.status;
    payment.gatewayReference = webhookDto.gatewayReference;
    payment.gatewayResponseCode = webhookDto.gatewayResponseCode;
    payment.errorMessage = webhookDto.errorMessage;

    // If there's additional metadata, merge it with existing metadata
    if (webhookDto.metadata) {
      payment.metadata = {
        ...payment.metadata,
        ...webhookDto.metadata,
      };
    }

    // If payment is completed, set the completedAt timestamp
    if (payment.status === EPaymentStatus.COMPLETED) {
      payment.completedAt = new Date();
    }

    // Save the updated payment
    const updatedPayment = await this.paymentRepository.save(payment);

    // Publish event based on status
    await this.publishPaymentStatusChangeEvent(updatedPayment);

    return this.mapPaymentToResponse(updatedPayment);
  }

  /**
   * Map payment entity to simplified response format
   * @param payment The full payment entity
   * @returns Simplified payment response
   */
  private mapPaymentToResponse(payment: Payment): any {
    return {
      id: payment.id,
      reference: payment.reference,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /**
   * Publish payment status change event to SQS
   * @param payment The payment with updated status
   */
  private async publishPaymentStatusChangeEvent(
    payment: Payment,
  ): Promise<void> {
    const eventType =
      payment.status === EPaymentStatus.COMPLETED
        ? 'payment-completed'
        : payment.status === EPaymentStatus.FAILED
          ? 'payment-failed'
          : 'payment-initiated';

    const eventMessage: PaymentEventMessage = {
      eventType,
      timestamp: new Date().toISOString(),
      paymentId: payment.id,
      reference: payment.reference,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      merchantId: payment.merchant.id,
      metadata: payment.metadata,
      gatewayReference: payment.gatewayReference,
      errorMessage: payment.errorMessage,
    };

    await this.sqsService.publishPaymentEvent(eventMessage);
  }
}
