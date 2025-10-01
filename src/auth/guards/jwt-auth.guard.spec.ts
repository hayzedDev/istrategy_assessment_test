import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthenticationGuard } from './jwt-auth.guard';
import { JwtService } from '../services/jwt.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { RequestWithMerchant } from 'src/common/interfaces';

describe('AuthenticationGuard', () => {
  let guard: AuthenticationGuard;
  let jwtService: JwtService;
  let redisService: RedisService;
  let mockRedisClient: any;

  const mockRequest = {
    headers: {
      authorization: 'Bearer test-token',
    },
    merchant: undefined,
  } as RequestWithMerchant;

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
    }),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    mockRedisClient = {
      get: jest.fn().mockResolvedValue(null), // No blacklisted token by default
      set: jest.fn().mockResolvedValue('OK'),
    };

    // Create Redis service with properly mocked clients getter
    const mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    // Define the clients property with a getter to avoid "Cannot redefine property" error
    const mockClientsGetter = jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue(mockRedisClient),
    });

    Object.defineProperty(mockRedisService, 'clients', {
      get: mockClientsGetter,
      configurable: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationGuard,
        {
          provide: JwtService,
          useValue: {
            verifyToken: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    guard = module.get<AuthenticationGuard>(AuthenticationGuard);
    jwtService = module.get<JwtService>(JwtService);
    redisService = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should pass when token is valid and not blacklisted', async () => {
    // Arrange
    const user = { id: '123', email: 'test@example.com' };
    jest
      .spyOn(jwtService, 'verifyToken')
      .mockResolvedValue({ user, jti: 'token-id' });
    // Already mocked in beforeEach to return null

    // Act
    const result = await guard.canActivate(mockExecutionContext);

    // Assert
    expect(result).toBe(true);
    expect(mockRequest.merchant).toEqual(user);
  });

  it('should throw UnauthorizedException when token is missing', async () => {
    // Arrange
    const contextWithoutToken = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ headers: {} }),
      }),
    } as unknown as ExecutionContext;

    // Act & Assert
    await expect(guard.canActivate(contextWithoutToken)).rejects.toThrow(
      new UnauthorizedException('No token provided'),
    );
  });

  it('should throw UnauthorizedException when token is blacklisted', async () => {
    // Arrange
    process.env.NODE_ENV = 'production'; // Set to production to ensure the error is thrown
    const user = { id: '123', email: 'test@example.com' };
    jest
      .spyOn(jwtService, 'verifyToken')
      .mockResolvedValue({ user, jti: 'token-id' });

    // Mock Redis error to simulate a blacklisted token
    mockRedisClient.get.mockImplementationOnce(() => {
      const error = new Error('Token has been revoked');
      return Promise.reject(error);
    });

    // Act & Assert
    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      UnauthorizedException,
    );

    // Reset environment
    delete process.env.NODE_ENV;
  });

  it('should throw UnauthorizedException when token is invalid', async () => {
    // Arrange
    jest
      .spyOn(jwtService, 'verifyToken')
      .mockRejectedValue(new UnauthorizedException('Invalid token'));

    // Act & Assert
    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      new UnauthorizedException('Invalid token'),
    );
  });

  it('should extract token from different header formats', async () => {
    // Arrange - Test with capital 'Authorization' header
    const contextWithCapitalHeader = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: { Authorization: 'Bearer test-token' },
        }),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(jwtService, 'verifyToken').mockResolvedValue({
      user: { id: '123' },
      jti: 'token-id',
    });

    // Act
    const result = await guard.canActivate(contextWithCapitalHeader);

    // Assert
    expect(result).toBe(true);
  });
});
