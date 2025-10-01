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
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
  controllers: [AppController],
  providers: [SqsService, SqsConsumerService, AppService],
})
export class AppModule {}
