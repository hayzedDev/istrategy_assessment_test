import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Payment } from '../../payment/entities/payment.entity';
import { SqsService } from '../../sqs/sqs.service';
import { PaymentWebhookDto } from '../dto/webhook.dto';
import { EPaymentStatus } from '../../common/enums';

const mockPaymentRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
});

const mockSqsService = () => ({
  publishPaymentEvent: jest.fn().mockResolvedValue({}),
});

describe('WebhookService', () => {
  let service: WebhookService;
  let paymentRepository: Repository<Payment>;
  let sqsService: SqsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: getRepositoryToken(Payment),
          useFactory: mockPaymentRepository,
        },
        { provide: SqsService, useFactory: mockSqsService },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    paymentRepository = module.get<Repository<Payment>>(
      getRepositoryToken(Payment),
    );
    sqsService = module.get<SqsService>(SqsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processPaymentWebhook', () => {
    it('should update payment status and return updated payment', async () => {
      // Arrange
      const signature = 'test-signature';
      const reference = 'PAY-123';
      const webhookDto: PaymentWebhookDto = {
        status: EPaymentStatus.COMPLETED,
        gatewayReference: 'gateway-123',
        gatewayResponseCode: '00',
        metadata: {
          processorId: 'proc-123',
        },
      };

      const mockPayment = {
        id: 'pay-123',
        reference,
        amount: 100.5,
        currency: 'USD',
        status: EPaymentStatus.PENDING,
        merchant: { id: 'merchant-123' },
        metadata: {
          orderId: '789',
          customerEmail: 'customer@example.com',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedPayment = {
        ...mockPayment,
        status: EPaymentStatus.COMPLETED,
        gatewayReference: 'gateway-123',
        gatewayResponseCode: '00',
        metadata: {
          ...mockPayment.metadata,
          processorId: 'proc-123',
        },
        completedAt: expect.any(Date),
      };

      jest
        .spyOn(paymentRepository, 'findOne')
        .mockResolvedValue(mockPayment as any);
      jest
        .spyOn(paymentRepository, 'save')
        .mockResolvedValue(updatedPayment as any);

      // Act
      const result = await service.processPaymentWebhook(
        signature,
        reference,
        webhookDto,
      );

      // Assert
      expect(result).toEqual({
        id: 'pay-123',
        reference,
        amount: 100.5,
        currency: 'USD',
        status: EPaymentStatus.COMPLETED,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(sqsService.publishPaymentEvent).toHaveBeenCalled();
    });

    it('should not update payment that is already in terminal state', async () => {
      // Arrange
      const signature = 'test-signature';
      const reference = 'PAY-123';
      const webhookDto: PaymentWebhookDto = {
        status: EPaymentStatus.FAILED,
        errorMessage: 'Duplicate webhook',
        gatewayReference: 'gateway-456', // Add the missing required property
      };

      const mockPayment = {
        id: 'pay-123',
        reference,
        amount: 100.5,
        currency: 'USD',
        status: EPaymentStatus.COMPLETED, // Already in terminal state
        merchant: { id: 'merchant-123' },
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      };

      jest
        .spyOn(paymentRepository, 'findOne')
        .mockResolvedValue(mockPayment as any);
      const saveSpy = jest.spyOn(paymentRepository, 'save');

      // Act
      const result = await service.processPaymentWebhook(
        signature,
        reference,
        webhookDto,
      );

      // Assert
      expect(result).toEqual({
        id: 'pay-123',
        reference,
        amount: 100.5,
        currency: 'USD',
        status: EPaymentStatus.COMPLETED,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(saveSpy).not.toHaveBeenCalled(); // Should not call save
      expect(sqsService.publishPaymentEvent).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when payment is not found', async () => {
      // Arrange
      const signature = 'test-signature';
      const reference = 'nonexistent';

      const webhookDto: PaymentWebhookDto = {
        status: EPaymentStatus.COMPLETED,
        gatewayReference: 'gateway-456',
      };

      jest.spyOn(paymentRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.processPaymentWebhook(signature, reference, webhookDto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
