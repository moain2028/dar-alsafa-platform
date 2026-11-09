import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Branch, Courier, InventoryItem, Invoice, JournalEntry, Order, Product, Recipe, Shift, StockMovement } from '../entities';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OperationsService } from './operations.service';
import { OperationsController } from './operations.controller';
import { InvoiceService } from '../invoices/invoice.service';
import { FinanceService } from '../finance/finance.service';

@Module({
  imports: [EventEmitterModule.forRoot(), TypeOrmModule.forFeature([Order, Product, Branch, Courier, AuditLog, Invoice, JournalEntry, Recipe, InventoryItem, StockMovement, Shift])],
  controllers: [OrdersController, OperationsController],
  providers: [OrdersService, OperationsService, InvoiceService, FinanceService],
  exports: [OrdersService],
})
export class OrdersModule {}
