import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './common/config';
import { PaymentModule } from './payment/payment.module';
import { SqsService } from './sqs/sqs.service';
import { SqsConsumerService } from './sqs/sqs-consumer.service';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { SeedsModule } from './seeds';
import { WebhookModule } from './webhook/webhook.module';

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
    CommonModule,
    AuthModule,
    PaymentModule,
    WebhookModule,
    SeedsModule,
  ],
  controllers: [],
  providers: [SqsService, SqsConsumerService],
})
export class AppModule {}
