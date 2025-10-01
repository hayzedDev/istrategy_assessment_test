import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Payment } from '../entities/payment.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { Merchant } from '../../auth/entities/merchant.entity';
import { SqsService } from '../../sqs/sqs.service';
import { EPaymentMethodType, EPaymentStatus } from '../../common/enums';

const mockPaymentRepository = () => ({
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
});

const mockPaymentMethodRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
});

const mockMerchantRepository = () => ({
  findOne: jest.fn(),
});

const mockSqsService = () => ({
  publishPaymentEvent: jest.fn().mockResolvedValue({}),
});

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: Repository<Payment>;
  let paymentMethodRepository: Repository<PaymentMethod>;
  let merchantRepository: Repository<Merchant>;
  let sqsService: SqsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useFactory: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(PaymentMethod),
          useFactory: mockPaymentMethodRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useFactory: mockMerchantRepository,
        },
        { provide: SqsService, useFactory: mockSqsService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get<Repository<Payment>>(
      getRepositoryToken(Payment),
    );
    paymentMethodRepository = module.get<Repository<PaymentMethod>>(
      getRepositoryToken(PaymentMethod),
    );
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
    sqsService = module.get<SqsService>(SqsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializePayment', () => {
    it('should create and return a new payment', async () => {
      // Arrange
      const merchantId = '123';
      const createPaymentDto = {
        amount: 100.5,
        currency: 'USD',
        paymentMethodId: '456',
        metadata: {
          orderId: '789',
          customerEmail: 'customer@example.com',
        },
      };

      const mockMerchant = {
        id: merchantId,
        name: 'Test Merchant',
      } as Merchant;
      const mockPaymentMethod = {
        id: '456',
        type: EPaymentMethodType.CREDIT_CARD,
        name: 'Test Card',
      } as PaymentMethod;

      const mockPayment = {
        id: 'pay123',
        reference: 'PAY-123456',
        amount: 100.5,
        currency: 'USD',
        status: EPaymentStatus.PENDING,
        merchant: mockMerchant,
        paymentMethod: mockPaymentMethod,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant);
      jest
        .spyOn(paymentMethodRepository, 'findOne')
        .mockResolvedValue(mockPaymentMethod);
      jest
        .spyOn(paymentRepository, 'create')
        .mockReturnValue(mockPayment as any);
      jest
        .spyOn(paymentRepository, 'save')
        .mockResolvedValue(mockPayment as any);

      // Act
      const result = await service.initializePayment(
        merchantId,
        createPaymentDto,
      );

      // Assert
      expect(result).toEqual({
        id: 'pay123',
        reference: 'PAY-123456',
        amount: 100.5,
        currency: 'USD',
        status: EPaymentStatus.PENDING,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(sqsService.publishPaymentEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException when merchant is not found', async () => {
      // Arrange
      const merchantId = 'nonexistent';
      const createPaymentDto = {
        amount: 100,
        currency: 'USD',
        paymentMethodId: '456',
      };

      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.initializePayment(merchantId, createPaymentDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPaymentByReference', () => {
    it('should return payment when found', async () => {
      // Arrange
      const reference = 'PAY-123';
      const merchantId = '123';

      const mockPayment = {
        id: 'pay123',
        reference,
        amount: 100.5,
        currency: 'USD',
        status: EPaymentStatus.PENDING,
        merchant: { id: merchantId },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(paymentRepository, 'findOne')
        .mockResolvedValue(mockPayment as any);

      // Act
      const result = await service.getPaymentByReference(reference, merchantId);

      // Assert
      expect(result).toEqual({
        id: 'pay123',
        reference,
        amount: 100.5,
        currency: 'USD',
        status: EPaymentStatus.PENDING,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException when payment is not found', async () => {
      // Arrange
      const reference = 'nonexistent';
      const merchantId = '123';

      jest.spyOn(paymentRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getPaymentByReference(reference, merchantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMerchantPaymentMethods', () => {
    it('should return payment methods with masked sensitive data', async () => {
      // Arrange
      const merchant = { id: '123' } as Merchant;
      // Create a mock merchant for associations
      const mockMerchant = {
        id: '123',
        name: 'Test Merchant',
        email: 'merchant@example.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Merchant;

      const mockPaymentMethods = [
        {
          id: 'pm1',
          type: EPaymentMethodType.CREDIT_CARD,
          name: 'Visa Card',
          configuration: {
            cardNumber: '************4242', // Use full card number with masking format
            expiryMonth: '12',
            expiryYear: '2025',
          },
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          merchantId: '123',
          merchant: mockMerchant,
        },
        {
          id: 'pm2',
          type: EPaymentMethodType.BANK_TRANSFER,
          name: 'Bank Account',
          configuration: {
            accountNumber: '********6789', // Use full account number with masking format
            routingNumber: '********5678', // Use full routing number with masking format
          },
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          merchantId: '123',
          merchant: mockMerchant,
        },
      ];

      jest
        .spyOn(paymentMethodRepository, 'find')
        .mockResolvedValue(mockPaymentMethods as unknown as PaymentMethod[]);

      // Act
      const result = await service.getMerchantPaymentMethods(merchant);

      // Assert
      expect(result).toEqual({
        paymentMethods: [
          {
            id: 'pm1',
            type: EPaymentMethodType.CREDIT_CARD,
            name: 'Visa Card',
            configuration: {
              cardNumber: '************4242',
              expiryMonth: '12',
              expiryYear: '2025',
            },
            active: true,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            merchantId: '123',
            merchant: expect.any(Object),
          },
          {
            id: 'pm2',
            type: EPaymentMethodType.BANK_TRANSFER,
            name: 'Bank Account',
            configuration: {
              accountNumber: '********6789',
              routingNumber: '********5678',
            },
            active: true,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            merchantId: '123',
            merchant: expect.any(Object),
          },
        ],
        total: 2,
      });
    });
  });
});
