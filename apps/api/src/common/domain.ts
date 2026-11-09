export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  CASHIER = 'CASHIER',
  COURIER = 'COURIER',
  CUSTOMER = 'CUSTOMER',
}

export enum OrderType { DINE_IN = 'DINE_IN', TAKEAWAY = 'TAKEAWAY', DELIVERY = 'DELIVERY' }
export enum OrderStatus {
  PLACED = 'PLACED', CONFIRMED = 'CONFIRMED', PREPARING = 'PREPARING',
  READY = 'READY', OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED', SERVED = 'SERVED', CANCELLED = 'CANCELLED',
}
export enum PaymentMethod { CASH = 'CASH', MADA = 'MADA', APPLE_PAY = 'APPLE_PAY', CARD = 'CARD', STC_PAY = 'STC_PAY', WALLET = 'WALLET' }
export enum PaymentStatus { PENDING = 'PENDING', PAID = 'PAID', FAILED = 'FAILED', REFUNDED = 'REFUNDED' }

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.SERVED, OrderStatus.DELIVERED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [], [OrderStatus.SERVED]: [], [OrderStatus.CANCELLED]: [],
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PLACED: 'طلب جديد', CONFIRMED: 'تم التأكيد', PREPARING: 'قيد التحضير',
  READY: 'جاهز للتسليم', OUT_FOR_DELIVERY: 'في الطريق', DELIVERED: 'تم التوصيل',
  SERVED: 'تم التقديم', CANCELLED: 'ملغي',
};

export const VAT_RATE = 15;
export const CURRENCY = 'SAR';
export function halalasToSar(value: number): string { return (value / 100).toFixed(2); }
export function roundHalalas(value: number): number { return Math.round(value); }
