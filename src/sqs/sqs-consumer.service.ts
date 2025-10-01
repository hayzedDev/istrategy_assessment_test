import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ReceiveMessageCommand,
  DeleteMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { getSqsConfig, getSqsQueueUrl } from '../common/config/sqs.config';
import { PaymentEventMessage } from '../common/interfaces/payment-event.interface';

@Injectable()
export class SqsConsumerService implements OnModuleInit {
  private readonly logger = new Logger(SqsConsumerService.name);
  private sqsClient: SQSClient;
  private queueUrl: string;
  private isProcessing: boolean = false;

  constructor(private readonly configService: ConfigService) {
    this.sqsClient = getSqsConfig(configService);
    this.queueUrl = getSqsQueueUrl(configService);
  }

  /**
   * Initialize message polling when the module starts
   */
  onModuleInit() {
    this.startPolling();
    this.logger.log(`SQS Consumer started for queue: ${this.queueUrl}`);
  }

  /**
   * Start polling for messages from the SQS queue
   */
  private async startPolling(): Promise<void> {
    // Avoid multiple polling instances
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.isProcessing) {
      try {
        await this.pollMessages();
      } catch (error) {
        this.logger.error(`Error polling messages: ${error.message}`);
        // Wait a bit before retrying to avoid rapid error loops
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Poll for messages from SQS
   */
  private async pollMessages(): Promise<void> {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20, // Long polling
      MessageAttributeNames: ['All'],
    });

    try {
      const response = await this.sqsClient.send(command);

      if (response.Messages && response.Messages.length > 0) {
        await Promise.all(
          response.Messages.map(async (message) => {
            await this.processMessage(message);
            await this.deleteMessage(message.ReceiptHandle);
          }),
        );
      }
    } catch (error) {
      this.logger.error(`Error receiving messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process a received message
   * @param message The message to process
   */
  private async processMessage(message: any): Promise<void> {
    try {
      const body = JSON.parse(message.Body) as PaymentEventMessage;
      this.logger.log(
        `Processing payment event: ${body.eventType} for payment ${body.reference}`,
      );

      // Log event details
      this.logger.log(
        `Payment event details:
        Payment ID: ${body.paymentId}
        Reference: ${body.reference}
        Amount: ${body.amount} ${body.currency}
        Status: ${body.status}
        Timestamp: ${body.timestamp}
        Merchant ID: ${body.merchantId}`,
      );

      // Here you could add additional event handling logic
      // such as notifications, analytics, etc.
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`);
    }
  }

  /**
   * Delete a processed message from the queue
   * @param receiptHandle The receipt handle of the message to delete
   */
  private async deleteMessage(receiptHandle: string): Promise<void> {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle,
    });

    try {
      await this.sqsClient.send(command);
      this.logger.debug('Message deleted from queue');
    } catch (error) {
      this.logger.error(`Error deleting message: ${error.message}`);
      throw error;
    }
  }
}
