import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { createHash, randomInt, randomUUID } from 'crypto';
import { AuditLog, Branch, Courier, InventoryItem, Invoice, Order, OrderItem, Product, Recipe, StockMovement } from '../entities';
import { Actor } from '../auth/current-user.decorator';
import { ORDER_TRANSITIONS, OrderStatus, OrderType, PaymentStatus, Role, VAT_RATE } from '../common/domain';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { InvoiceService } from '../invoices/invoice.service';
import { FinanceService } from '../finance/finance.service';

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

@Injectable()
export class OrdersService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(Product) private products: Repository<Product>,
    @InjectRepository(Branch) private branches: Repository<Branch>,
    @InjectRepository(Courier) private couriers: Repository<Courier>,
    @InjectRepository(AuditLog) private audits: Repository<AuditLog>,
    private invoiceService: InvoiceService,
    private finance: FinanceService,
    private events: EventEmitter2,
  ) {}

  private assertBranch(actor: Actor, branchId: string) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ACCOUNTANT && actor.branchId !== branchId) throw new ForbiddenException('لا يمكنك الوصول إلى فرع آخر');
  }

  async create(dto: CreateOrderDto, actor: Actor) {
    const branchId = actor.branchId || dto.branchId;
    if (!branchId) throw new BadRequestException('حدّد الفرع قبل إنشاء الطلب');
    this.assertBranch(actor, branchId);
    if (actor.role === Role.CUSTOMER && dto.customerId && dto.customerId !== actor.id) throw new ForbiddenException('لا يمكن إنشاء طلب لعميل آخر');
    if (actor.role === Role.COURIER || actor.role === Role.ACCOUNTANT) throw new ForbiddenException('دورك لا يتيح إنشاء الطلبات');
    if (dto.type === OrderType.DELIVERY && (!dto.address || dto.latitude == null || dto.longitude == null)) throw new BadRequestException('العنوان وإحداثيات التوصيل مطلوبة');
    if (dto.type === OrderType.DINE_IN && !dto.tableNumber) throw new BadRequestException('رقم الطاولة مطلوب');
    const deliveryCode = dto.type === OrderType.DELIVERY ? String(randomInt(1000, 10000)) : null;
    const result = await this.dataSource.transaction(async manager => {
      const branch = await manager.getRepository(Branch).findOne({ where: { id: branchId, active: true } });
      if (!branch) throw new NotFoundException('الفرع غير متاح');
      const products = await manager.getRepository(Product).find({ where: dto.items.map(item => ({ id: item.productId, branchId, active: true })) });
      if (products.length !== new Set(dto.items.map(item => item.productId)).size) throw new BadRequestException('أحد المنتجات غير متاح لهذا الفرع');
      const productMap = new Map(products.map(product => [product.id, product]));
      let subtotal = 0;
      const items = dto.items.map(input => {
        const product = productMap.get(input.productId)!;
        const total = product.priceHalalas * input.quantity;
        subtotal += total;
        return manager.getRepository(OrderItem).create({ productId: product.id, name: product.name, quantity: input.quantity, unitPriceHalalas: product.priceHalalas, totalHalalas: total, notes: input.notes || '' });
      });
      const discount = dto.coupon === 'DAR10' ? Math.min(Math.round(subtotal * 0.1), 5000) : 0;
      const distance = dto.type === OrderType.DELIVERY ? haversineKm(branch.latitude, branch.longitude, dto.latitude!, dto.longitude!) : 0;
      const deliveryFee = dto.type === OrderType.DELIVERY ? Math.min(2500, Math.max(500, Math.round(500 + distance * 150))) : 0;
      const vat = Math.round((subtotal - discount + deliveryFee) * VAT_RATE / 100);
      const total = subtotal - discount + deliveryFee + vat;
      const now = new Date();
      const orderNumber = `DS-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 6).toUpperCase()}`;
      let courier: Courier | null = null;
      if (dto.type === OrderType.DELIVERY) {
        const available = await manager.getRepository(Courier).find({ where: { branchId, available: true } });
        courier = available.sort((a, b) => haversineKm(a.latitude, a.longitude, dto.latitude!, dto.longitude!) - haversineKm(b.latitude, b.longitude, dto.latitude!, dto.longitude!))[0] || null;
      }
      const order = await manager.getRepository(Order).save(manager.getRepository(Order).create({
        orderNumber, branchId, customerId: actor.role === Role.CUSTOMER ? actor.id : (dto.customerId || actor.id), courierId: courier?.id,
        type: dto.type, status: OrderStatus.PLACED, paymentMethod: dto.paymentMethod,
        paymentStatus: dto.paymentMethod === 'CASH' ? PaymentStatus.PENDING : PaymentStatus.PAID,
        subtotalHalalas: subtotal, vatHalalas: vat, deliveryFeeHalalas: deliveryFee, discountHalalas: discount, totalHalalas: total,
        address: dto.address || '', latitude: dto.latitude, longitude: dto.longitude, tableNumber: dto.tableNumber,
        notes: dto.notes || '', deliveryOtpHash: deliveryCode ? createHash('sha256').update(deliveryCode).digest('hex') : null,
        items, createdAt: now,
      }));
      await this.depleteInventory(order, items, manager);
      await this.invoiceService.issue(order, branch, manager);
      await this.finance.recordSale(order, manager);
      await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ userId: actor.id, action: 'ORDER_CREATED', entity: 'Order', entityId: order.id, metadata: { orderNumber, totalHalalas: total } }));
      return order;
    });
    this.events.emit('order.changed', { branchId, orderId: result.id, action: 'created' });
    return this.findOne(result.id, actor, deliveryCode || undefined);
  }

  private async depleteInventory(order: Order, items: OrderItem[], manager: EntityManager) {
    for (const item of items) {
      const recipes = await manager.getRepository(Recipe).find({ where: { productId: item.productId } });
      for (const recipe of recipes) {
        const inventory = await manager.getRepository(InventoryItem).findOne({ where: { id: recipe.inventoryItemId } });
        if (!inventory) continue;
        const required = recipe.quantity * item.quantity;
        if (inventory.quantity < required) throw new BadRequestException(`المخزون لا يكفي: ${inventory.name}`);
        inventory.quantity = Number((inventory.quantity - required).toFixed(4));
        await manager.getRepository(InventoryItem).save(inventory);
        await manager.getRepository(StockMovement).save(manager.getRepository(StockMovement).create({ inventoryItemId: inventory.id, orderId: order.id, delta: -required, reason: `خصم وصفة ${item.name}` }));
      }
    }
  }

  async findAll(actor: Actor) {
    const where = actor.role === Role.CUSTOMER ? { customerId: actor.id }
      : actor.role === Role.COURIER ? { courier: { userId: actor.id } }
      : actor.branchId ? { branchId: actor.branchId } : {};
    return this.orders.find({ where, relations: { items: true, courier: { user: true }, customer: true, branch: true }, order: { createdAt: 'DESC' }, take: 200 });
  }

  async findOne(id: string, actor: Actor, deliveryCode?: string) {
    const order = await this.orders.findOne({ where: { id }, relations: { items: true, branch: true, customer: true, courier: { user: true } } });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    this.assertBranch(actor, order.branchId);
    if (actor.role === Role.CUSTOMER && order.customerId !== actor.id) throw new ForbiddenException('هذا الطلب يخص عميلاً آخر');
    if (actor.role === Role.COURIER && order.courier?.userId !== actor.id) throw new ForbiddenException('هذا الطلب مسند لمندوب آخر');
    const invoice = await this.dataSource.getRepository(Invoice).findOne({ where: { orderId: id } });
    return { ...order, invoice, deliveryCode };
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, actor: Actor) {
    if (![Role.SUPER_ADMIN, Role.BRANCH_MANAGER, Role.CASHIER].includes(actor.role)) throw new ForbiddenException('تحديث حالة الطلب يتطلب صلاحية تشغيلية');
    const order = await this.orders.findOne({ where: { id }, relations: { courier: true } });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    this.assertBranch(actor, order.branchId);
    if (!ORDER_TRANSITIONS[order.status].includes(dto.status)) throw new BadRequestException(`لا يمكن الانتقال من ${order.status} إلى ${dto.status}`);
    if (dto.status === OrderStatus.OUT_FOR_DELIVERY && (order.type !== OrderType.DELIVERY || !order.courierId)) throw new BadRequestException('يجب إسناد مندوب قبل خروج الطلب للتوصيل');
    const previousStatus = order.status;
    order.status = dto.status;
    if ([OrderStatus.DELIVERED, OrderStatus.SERVED].includes(dto.status)) order.deliveredAt = new Date();
    await this.orders.save(order);
    await this.audits.save(this.audits.create({ userId: actor.id, action: 'ORDER_STATUS_CHANGED', entity: 'Order', entityId: id, metadata: { from: previousStatus, to: dto.status } }));
    this.events.emit('order.changed', { branchId: order.branchId, orderId: id, action: 'updated' });
    return this.findOne(id, actor);
  }

  async deliver(id: string, otp: string, actor: Actor) {
    if (actor.role !== Role.COURIER) throw new ForbiddenException('إثبات التسليم مخصص للمندوب');
    const order = await this.orders.findOne({ where: { id }, relations: { courier: true } });
    if (!order || order.courier?.userId !== actor.id) throw new NotFoundException('مهمة التوصيل غير موجودة');
    if (order.status !== OrderStatus.OUT_FOR_DELIVERY) throw new BadRequestException('الطلب ليس في حالة خروج للتوصيل');
    const hash = createHash('sha256').update(otp).digest('hex');
    if (hash !== order.deliveryOtpHash) throw new BadRequestException('رمز التسليم غير صحيح');
    order.status = OrderStatus.DELIVERED; order.deliveredAt = new Date(); order.paymentStatus = PaymentStatus.PAID; order.deliveryOtpHash = null;
    await this.dataSource.transaction(async manager => {
      await manager.getRepository(Order).save(order);
      const courier = order.courierId ? await manager.getRepository(Courier).findOne({ where: { id: order.courierId } }) : null;
      if (courier) { courier.completedOrders += 1; await manager.getRepository(Courier).save(courier); }
      await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ userId: actor.id, action: 'DELIVERY_CONFIRMED', entity: 'Order', entityId: id, metadata: { method: 'OTP' } }));
    });
    this.events.emit('order.changed', { branchId: order.branchId, orderId: id, action: 'delivered' });
    return this.findOne(id, actor);
  }
}
