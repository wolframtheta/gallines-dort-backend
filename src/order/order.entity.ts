import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Transaction } from '../transaction/transaction.entity';
import { Subscription } from '../subscription/subscription.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientName: string;

  @Column('real', { default: 0 })
  mitgesDotzenes: number;

  @Column({ default: false })
  paid: boolean;

  @Column({ default: false })
  delivered: boolean;

  @Column({ nullable: true })
  subscriptionId: string;

  @ManyToOne(() => Subscription, (s) => s.orders, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  @OneToMany(() => Transaction, (t) => t.order)
  transactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;
}
