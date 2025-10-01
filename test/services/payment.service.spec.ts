import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentService } from '../../src/payment/services/payment.service';
import { Payment } from '../../src/payment/entities/payment.entity';
import { EPaymentStatus } from '../../src/common/enums';
import { Merchant } from '../../src/auth/entities/merchant.entity';
import { PaymentMethod } from '../../src/payment/entities/payment-method.entity';
import { SqsService } from '../../src/sqs/sqs.service';
import { Repository } from 'typeorm';
import { CreatePaymentDto } from 'src/payment/dto/payment.dto';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: Repository<Payment>;
  let merchantRepository: Repository<Merchant>;
  let paymentMethodRepository: Repository<PaymentMethod>;
  let sqsService: SqsService;

  const mockPaymentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockMerchantRepository = {
    findOne: jest.fn(),
  };

  const mockPaymentMethodRepository = {
    findOne: jest.fn(),
  };

  const mockSqsService = {
    publishPaymentEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
        {
          provide: getRepositoryToken(PaymentMethod),
          useValue: mockPaymentMethodRepository,
        },
        {
          provide: SqsService,
          useValue: mockSqsService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get<Repository<Payment>>(
      getRepositoryToken(Payment),
    );
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
    paymentMethodRepository = module.get<Repository<PaymentMethod>>(
      getRepositoryToken(PaymentMethod),
    );
    sqsService = module.get<SqsService>(SqsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializePayment', () => {
    it('should create a new payment and publish event', async () => {
      // Arrange
      const userId = 'user-123';
      const paymentMethodId = 'payment-method-123';

      const merchant = {
        id: userId,
        name: 'Test Merchant',
        email: 'test@example.com',
      } as Merchant;

      const paymentMethod = {
        id: paymentMethodId,
        name: 'Credit Card',
      } as PaymentMethod;

      const createPaymentDto: CreatePaymentDto = {
        amount: 100,
        currency: 'USD',
        paymentMethodId,
      };

      const paymentToSave = {
        reference: 'PAY-123456',
        amount: 100,
        currency: 'USD',
        status: EPaymentStatus.PENDING,
        merchant,
        paymentMethod,
      } as unknown as Payment;

      const savedPayment = {
        id: 'payment-123',
        ...paymentToSave,
      } as Payment;

      mockMerchantRepository.findOne.mockResolvedValue(merchant);
      mockPaymentMethodRepository.findOne.mockResolvedValue(paymentMethod);
      mockPaymentRepository.create.mockReturnValue(paymentToSave);
      mockPaymentRepository.save.mockResolvedValue(savedPayment);
      mockSqsService.publishPaymentEvent.mockResolvedValue({});

      // Act
      const result = await service.initializePayment(userId, createPaymentDto);

      // Assert
      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(paymentMethodRepository.findOne).toHaveBeenCalledWith({
        where: { id: paymentMethodId, merchantId: userId },
      });
      expect(paymentRepository.create).toHaveBeenCalled();
      expect(paymentRepository.save).toHaveBeenCalledWith(paymentToSave);
      expect(sqsService.publishPaymentEvent).toHaveBeenCalled();

      // Just verify the essential fields without requiring full object equality
      expect(result.id).toEqual(savedPayment.id);
      expect(result.reference).toEqual(savedPayment.reference);
      expect(result.amount).toEqual(savedPayment.amount);
      expect(result.currency).toEqual(savedPayment.currency);
      expect(result.status).toEqual(savedPayment.status);
    });

    it('should throw error if user does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const createPaymentDto: CreatePaymentDto = {
        amount: 100,
        currency: 'USD',
        paymentMethodId: 'payment-method-123',
      };

      mockMerchantRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.initializePayment(userId, createPaymentDto),
      ).rejects.toThrow();
    });
  });

  // Additional tests for other methods would go here...
});
