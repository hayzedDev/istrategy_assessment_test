import { Request } from 'express';
import { Merchant } from '../../auth/entities/merchant.entity';

export interface RequestWithMerchant extends Request {
  merchant: Merchant; // Still using "user" for compatibility with JWT strategy
}
