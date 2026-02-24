import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from '../order/order.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientName: string;

  @Column('real', { default: 0 })
  mitgesDotzenes: number;

  /** Import fixe a cobrar mensualment (€). Si null, es calcula des de mitgesDotzenes × preu × setmanes */
  @Column('real', { nullable: true })
  amountPerMonth: number | null;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => Order, (o) => o.subscription)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
