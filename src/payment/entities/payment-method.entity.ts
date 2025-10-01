import { Merchant } from '../../auth/entities';
import { EPaymentMethodType } from '../../common/enums';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: EPaymentMethodType,
    default: EPaymentMethodType.CREDIT_CARD,
  })
  type: EPaymentMethodType;

  @Column({ length: 100 })
  name: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  configuration: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ name: 'merchant_id', nullable: false })
  merchantId: string;

  @ManyToOne(() => Merchant, { eager: false })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;
}
