import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { Merchant } from '../entities/merchant.entity';
import { JwtTokenService } from './jwt-token.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

const mockMerchantRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
});

const mockJwtTokenService = () => ({
  sign: jest.fn().mockReturnValue('test-token'),
  verify: jest.fn(),
});

const mockConfigService = () => ({
  get: jest.fn().mockImplementation((key) => {
    if (key === 'JWT_EXPIRES_IN_SECONDS') return 3600;
    return null;
  }),
});

const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
};

const mockRedisService = () => ({
  clients: {
    get: jest.fn().mockReturnValue(mockRedisClient),
  },
});

describe('AuthService', () => {
  let service: AuthService;
  let merchantRepository: Repository<Merchant>;
  let jwtTokenService: JwtTokenService;
  let redisService: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Merchant),
          useFactory: mockMerchantRepository,
        },
        { provide: JwtTokenService, useFactory: mockJwtTokenService },
        { provide: RedisService, useFactory: mockRedisService },
        { provide: ConfigService, useFactory: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
    jwtTokenService = module.get<JwtTokenService>(JwtTokenService);
    redisService = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw UnauthorizedException when merchant is not found', async () => {
      // Arrange
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      const mockMerchant = {
        id: '123',
        email: 'merchant@example.com',
        name: 'Test Merchant',
        comparePassword: jest.fn().mockResolvedValue(false),
      } as unknown as Merchant;

      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant);

      // Act & Assert
      await expect(
        service.login({
          email: 'merchant@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockMerchant.comparePassword).toHaveBeenCalledWith(
        'wrong-password',
      );
    });

    it('should return token and merchant data when credentials are valid', async () => {
      // Arrange
      const mockMerchant = {
        id: '123',
        email: 'merchant@example.com',
        name: 'Test Merchant',
        comparePassword: jest.fn().mockResolvedValue(true),
      } as unknown as Merchant;

      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant);
      jest.spyOn(jwtTokenService, 'sign').mockReturnValue('jwt-token');

      // Act
      const result = await service.login({
        email: 'merchant@example.com',
        password: 'correct-password',
      });

      // Assert
      expect(result).toEqual({
        accessToken: 'jwt-token',
        tokenType: 'Bearer',
        merchantId: '123',
        email: 'merchant@example.com',
        name: 'Test Merchant',
      });
      expect(mockRedisClient.set).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should return success message when logout is successful', async () => {
      // Arrange
      const mockToken = 'Bearer jwt-token';
      jest
        .spyOn(jwtTokenService, 'verify')
        .mockResolvedValue({ jti: 'token-id', exp: Date.now() / 1000 + 60 });

      // Act
      const result = await service.logout(mockToken);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'You have been successfully logged out',
      });
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is missing', async () => {
      // Act & Assert
      await expect(service.logout(null)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getAllMerchants', () => {
    it('should return list of merchants with only name and email', async () => {
      // Arrange
      const mockMerchants = [
        { name: 'Merchant 1', email: 'merchant1@example.com' },
        { name: 'Merchant 2', email: 'merchant2@example.com' },
      ];
      jest
        .spyOn(merchantRepository, 'find')
        .mockResolvedValue(mockMerchants as unknown as Merchant[]);

      // Act
      const result = await service.getAllMerchants();

      // Assert
      expect(result).toEqual({
        merchants: [
          { name: 'Merchant 1', email: 'merchant1@example.com' },
          { name: 'Merchant 2', email: 'merchant2@example.com' },
        ],
        total: 2,
      });
      expect(merchantRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        select: ['name', 'email'],
      });
    });
  });
});
