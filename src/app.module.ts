import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { User } from './user/user.entity';
import { RefreshToken } from './auth/refresh-token.entity';
import { Transaction } from './transaction/transaction.entity';
import { Order } from './order/order.entity';
import { Subscription } from './subscription/subscription.entity';
import { Group } from './group/group.entity';
import { BalanceModule } from './balance/balance.module';
import { TransactionModule } from './transaction/transaction.module';
import { OrderModule } from './order/order.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { UserModule } from './user/user.module';

const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.pro'
    : process.env.NODE_ENV === 'pre'
      ? '.env.pre'
      : '.env.dev';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFile,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const host = config.get('DB_HOST');
        return {
          type: 'postgres',
          host,
          port: config.get('DB_PORT', 5432),
          username: config.get('DB_USER'),
          password: config.get('DB_PASSWORD'),
          database: config.get('DB_NAME'),
          ssl: host && !host.includes('localhost') ? { rejectUnauthorized: false } : false,
          entities: [User, RefreshToken, Transaction, Order, Subscription, Group],
          migrations: [join(__dirname, 'database', 'migrations', '*.js')],
          synchronize: false,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    BalanceModule,
    TransactionModule,
    OrderModule,
    SubscriptionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }
