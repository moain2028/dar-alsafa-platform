import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, Branch, InventoryItem, JournalEntry, Order, Product, Shift, StockMovement } from '../entities';
import { Actor } from '../auth/current-user.decorator';
import { OrderStatus, Role, halalasToSar } from '../common/domain';
import { UpdateInventoryDto, UpdateProductDto } from '../orders/dto';

@Injectable()
export class OperationsService {
  constructor(
    @InjectRepository(Product) private products: Repository<Product>,
    @InjectRepository(Branch) private branches: Repository<Branch>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(InventoryItem) private inventory: Repository<InventoryItem>,
    @InjectRepository(JournalEntry) private entries: Repository<JournalEntry>,
    @InjectRepository(AuditLog) private audits: Repository<AuditLog>,
    @InjectRepository(Shift) private shifts: Repository<Shift>,
    @InjectRepository(StockMovement) private movements: Repository<StockMovement>,
  ) {}
  private scope(actor: Actor, branchId: string) {
    if (![Role.SUPER_ADMIN, Role.ACCOUNTANT].includes(actor.role) && actor.branchId !== branchId) throw new ForbiddenException('العملية خارج نطاق الفرع');
  }
  async productList(actor: Actor, branchId?: string) {
    const scoped = actor.branchId || branchId;
    const where = scoped ? { branchId: scoped } : {};
    if (scoped) this.scope(actor, scoped);
    return this.products.find({ where, order: { sortOrder: 'ASC', name: 'ASC' } });
  }
  async updateProduct(id: string, dto: UpdateProductDto, actor: Actor) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('المنتج غير موجود');
    this.scope(actor, product.branchId);
    Object.assign(product, dto);
    await this.products.save(product);
    await this.audits.save(this.audits.create({ userId: actor.id, action: 'PRODUCT_UPDATED', entity: 'Product', entityId: id, metadata: { ...dto } }));
    return product;
  }
  branchList(actor: Actor) {
    return this.branches.find({ where: actor.branchId ? { id: actor.branchId } : {}, order: { name: 'ASC' } });
  }
  async inventoryList(actor: Actor) {
    return this.inventory.find({ where: actor.branchId ? { branchId: actor.branchId } : {}, order: { name: 'ASC' } });
  }
  async updateInventory(id: string, dto: UpdateInventoryDto, actor: Actor) {
    const item = await this.inventory.findOne({ where: { id } });
    if (!item) throw new NotFoundException('المادة غير موجودة');
    this.scope(actor, item.branchId);
    const previous = item.quantity;
    item.quantity = dto.quantity;
    await this.inventory.save(item);
    await this.movements.save(this.movements.create({ inventoryItemId: id, delta: dto.quantity - previous, reason: 'جرد وتسوية يدوية' }));
    await this.audits.save(this.audits.create({ userId: actor.id, action: 'INVENTORY_ADJUSTED', entity: 'InventoryItem', entityId: id, metadata: { previous, quantity: dto.quantity } }));
    return item;
  }
  async dashboard(actor: Actor) {
    const where = actor.branchId ? { branchId: actor.branchId } : {};
    const [orders, branches, inventory] = await Promise.all([
      this.orders.find({ where, relations: { items: true, branch: true, courier: { user: true } }, order: { createdAt: 'DESC' } }),
      this.branchList(actor), this.inventoryList(actor),
    ]);
    const valid = orders.filter(order => order.status !== OrderStatus.CANCELLED);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const todayOrders = valid.filter(order => order.createdAt >= today);
    const activeStatuses = [OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY];
    const daily = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today); date.setUTCDate(today.getUTCDate() - (6 - index));
      const next = new Date(date); next.setUTCDate(date.getUTCDate() + 1);
      const rows = valid.filter(order => order.createdAt >= date && order.createdAt < next);
      return { date: date.toISOString().slice(0, 10), salesHalalas: rows.reduce((sum, order) => sum + order.totalHalalas, 0), orders: rows.length };
    });
    const productStats = new Map<string, { name: string; quantity: number; revenueHalalas: number }>();
    valid.forEach(order => order.items.forEach(item => {
      const row = productStats.get(item.name) || { name: item.name, quantity: 0, revenueHalalas: 0 };
      row.quantity += item.quantity; row.revenueHalalas += item.totalHalalas; productStats.set(item.name, row);
    }));
    return {
      kpis: {
        todaySalesHalalas: todayOrders.reduce((sum, order) => sum + order.totalHalalas, 0),
        todayOrders: todayOrders.length,
        activeOrders: valid.filter(order => activeStatuses.includes(order.status)).length,
        averageOrderHalalas: todayOrders.length ? Math.round(todayOrders.reduce((sum, order) => sum + order.totalHalalas, 0) / todayOrders.length) : 0,
        vatTodayHalalas: todayOrders.reduce((sum, order) => sum + order.vatHalalas, 0),
      },
      daily, branches,
      topProducts: [...productStats.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
      lowStock: inventory.filter(item => item.quantity <= item.reorderLevel),
      recentOrders: orders.slice(0, 8),
    };
  }
  async ledger(actor: Actor) {
    const entries = await this.entries.find({ where: actor.branchId ? { branchId: actor.branchId } : {}, relations: { lines: true }, order: { entryDate: 'DESC' }, take: 200 });
    return entries.map(entry => ({ ...entry, balanced: entry.lines.reduce((s, l) => s + l.debitHalalas, 0) === entry.lines.reduce((s, l) => s + l.creditHalalas, 0) }));
  }
  async ledgerCsv(actor: Actor) {
    const entries = await this.ledger(actor);
    const quote = (value: unknown) => { let text = String(value ?? ''); if (/^[=+\-@]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
    const rows = [['رقم القيد', 'التاريخ', 'الوصف', 'كود الحساب', 'الحساب', 'مدين (ر.س)', 'دائن (ر.س)']];
    entries.forEach(entry => entry.lines.forEach(line => rows.push([entry.entryNumber, entry.entryDate.toISOString(), entry.description, line.accountCode, line.accountName, halalasToSar(line.debitHalalas), halalasToSar(line.creditHalalas)])));
    return '\uFEFF' + rows.map(row => row.map(quote).join(',')).join('\r\n');
  }
  auditList() { return this.audits.find({ order: { createdAt: 'DESC' }, take: 100 }); }
  async openShift(actor: Actor, openingCashHalalas: number) {
    if (!actor.branchId) throw new BadRequestException('حساب الكاشير غير مرتبط بفرع');
    const existing = await this.shifts.findOne({ where: { cashierId: actor.id, state: 'OPEN' } });
    if (existing) throw new BadRequestException('توجد وردية مفتوحة بالفعل');
    return this.shifts.save(this.shifts.create({ branchId: actor.branchId, cashierId: actor.id, openingCashHalalas, expectedCashHalalas: openingCashHalalas }));
  }
  async closeShift(actor: Actor, closingCashHalalas: number) {
    const shift = await this.shifts.findOne({ where: { cashierId: actor.id, state: 'OPEN' } });
    if (!shift) throw new NotFoundException('لا توجد وردية مفتوحة');
    const orders = await this.orders.find({ where: { branchId: shift.branchId, customerId: actor.id } });
    shift.expectedCashHalalas = shift.openingCashHalalas + orders.filter(o => o.createdAt >= shift.openedAt && o.paymentMethod === 'CASH' && o.status !== OrderStatus.CANCELLED).reduce((s, o) => s + o.totalHalalas, 0);
    shift.closingCashHalalas = closingCashHalalas; shift.state = 'CLOSED'; shift.closedAt = new Date();
    return this.shifts.save(shift);
  }
}
