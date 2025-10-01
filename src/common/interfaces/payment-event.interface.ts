import { EPaymentStatus } from '../enums';

export interface PaymentEventMessage {
  eventType: 'payment-initiated' | 'payment-completed' | 'payment-failed';
  timestamp: string;
  paymentId: string;
  reference: string;
  amount: number;
  currency: string;
  status: EPaymentStatus;
  merchantId: string;
  metadata?: Record<string, any>;
  gatewayReference?: string;
  errorMessage?: string;
}
