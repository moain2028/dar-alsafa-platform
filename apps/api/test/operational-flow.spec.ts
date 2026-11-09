import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

let app: INestApplication;
const password = 'DarAlsafa!2026';
const login = async (email: string) => (await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(201)).body.accessToken as string;

beforeAll(async () => {
  process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = 'test-secret-with-more-than-32-characters';
  process.env.SQLJS_AUTO_SAVE = 'false'; process.env.SQLJS_LOCATION = './data/test-only.sql';
  process.env.SEED_DEMO = 'true'; process.env.DEMO_PASSWORD = password;
  process.env.ZATCA_SELLER_NAME = 'مطاعم دار الصفاء'; process.env.ZATCA_VAT_NUMBER = '310123456700003';
  process.env.ZATCA_PREVIOUS_HASH = 'NWZlY2E2YjM4OTU1NTljNzM5OTQxZDI5ZTY3YjNkNmYyN2Y4YzdlZDU3ZTdjMDNjMTM4NzY3YzRhN2QwNjA4YjI=';
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication(); app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
}, 30000);
afterAll(async () => { await app?.close(); });

describe('Dar Al-Safa operational flow', () => {
  it('exposes health and protects private routes', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200).expect(({ body }) => expect(body.status).toBe('ok'));
    await request(app.getHttpServer()).get('/api/orders').expect(401);
  });

  it('runs order → kitchen → fleet → delivery → invoice → ledger with RBAC', async () => {
    const [admin, customer, courier] = await Promise.all([login('admin@daralsafa.local'), login('customer@daralsafa.local'), login('courier@daralsafa.local')]);
    const products = (await request(app.getHttpServer()).get('/api/products').set('Authorization', `Bearer ${customer}`).expect(200)).body;
    expect(products.length).toBeGreaterThanOrEqual(8);
    expect(JSON.stringify(products)).not.toContain('passwordHash');
    const created = await request(app.getHttpServer()).post('/api/orders').set('Authorization', `Bearer ${customer}`).send({
      type: 'DELIVERY', paymentMethod: 'CASH', address: 'الرياض، العليا، شارع الاختبار', latitude: 24.7064, longitude: 46.6839,
      items: [{ productId: products[0].id, quantity: 1 }, { productId: products[5].id, quantity: 2 }], coupon: 'DAR10',
    }).expect(201);
    const order = created.body;
    expect(order.deliveryCode).toMatch(/^\d{4}$/); expect(order.invoice.hash).toBeTruthy();
    expect(order.totalHalalas).toBe(order.subtotalHalalas - order.discountHalalas + order.deliveryFeeHalalas + order.vatHalalas);
    expect(order.discountHalalas).toBeGreaterThan(0); expect(order.courier.user.name).toBe('خالد المطيري');
    expect(JSON.stringify(order)).not.toContain('passwordHash');
    await request(app.getHttpServer()).patch(`/api/orders/${order.id}/status`).set('Authorization', `Bearer ${customer}`).send({ status: 'CONFIRMED' }).expect(403);
    for (const status of ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']) {
      await request(app.getHttpServer()).patch(`/api/orders/${order.id}/status`).set('Authorization', `Bearer ${admin}`).send({ status }).expect(200);
    }
    await request(app.getHttpServer()).post(`/api/orders/${order.id}/deliver`).set('Authorization', `Bearer ${courier}`).send({ otp: '0000' }).expect(400);
    const delivered = await request(app.getHttpServer()).post(`/api/orders/${order.id}/deliver`).set('Authorization', `Bearer ${courier}`).send({ otp: order.deliveryCode }).expect(201);
    expect(delivered.body.status).toBe('DELIVERED'); expect(delivered.body.deliveryOtpHash).toBeNull();
    const invoice = await request(app.getHttpServer()).get(`/api/invoices/${order.id}`).set('Authorization', `Bearer ${admin}`).expect(200);
    expect(invoice.body.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(invoice.body.complianceStatus).toContain('DEVELOPMENT');
    const ledger = await request(app.getHttpServer()).get('/api/finance/ledger').set('Authorization', `Bearer ${admin}`).expect(200);
    const entry = ledger.body.find((row: any) => row.orderId === order.id);
    expect(entry).toBeTruthy(); expect(entry.balanced).toBe(true);
    expect(entry.lines.reduce((s: number, l: any) => s + l.debitHalalas, 0)).toBe(order.totalHalalas);
  }, 30000);
});
