import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as fs from 'fs';
import * as path from 'path';
import { ENTITIES } from './entities';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { OrdersModule } from './orders/orders.module';
import { SeedService } from './seed/seed.service';
import { EventsGateway } from './events/events.gateway';
import { Branch, Courier, InventoryItem, Product, Recipe, User } from './entities';
import { HealthController } from './config/health.controller';
import { InvoicesController } from './invoices/invoices.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const synchronize = config.get('DB_SYNCHRONIZE', config.get('NODE_ENV') !== 'production' ? 'true' : 'false') === 'true';
        if (databaseUrl) return { type: 'postgres' as const, url: databaseUrl, entities: ENTITIES, synchronize, ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined };
        const location = config.get<string>('SQLJS_LOCATION', './data/dar-alsafa.sql');
        fs.mkdirSync(path.dirname(path.resolve(location)), { recursive: true });
        return { type: 'sqljs' as const, location, autoSave: config.get('SQLJS_AUTO_SAVE', 'true') === 'true', entities: ENTITIES, synchronize };
      },
    }),
    TypeOrmModule.forFeature([User, Branch, Product, Courier, InventoryItem, Recipe]),
    ThrottlerModule.forRoot([{ ttl: Number(process.env.THROTTLE_TTL || 60000), limit: Number(process.env.THROTTLE_LIMIT || 120) }]),
    AuthModule, OrdersModule,
  ],
  controllers: [HealthController, InvoicesController], providers: [SeedService, EventsGateway,
    { provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: AuthGuard }, { provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule {}
