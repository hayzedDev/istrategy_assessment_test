import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Merchant } from '../auth/entities';
import { PaymentMethod } from '../payment/entities';
import { SeederService } from './seeder.service';
import { getDatabaseConfig } from '../common/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Merchant, PaymentMethod]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeedsModule {}
