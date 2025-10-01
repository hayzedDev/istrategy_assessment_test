import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { PaymentEventMessage } from '../common/interfaces/payment-event.interface';
import { getSqsConfig, getSqsQueueUrl } from '../common/config/sqs.config';

@Injectable()
export class SqsService {
  private sqsClient: SQSClient;
  private queueUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.sqsClient = getSqsConfig(configService);
    this.queueUrl = getSqsQueueUrl(configService);
  }

  /**
   * Publishes a payment event message to SQS
   * @param message The payment event message to publish
   * @returns The response from SQS
   */
  async publishPaymentEvent(message: PaymentEventMessage): Promise<any> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: message.eventType,
        },
      },
    });

    try {
      const response = await this.sqsClient.send(command);
      return response;
    } catch (error) {
      throw new Error(`Failed to publish payment event: ${error.message}`);
    }
  }
}
