import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '../services/jwt.service';
import { RedisService } from '@liaoliaots/nestjs-redis';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(RedisService) private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify token signature and expiration
      const { user, jti } = await this.jwtService.verifyToken(token);

      console.log({ user, jti });

      // Check if token is blacklisted in Redis
      try {
        const redis = this.redisService['clients'].get('default');
        if (redis) {
          const isBlacklisted = await redis.get(`blacklist:${jti}`);
          if (isBlacklisted) {
            throw new UnauthorizedException('Token has been revoked');
          }
        }
      } catch (redisError) {
        // Log Redis error but don't fail if Redis is unavailable in development
        console.error('Error checking token blacklist:', redisError.message);
        if (process.env.NODE_ENV !== 'development') {
          throw new UnauthorizedException('Authentication service unavailable');
        }
      }

      // Token is valid and not blacklisted, attach merchant to request object
      request.merchant = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error; // Re-throw specific unauthorized exceptions
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    // Get auth header as string
    const authHeader =
      (request.headers.authorization as string) ||
      (request.headers['Authorization'] as string) ||
      (request.headers['authorization'] as string);

    if (!authHeader) return undefined;

    const [bearer, token] = authHeader.split(' ') ?? [];
    return bearer === 'Bearer' ? token : undefined;
  }
}
