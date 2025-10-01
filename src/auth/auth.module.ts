import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Merchant } from './entities';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { AuthService, JwtTokenService, JwtService } from './services';
import { AuthController } from './controllers';
import { AuthenticationGuard } from './guards';

@Module({
  imports: [
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        config: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
          password: configService.get<string>('REDIS_PASSWORD'),
        },
        readyLog: true,
        errorLog: true,
        enableReadyCheck: false,
        enableOfflineQueue: true,
        showFriendlyErrorStack: true,
        retryStrategy: (times: any) => {
          // Don't retry more than 3 times in development
          if (process.env.NODE_ENV === 'development' && times > 3) {
            return null; // Stop retrying
          }
          const delay = Math.min(times * 100, 3000);
          return delay;
        },
      }),
    }),
    TypeOrmModule.forFeature([Merchant]),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthenticationGuard, JwtTokenService, JwtService],
  exports: [AuthService, AuthenticationGuard, JwtTokenService, JwtService],
})
export class AuthModule {}
