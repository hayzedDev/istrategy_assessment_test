import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { ConfigService } from '@nestjs/config';
import { JwtTokenService } from './jwt-token.service';
import { Merchant } from '../entities';
import { LoginDto } from '../dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async login(loginDto: LoginDto) {
    const merchant = await this.merchantRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!merchant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await merchant.comparePassword(loginDto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const expiresInSeconds =
      this.configService.get<number>('JWT_EXPIRES_IN_SECONDS') || 3600; // Default 1 hour

    const jti = uuidv4();
    const payload = {
      sub: merchant.id,
      email: merchant.email,
      jti,
    };

    const token = this.jwtTokenService.sign(payload, {
      expiresIn: expiresInSeconds,
    });

    try {
      const redis = this.redisService['clients'].get('default');
      if (redis) {
        await redis
          .set(`tokens:${jti}`, merchant.id, 'EX', expiresInSeconds)
          .catch((err) =>
            console.warn('Redis error storing login token:', err.message),
          );
      }
    } catch (error) {
      // Log error but continue with login process
      console.warn('Redis unavailable during login:', error.message);
    }

    return {
      accessToken: token,
      tokenType: 'Bearer',
      merchantId: merchant.id,
      email: merchant.email,
      name: merchant.name,
    };
  }

  async logout(authHeader: string) {
    try {
      let [bearer, token] = authHeader.split(' ') ?? [];
      token = bearer === 'Bearer' ? token : undefined;

      if (!token) {
        throw new UnauthorizedException('Invalid token format');
      }

      const decoded = this.jwtTokenService.verify(token) as any;
      const { jti, exp } = decoded; // Calculate remaining time until token expiration

      console.log({ jti, exp });
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
                console.warn(
                  'Redis error blacklisting token during logout:',
                  err.message,
                ),
              );
          }
        } catch (redisError) {
          // In development, we'll log and continue. In production, you might want different behavior
          console.warn('Redis unavailable during logout:', redisError.message);
          if (process.env.NODE_ENV !== 'development') {
            console.error(
              'Token blacklisting failed due to Redis unavailability',
            );
          }
        }
      }

      return {
        success: true,
        message: 'You have been successfully logged out',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getAllMerchants() {
    // Find all active merchants
    const merchants = await this.merchantRepository.find({
      where: { isActive: true },
      select: ['name', 'email'],
    });

    return {
      merchants,
      total: merchants.length,
    };
  }
}
