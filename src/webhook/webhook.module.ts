import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from 'src/payment/entities';
import { WebhookController } from './controllers';
import { SqsService } from 'src/sqs/sqs.service';
import { WebhookService } from './services';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [WebhookController],
  providers: [WebhookService, SqsService],
  exports: [WebhookService],
})
export class WebhookModule {}
