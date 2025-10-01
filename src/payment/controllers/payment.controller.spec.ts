import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto } from '../dto/payment.dto';
import { RequestWithMerchant } from '../../common/interfaces';
import { EPaymentStatus, EPaymentMethodType } from '../../common/enums';
import { Merchant } from '../../auth/entities/merchant.entity';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '../../auth/services/jwt.service';
import { RedisService } from '@liaoliaots/nestjs-redis';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: PaymentService;

  beforeEach(async () => {
    const mockPaymentService = {
      initializePayment: jest.fn(),
      getMerchantPaymentMethods: jest.fn(),
      getMerchantPaymentsPaginated: jest.fn(),
      getPaymentByReference: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
        {
          provide: JwtService,
          useValue: {
            verifyToken: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn(),
            get clients() {
              return {
                get: jest.fn().mockReturnValue({
                  get: jest.fn().mockResolvedValue(null),
                }),
              };
            },
          },
        },
      ],
    })
      .overrideGuard('AuthenticationGuard')
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PaymentController>(PaymentController);
    paymentService = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initializePayment', () => {
    it('should call paymentService.initializePayment with correct params', async () => {
      // Arrange
      const mockRequest = {
        merchant: { id: 'merchant-123' },
      } as RequestWithMerchant;

      const createPaymentDto: CreatePaymentDto = {
        amount: 100.5,
        currency: 'USD',
        paymentMethodId: 'pm-123',
        metadata: {
          orderId: 'order-123',
          customerEmail: 'customer@example.com',
        },
      };

      const mockPayment = {
        id: 'payment-123',
        reference: 'PAY-123456',
        status: EPaymentStatus.PENDING,
        amount: 100.5,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(paymentService, 'initializePayment')
        .mockResolvedValue(mockPayment as any);

      // Act
      const result = await controller.initializePayment(
        mockRequest,
        createPaymentDto,
        '127.0.0.1',
      );

      // Assert
      expect(result).toBe(mockPayment);
      expect(paymentService.initializePayment).toHaveBeenCalledWith(
        'merchant-123',
        {
          ...createPaymentDto,
          metadata: {
            ...createPaymentDto.metadata,
            ipAddress: '127.0.0.1',
          },
        },
      );
    });
  });

  describe('getMerchantPaymentMethods', () => {
    it('should return payment methods for the merchant', async () => {
      // Arrange
      const mockRequest = {
        merchant: { id: 'merchant-123' },
      } as RequestWithMerchant;

      const mockMerchantData = {
        id: 'merchant-123',
        name: 'Test Merchant',
        email: 'merchant@example.com',
        password: 'hashed_password',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Merchant;

      const mockPaymentMethods = {
        paymentMethods: [
          {
            id: 'pm-1',
            name: 'Credit Card',
            type: EPaymentMethodType.CREDIT_CARD,
            configuration: { cardNumber: '****4242' },
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            merchantId: 'merchant-123',
            merchant: mockMerchantData,
          },
          {
            id: 'pm-2',
            name: 'Bank Transfer',
            type: EPaymentMethodType.BANK_TRANSFER,
            configuration: { accountNumber: '****6789' },
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            merchantId: 'merchant-123',
            merchant: mockMerchantData,
          },
        ],
        total: 2,
      };

      jest
        .spyOn(paymentService, 'getMerchantPaymentMethods')
        .mockResolvedValue(mockPaymentMethods as any);

      // Act
      const result = await controller.getMerchantPaymentMethods(mockRequest);

      // Assert
      expect(result).toBe(mockPaymentMethods);
      expect(paymentService.getMerchantPaymentMethods).toHaveBeenCalledWith(
        mockRequest.merchant,
      );
    });
  });

  describe('getMerchantPayments', () => {
    it('should return paginated payments for the merchant', async () => {
      // Arrange
      const mockRequest = {
        merchant: { id: 'merchant-123' },
      } as RequestWithMerchant;

      const paginationDto = { page: 2, limit: 10 };

      const mockPaginatedPayments = {
        data: [
          { id: 'pay-1', reference: 'PAY-001', amount: 100 },
          { id: 'pay-2', reference: 'PAY-002', amount: 200 },
        ],
        meta: {
          total: 25,
          page: 2,
          limit: 10,
          pageCount: 3,
        },
      };

      jest
        .spyOn(paymentService, 'getMerchantPaymentsPaginated')
        .mockResolvedValue(mockPaginatedPayments);

      // Act
      const result = await controller.getMerchantPayments(
        mockRequest,
        paginationDto,
      );

      // Assert
      expect(result).toBe(mockPaginatedPayments);
      expect(paymentService.getMerchantPaymentsPaginated).toHaveBeenCalledWith(
        mockRequest.merchant,
        2,
        10,
      );
    });
  });

  describe('getPaymentByReference', () => {
    it('should return payment by reference', async () => {
      // Arrange
      const mockRequest = {
        merchant: { id: 'merchant-123' },
      } as RequestWithMerchant;

      const reference = 'PAY-123456';

      const mockPayment = {
        id: 'payment-123',
        reference,
        status: EPaymentStatus.COMPLETED,
        amount: 100.5,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(paymentService, 'getPaymentByReference')
        .mockResolvedValue(mockPayment as any);

      // Act
      const result = await controller.getPaymentByReference(
        mockRequest,
        reference,
      );

      // Assert
      expect(result).toBe(mockPayment);
      expect(paymentService.getPaymentByReference).toHaveBeenCalledWith(
        reference,
        'merchant-123',
      );
    });
  });
});
