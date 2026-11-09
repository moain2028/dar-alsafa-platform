import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus, Role } from '../common/domain';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) code: string;
  @Column() name: string;
  @Column() address: string;
  @Column({ default: '310123456700003' }) vatNumber: string;
  @Column('float') latitude: number;
  @Column('float') longitude: number;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ unique: true }) email: string;
  @Column({ select: false }) passwordHash: string;
  @Column({ type: 'varchar' }) role: Role;
  @Column({ type: 'varchar', nullable: true }) branchId: string | null;
  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'branchId' }) branch: Branch;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() branchId: string;
  @ManyToOne(() => Branch, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'branchId' }) branch: Branch;
  @Column() category: string;
  @Column() name: string;
  @Column({ default: '' }) description: string;
  @Column('integer') priceHalalas: number;
  @Column('integer', { default: 15 }) vatRate: number;
  @Column('integer', { default: 0 }) calories: number;
  @Column({ default: 'المشويات' }) station: string;
  @Column({ default: true }) active: boolean;
  @Column({ default: 0 }) sortOrder: number;
}

@Entity('couriers')
export class Courier {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) userId: string;
  @OneToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'userId' }) user: User;
  @Index() @Column() branchId: string;
  @ManyToOne(() => Branch, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'branchId' }) branch: Branch;
  @Column('float') latitude: number;
  @Column('float') longitude: number;
  @Column({ default: true }) available: boolean;
  @Column('integer', { default: 1500 }) commissionHalalas: number;
  @Column('integer', { default: 0 }) completedOrders: number;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) orderNumber: string;
  @Index() @Column() branchId: string;
  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'branchId' }) branch: Branch;
  @Column() customerId: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'customerId' }) customer: User;
  @Column({ type: 'varchar', nullable: true }) courierId: string | null;
  @ManyToOne(() => Courier, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'courierId' }) courier: Courier;
  @Column({ type: 'varchar' }) type: OrderType;
  @Index() @Column({ type: 'varchar', default: OrderStatus.PLACED }) status: OrderStatus;
  @Column({ type: 'varchar' }) paymentMethod: PaymentMethod;
  @Column({ type: 'varchar', default: PaymentStatus.PENDING }) paymentStatus: PaymentStatus;
  @Column('integer') subtotalHalalas: number;
  @Column('integer', { default: 0 }) vatHalalas: number;
  @Column('integer', { default: 0 }) deliveryFeeHalalas: number;
  @Column('integer', { default: 0 }) discountHalalas: number;
  @Column('integer') totalHalalas: number;
  @Column({ default: '' }) address: string;
  @Column('float', { nullable: true }) latitude: number | null;
  @Column('float', { nullable: true }) longitude: number | null;
  @Column({ type: 'varchar', nullable: true }) tableNumber: string | null;
  @Column({ default: '' }) notes: string;
  @Column({ type: 'varchar', nullable: true }) deliveryOtpHash: string | null;
  @OneToMany(() => OrderItem, item => item.order, { cascade: true }) items: OrderItem[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @Column({ nullable: true }) deliveredAt: Date;
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() orderId: string;
  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'orderId' }) order: Order;
  @Column({ nullable: true }) productId: string;
  @Column() name: string;
  @Column('integer') quantity: number;
  @Column('integer') unitPriceHalalas: number;
  @Column('integer') totalHalalas: number;
  @Column({ default: '' }) notes: string;
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) orderId: string;
  @OneToOne(() => Order, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'orderId' }) order: Order;
  @Column({ unique: true }) invoiceNumber: string;
  @Column({ unique: true }) uuid: string;
  @Column() issueDate: Date;
  @Column('text') xml: string;
  @Column() hash: string;
  @Column() previousHash: string;
  @Column('text') qrBase64: string;
  @Column({ default: 'DEVELOPMENT_REQUIRES_ZATCA_ONBOARDING' }) complianceStatus: string;
}

@Entity('journal_entries')
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'varchar', nullable: true }) orderId: string | null;
  @Index() @Column() branchId: string;
  @Column() entryNumber: string;
  @Column() description: string;
  @Column() entryDate: Date;
  @OneToMany(() => JournalLine, line => line.entry, { cascade: true }) lines: JournalLine[];
  @CreateDateColumn() createdAt: Date;
}

@Entity('journal_lines')
export class JournalLine {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() entryId: string;
  @ManyToOne(() => JournalEntry, entry => entry.lines, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'entryId' }) entry: JournalEntry;
  @Column() accountCode: string;
  @Column() accountName: string;
  @Column('integer', { default: 0 }) debitHalalas: number;
  @Column('integer', { default: 0 }) creditHalalas: number;
}

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() branchId: string;
  @ManyToOne(() => Branch, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'branchId' }) branch: Branch;
  @Column() name: string;
  @Column() unit: string;
  @Column('float') quantity: number;
  @Column('float') reorderLevel: number;
  @Column({ default: true }) active: boolean;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('recipes')
export class Recipe {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() productId: string;
  @ManyToOne(() => Product, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'productId' }) product: Product;
  @Index() @Column() inventoryItemId: string;
  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'inventoryItemId' }) inventoryItem: InventoryItem;
  @Column('float') quantity: number;
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() inventoryItemId: string;
  @Column({ nullable: true }) orderId: string;
  @Column('float') delta: number;
  @Column() reason: string;
  @CreateDateColumn() createdAt: Date;
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ nullable: true }) userId: string;
  @Column() action: string;
  @Column() entity: string;
  @Column({ nullable: true }) entityId: string;
  @Column('simple-json', { nullable: true }) metadata: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
}

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() branchId: string;
  @Column() cashierId: string;
  @Column('integer') openingCashHalalas: number;
  @Column('integer', { nullable: true }) closingCashHalalas: number;
  @Column('integer', { default: 0 }) expectedCashHalalas: number;
  @Column({ default: 'OPEN' }) state: string;
  @CreateDateColumn() openedAt: Date;
  @Column({ nullable: true }) closedAt: Date;
}

export const ENTITIES = [Branch, User, Product, Courier, Order, OrderItem, Invoice, JournalEntry, JournalLine, InventoryItem, Recipe, StockMovement, AuditLog, Shift];
