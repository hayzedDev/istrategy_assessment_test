import { ConfigService } from '@nestjs/config';
import { SQSClient } from '@aws-sdk/client-sqs';

export const getSqsConfig = (configService: ConfigService): SQSClient => {
  return new SQSClient({
    region: configService.get<string>('AWS_REGION'),
    credentials: {
      accessKeyId: configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: configService.get<string>('AWS_SECRET_ACCESS_KEY'),
    },
  });
};

export const getSqsQueueUrl = (configService: ConfigService): string => {
  return configService.get<string>('AWS_SQS_PAYMENT_QUEUE_URL');
};
