import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from '../auth/entities';
import { SeederService } from '../seeds/seeder.service';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [TypeOrmModule.forFeature([Merchant]), PaymentModule],
  providers: [SeederService],
  exports: [SeederService],
})
export class CommonModule {}
