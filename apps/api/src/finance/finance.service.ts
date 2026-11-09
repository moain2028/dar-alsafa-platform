import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { JournalEntry, Order } from '../entities';
import { assertBalanced } from './ledger';

@Injectable()
export class FinanceService {
  constructor(@InjectRepository(JournalEntry) private entries: Repository<JournalEntry>) {}
  async recordSale(order: Order, manager?: EntityManager): Promise<JournalEntry> {
    const repo = manager ? manager.getRepository(JournalEntry) : this.entries;
    const taxableDelivery = order.deliveryFeeHalalas;
    const salesCredit = order.subtotalHalalas - order.discountHalalas;
    const lines = [
      { accountCode: order.paymentMethod === 'CASH' ? '1101' : '1102', accountName: order.paymentMethod === 'CASH' ? 'نقدية وعهدة التحصيل' : 'ذمم بوابات الدفع', debitHalalas: order.totalHalalas, creditHalalas: 0 },
      { accountCode: '4001', accountName: 'إيرادات المبيعات', debitHalalas: 0, creditHalalas: salesCredit },
      { accountCode: '4002', accountName: 'إيرادات التوصيل', debitHalalas: 0, creditHalalas: taxableDelivery },
      { accountCode: '2101', accountName: 'ضريبة القيمة المضافة المستحقة', debitHalalas: 0, creditHalalas: order.vatHalalas },
    ].filter(line => line.debitHalalas + line.creditHalalas > 0);
    assertBalanced(lines);
    const entry = repo.create({ orderId: order.id, branchId: order.branchId, entryNumber: `JE-${order.orderNumber}`, description: `قيد آلي للطلب ${order.orderNumber}`, entryDate: order.createdAt, lines });
    return repo.save(entry);
  }
}
