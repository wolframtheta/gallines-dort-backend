import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Order } from '../order/order.entity';

@Entity('transactions')
@Index(['type', 'date'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  clientName: string;

  @Column({ nullable: true })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  type: 'expense' | 'income';

  @Column('real')
  amount: number;

  @Column({ default: '' })
  description: string;

  @Column()
  date: string;

  @CreateDateColumn()
  createdAt: Date;
}
