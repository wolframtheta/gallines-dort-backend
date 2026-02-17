import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Transaction } from '../transaction/transaction.entity';

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

  @OneToMany(() => Transaction, (t) => t.order)
  transactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;
}
