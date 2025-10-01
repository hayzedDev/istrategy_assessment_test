import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Merchant } from '../entities';

@Injectable()
export class JwtService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    private readonly redisService: RedisService,
  ) {}

  async generateToken(merchant: Merchant): Promise<string> {
    const jti = uuidv4(); // Generate unique token ID
    const payload = {
      sub: merchant.id,
      email: merchant.email,
      jti,
    };

    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '1h';

    // Generate JWT token
    const token = jwt.sign(payload, secret);

    try {
      // Store the token in Redis with expiration
      const expiresInSeconds =
        this.configService.get<number>('JWT_EXPIRES_IN_SECONDS') || 3600; // 1 hour

      // Try to get Redis client, may throw if Redis is not available
      const redis = this.redisService['clients'].get('default');
      if (redis) {
        await redis
          .set(`tokens:${jti}`, merchant.id, 'EX', expiresInSeconds)
          .catch((err) =>
            console.warn('Redis error storing token:', err.message),
          );
      }
    } catch (error) {
      // Log Redis error but don't fail the token generation
      console.warn('Redis unavailable for token storage:', error.message);
    }

    return token;
  }

  async verifyToken(token: string): Promise<any> {
    const secret = this.configService.get<string>('JWT_SECRET');

    try {
      // Verify the token
      const decoded = jwt.verify(token, secret) as any;

      let isBlacklisted = false;
      try {
        // Check if token is blacklisted, only if Redis is available
        const redis = this.redisService['clients'].get('default');
        if (redis) {
          isBlacklisted = await redis
            .exists(`blacklist:${decoded.jti}`)
            .catch((err) => {
              console.warn(
                'Redis error checking blacklisted token:',
                err.message,
              );
              return 0; // Assume not blacklisted if Redis fails
            });
        }
      } catch (redisError) {
        console.warn(
          'Redis unavailable for blacklist check:',
          redisError.message,
        );
        // Continue without blacklist check in development
        if (process.env.NODE_ENV !== 'development') {
          throw new UnauthorizedException('Authentication service unavailable');
        }
      }

      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Find the merchant
      const merchant = await this.merchantRepository.findOne({
        where: { id: decoded.sub },
      });

      if (!merchant || !merchant.isActive) {
        throw new UnauthorizedException('Merchant not found or inactive');
      }

      return {
        user: merchant, // Using user key for backward compatibility
        payload: decoded,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  async invalidateToken(token: string): Promise<void> {
    const secret = this.configService.get<string>('JWT_SECRET');

    try {
      // Decode the token
      const decoded = jwt.verify(token, secret) as any;
      const { jti, exp } = decoded;

      // Calculate remaining time until token expiration
      const currentTime = Math.floor(Date.now() / 1000);
      const remainingTime = exp - currentTime;

      // Blacklist the token in Redis for its remaining lifetime
      if (remainingTime > 0) {
        try {
          const redis = this.redisService['clients'].get('default');
          if (redis) {
            await redis
              .set(`blacklist:${jti}`, '1', 'EX', remainingTime)
              .catch((err) =>
                console.warn('Redis error blacklisting token:', err.message),
              );
          }
        } catch (redisError) {
          console.warn(
            'Redis unavailable for token blacklisting:',
            redisError.message,
          );
          // In development, continue without Redis. In production, might want different behavior
          if (process.env.NODE_ENV !== 'development') {
            console.error(
              'Token invalidation failed due to Redis unavailability',
            );
          }
        }
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  decodeToken(token: string): any {
    try {
      // Just decode without verification (useful for debugging)
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  getTokenExpirationTime(expirationTimestamp: number): number {
    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = expirationTimestamp - currentTime;

    return timeRemaining > 0 ? timeRemaining : 0;
  }
}
