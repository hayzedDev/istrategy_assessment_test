import { SqsService } from '../../src/sqs/sqs.service';

export const mockSqsService = {
  publishPaymentEvent: jest.fn().mockImplementation(() => {
    return Promise.resolve({ MessageId: 'mock-message-id' });
  }),
};

export class MockSqsService implements Partial<SqsService> {
  publishPaymentEvent = jest.fn().mockImplementation(() => {
    return Promise.resolve({ MessageId: 'mock-message-id' });
  });
}
