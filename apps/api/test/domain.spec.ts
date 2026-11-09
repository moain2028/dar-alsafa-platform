import { describe, expect, it } from 'vitest';
import { decodeTlv, encodeTlv } from '../src/invoices/tlv';
import { assertBalanced } from '../src/finance/ledger';
import { haversineKm } from '../src/orders/orders.service';

describe('ZATCA TLV', () => {
  it('matches the official ZATCA worked example byte-for-byte', () => {
    const encoded = encodeTlv([
      { tag: 1, value: 'Bobs Records' }, { tag: 2, value: '310122393500003' },
      { tag: 3, value: '2022-04-25T15:30:00Z' }, { tag: 4, value: '1000.00' }, { tag: 5, value: '150.00' },
    ]);
    expect(encoded).toBe('AQxCb2JzIFJlY29yZHMCDzMxMDEyMjM5MzUwMDAwMwMUMjAyMi0wNC0yNVQxNTozMDowMFoEBzEwMDAuMDAFBjE1MC4wMA==');
    expect(decodeTlv(encoded).get(1)?.toString('utf8')).toBe('Bobs Records');
  });
  it('uses UTF-8 byte lengths for Arabic and rejects truncation', () => {
    const encoded = encodeTlv([{ tag: 1, value: 'مطاعم دار الصفاء' }, { tag: 2, value: '310123456700003' }]);
    const decoded = decodeTlv(encoded);
    expect(decoded.get(1)?.toString('utf8')).toBe('مطاعم دار الصفاء');
    expect(decoded.get(1)?.length).toBe(Buffer.byteLength('مطاعم دار الصفاء', 'utf8'));
    expect(() => decodeTlv(encoded.slice(0, -4))).toThrow();
  });
});

describe('double-entry ledger invariant', () => {
  it('accepts a balanced sale with VAT', () => {
    expect(() => assertBalanced([
      { debitHalalas: 11500, creditHalalas: 0 }, { debitHalalas: 0, creditHalalas: 10000 }, { debitHalalas: 0, creditHalalas: 1500 },
    ])).not.toThrow();
  });
  it('rejects unbalanced and one-sided entries', () => {
    expect(() => assertBalanced([{ debitHalalas: 100, creditHalalas: 0 }, { debitHalalas: 0, creditHalalas: 99 }])).toThrow('غير متوازن');
    expect(() => assertBalanced([{ debitHalalas: 100, creditHalalas: 100 }, { debitHalalas: 0, creditHalalas: 0 }])).toThrow();
  });
});

describe('fleet distance', () => {
  it('computes a plausible Riyadh distance and is symmetric', () => {
    const distance = haversineKm(24.7136, 46.6753, 24.8465, 46.6978);
    expect(distance).toBeGreaterThan(14); expect(distance).toBeLessThan(16);
    expect(distance).toBeCloseTo(haversineKm(24.8465, 46.6978, 24.7136, 46.6753), 8);
  });
});
