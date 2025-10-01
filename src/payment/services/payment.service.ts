import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Payment } from '../entities';
import { Merchant } from '../../auth/entities';
import { PaymentMethod } from '../entities';
import { CreatePaymentDto, UpdatePaymentStatusDto } from '../dto';
import { SqsService } from '../../sqs/sqs.service';
import { PaymentEventMessage } from '../../common/interfaces';
import { EPaymentStatus } from '../../common/enums';
import { PaginatedResponse } from 'src/common/responses';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    private readonly sqsService: SqsService,
  ) {}

  /**
   * Initialize a new payment
   * @param createPaymentDto Payment creation data
   * @returns The created payment
   */
  async initializePayment(
    merchantId: string,
    createPaymentDto: CreatePaymentDto,
  ): Promise<Payment> {
    // Check if merchant exists
    const merchant = await this.merchantRepository.findOne({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant with ID ${merchantId} not found`);
    }

    // Check if payment method exists - use createPaymentDto.paymentMethodId instead of merchantId
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: {
        id: createPaymentDto.paymentMethodId,
        merchantId: merchantId,
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException(
        `Payment method with ID ${createPaymentDto.paymentMethodId} not found for this merchant`,
      );
    }

    // Generate a unique payment reference
    const reference = `PAY-${uuidv4().split('-')[0].toUpperCase()}`;

    // Create the payment entity
    const payment = this.paymentRepository.create({
      reference,
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency || 'USD',
      status: EPaymentStatus.PENDING,
      metadata: createPaymentDto.metadata || {},
      merchant,
      paymentMethod,
    });

    // Save the payment
    const savedPayment = await this.paymentRepository.save(payment);

    // Publish payment initiated event
    await this.publishPaymentInitiatedEvent(savedPayment);

    return this.mapPaymentToResponse(savedPayment);
  }

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
   * Get payment by reference
   * @param reference Payment reference
   * @returns The payment
   */
  async getPaymentByReference(
    reference: string,
    merchantId: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { reference },
      relations: ['merchant', 'paymentMethod'],
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment with reference ${reference} not found`,
      );
    }

    // Check if the payment belongs to the authenticated merchant
    if (payment.merchant.id !== merchantId) {
      throw new Error('Unauthorized: You can only access your own payments');
    }

    return this.mapPaymentToResponse(payment);
  }

  // Add this method to the PaymentService class
  async getMerchantPaymentsPaginated(
    merchant: Merchant,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<any>> {
    const merchantId = merchant.id;

    const [payments, total] = await this.paymentRepository.findAndCount({
      where: { merchant: { id: merchantId } },
      relations: ['paymentMethod'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const pageCount = Math.ceil(total / limit);

    return {
      data: payments.map((payment) => this.mapPaymentToResponse(payment)),
      meta: {
        total,
        page,
        limit,
        pageCount,
      },
    };
  }
  async getMerchantPaymentMethods(merchant: Merchant) {
    const merchantId = merchant.id;

    const paymentMethods = await this.paymentMethodRepository.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });

    // Mask sensitive data in payment method configurations
    const sanitizedPaymentMethods = paymentMethods.map((method) => {
      const config = { ...method.configuration };

      // Mask card numbers if present
      if (config.cardNumber) {
        // If the cardNumber is already just the last 4 digits, keep it as is
        if (config.cardNumber.length > 4) {
          config.cardNumber = config.cardNumber.replace(/\d(?=\d{4})/g, '*');
        }
      }

      // Mask bank account numbers if present
      if (config.accountNumber) {
        // If the accountNumber is already just the last 4 digits, keep it as is
        if (config.accountNumber.length > 4) {
          config.accountNumber = config.accountNumber.replace(
            /\d(?=\d{4})/g,
            '*',
          );
        }
      }

      // Mask routing numbers if present
      if (config.routingNumber) {
        // If the routingNumber is already just the last 4 digits, keep it as is
        if (config.routingNumber.length > 4) {
          config.routingNumber = config.routingNumber.replace(
            /\d(?=\d{4})/g,
            '*',
          );
        }
      }

      return {
        ...method,
        configuration: config,
      };
    });

    return {
      paymentMethods: sanitizedPaymentMethods,
      total: paymentMethods.length,
    };
  }

  /**
   * Publish a payment initiated event to SQS
   * @param payment The payment that was initiated
   */
  private async publishPaymentInitiatedEvent(payment: Payment): Promise<void> {
    const eventMessage: PaymentEventMessage = {
      eventType: 'payment-initiated',
      timestamp: new Date().toISOString(),
      paymentId: payment.id,
      reference: payment.reference,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      merchantId: payment.merchant.id,
      metadata: payment.metadata,
    };

    await this.sqsService.publishPaymentEvent(eventMessage);
  }
}
