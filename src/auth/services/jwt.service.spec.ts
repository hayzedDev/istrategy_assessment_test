import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from './jwt.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedException } from '@nestjs/common';
import { Merchant } from '../entities';

jest.mock('jsonwebtoken');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

describe('JwtService', () => {
  let service: JwtService;
  let configService: ConfigService;
  let merchantRepository: Repository<Merchant>;
  let redisService: RedisService;
  let mockRedisClient;
  let mockClientsGetter;

  beforeEach(async () => {
    // Create a mock Redis client with the required methods
    mockRedisClient = {
      set: jest.fn().mockResolvedValue('OK'),
      exists: jest.fn().mockResolvedValue(0),
      get: jest.fn().mockResolvedValue(null),
    };

    // Mock the clients getter function
    mockClientsGetter = jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue(mockRedisClient),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'JWT_SECRET') return 'test-secret';
              if (key === 'JWT_EXPIRES_IN') return '1h';
              if (key === 'JWT_EXPIRES_IN_SECONDS') return 3600;
              return null;
            }),
          },
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockRedisClient),
            get clients() {
              return mockClientsGetter();
            }
          },
        },
      ],
    }).compile();

    service = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
    redisService = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      // Arrange
      const mockMerchant = {
        id: '123',
        email: 'test@example.com',
        isActive: true,
      } as Merchant;

      (jwt.sign as jest.Mock).mockReturnValue('generated-token');

      // Act
      const result = await service.generateToken(mockMerchant);

      // Assert
      expect(result).toBe('generated-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          sub: '123',
          email: 'test@example.com',
          jti: 'mocked-uuid',
        },
        'test-secret',
      );
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'tokens:mocked-uuid',
        '123',
        'EX',
        3600,
      );
    });

    it('should generate token even if Redis is unavailable', async () => {
      // Arrange
      const mockMerchant = {
        id: '123',
        email: 'test@example.com',
      } as Merchant;

      (jwt.sign as jest.Mock).mockReturnValue('generated-token');

      // Set clients getter to return null for this test only
      mockClientsGetter.mockReturnValueOnce(null);

      // Act
      const result = await service.generateToken(mockMerchant);

      // Assert
      expect(result).toBe('generated-token');
      expect(mockClientsGetter).toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('should return merchant and decoded token when token is valid', async () => {
      // Arrange
      const mockToken = 'valid-token';
      const mockDecodedToken = {
        sub: '123',
        email: 'test@example.com',
        jti: 'token-id',
      };
      const mockMerchant = {
        id: '123',
        email: 'test@example.com',
        isActive: true,
      } as Merchant;

      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant);

      // Act
      const result = await service.verifyToken(mockToken);

      // Assert
      expect(result).toEqual({
        user: mockMerchant,
        payload: mockDecodedToken,
      });
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret');
      expect(mockRedisClient.exists).toHaveBeenCalledWith('blacklist:token-id');
      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });

    it('should throw UnauthorizedException when merchant is not found', async () => {
      // Arrange
      const mockToken = 'valid-token';
      const mockDecodedToken = {
        sub: '123',
        jti: 'token-id',
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        new UnauthorizedException('Merchant not found or inactive'),
      );
    });

    it('should throw UnauthorizedException when merchant is inactive', async () => {
      // Arrange
      const mockToken = 'valid-token';
      const mockDecodedToken = {
        sub: '123',
        jti: 'token-id',
      };
      const mockMerchant = {
        id: '123',
        isActive: false,
      } as Merchant;

      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(mockMerchant);

      // Act & Assert
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        new UnauthorizedException('Merchant not found or inactive'),
      );
    });

    it('should throw UnauthorizedException when token is blacklisted', async () => {
      // Arrange
      const mockToken = 'valid-token';
      const mockDecodedToken = {
        sub: '123',
        jti: 'token-id',
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
      mockRedisClient.exists.mockResolvedValue(1); // Token is blacklisted

      // Act & Assert
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        new UnauthorizedException('Token has been revoked'),
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      // Arrange
      const mockToken = 'invalid-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        new UnauthorizedException('Invalid token'),
      );
    });
  });

  describe('invalidateToken', () => {
    it('should blacklist a valid token', async () => {
      // Arrange
      const mockToken = 'valid-token';
      const currentTime = Math.floor(Date.now() / 1000);
      const mockDecodedToken = {
        sub: '123',
        jti: 'token-id',
        exp: currentTime + 3600, // Token expires in 1 hour
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      // Act
      await service.invalidateToken(mockToken);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret');
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'blacklist:token-id',
        '1',
        'EX',
        expect.any(Number),
      );
    });

    it('should handle Redis unavailability during invalidation', async () => {
      // Arrange
      const mockToken = 'valid-token';
      const currentTime = Math.floor(Date.now() / 1000);
      const mockDecodedToken = {
        sub: '123',
        jti: 'token-id',
        exp: currentTime + 3600, // Token expires in 1 hour
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);
      
      // Set clients getter to return null for this test only
      mockClientsGetter.mockReturnValueOnce(null);

      // Act - should not throw an error
      await service.invalidateToken(mockToken);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret');
      expect(mockClientsGetter).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      // Arrange
      const mockToken = 'invalid-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.invalidateToken(mockToken)).rejects.toThrow(
        new UnauthorizedException('Invalid token'),
      );
    });
  });

  describe('decodeToken', () => {
    it('should decode a token without verification', () => {
      // Arrange
      const mockToken = 'valid-token';
      const mockDecodedToken = {
        sub: '123',
        email: 'test@example.com',
      };

      (jwt.decode as jest.Mock).mockReturnValue(mockDecodedToken);

      // Act
      const result = service.decodeToken(mockToken);

      // Assert
      expect(result).toEqual(mockDecodedToken);
      expect(jwt.decode).toHaveBeenCalledWith(mockToken);
    });

    it('should return null if token cannot be decoded', () => {
      // Arrange
      const mockToken = 'invalid-token';

      (jwt.decode as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const result = service.decodeToken(mockToken);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getTokenExpirationTime', () => {
    it('should return remaining time in seconds', () => {
      // Arrange
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = currentTime + 3600; // 1 hour from now

      const result = service.getTokenExpirationTime(expirationTime);

      expect(result).toBeGreaterThan(3500);
      expect(result).toBeLessThanOrEqual(3600);
    });

    it('should return 0 when token is already expired', () => {
      // Arrange
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = currentTime - 3600; // 1 hour ago

      // Act
      const result = service.getTokenExpirationTime(expirationTime);

      // Assert
      expect(result).toBe(0);
    });
  });
});
