import { Merchant } from '../../auth/entities';
import { EPaymentStatus } from '../../common/enums';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentMethod } from './payment-method.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  reference: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: EPaymentStatus,
    default: EPaymentStatus.PENDING,
  })
  status: EPaymentStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  gatewayReference: string;

  @Column({ nullable: true })
  gatewayResponseCode: string;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @ManyToOne(() => Merchant)
  merchant: Merchant;

  @Column({ nullable: true, name: 'payment_method_id' })
  paymentMethodId: string;

  @ManyToOne(() => PaymentMethod)
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod: PaymentMethod;
}
