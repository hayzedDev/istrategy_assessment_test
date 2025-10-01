import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment, PaymentMethod } from './entities';
import { PaymentService } from './services';
import { PaymentController } from './controllers/payment.controller';
import { Merchant } from '../auth/entities';
import { SqsService } from '../sqs/sqs.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentMethod, Merchant]),
    AuthModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, SqsService],
  exports: [PaymentService, TypeOrmModule],
})
export class PaymentModule {}
