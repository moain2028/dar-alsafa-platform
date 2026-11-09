# المعمارية وقرارات التنفيذ

## الهدف

تحويل وثيقة دار الصفاء من عرض تجاري إلى نواة قابلة للتشغيل والاختبار. اختيرت معاملة طلب ذرية بدلاً من واجهات شكلية منفصلة: نجاح الطلب يعني حفظ الطلب وبنوده، خصم الوصفة، إصدار الفاتورة، تسجيل القيد، وسجل التدقيق؛ فشل أي جزء يرجع المعاملة كاملة.

## التدفق

```text
Flutter / Next.js
       │ HTTPS JSON + Bearer JWT
       ▼
NestJS Guards → DTO validation → branch/customer/courier scope
       ▼
OrdersService transaction
  ├─ server-side product pricing in integer halalas
  ├─ delivery fee + discount + 15% VAT
  ├─ nearest available courier (Haversine)
  ├─ recipe stock depletion + stock movements
  ├─ invoice XML + previous-hash chain + TLV QR
  ├─ balanced double-entry journal
  └─ audit log
       ▼
TypeORM → PostgreSQL (production) / SQL.js (local & tests)
       ▼
EventEmitter → Socket.IO room per branch + executives
                    └─ optional Redis adapter for multiple API instances
```

## الأدوار والنطاق

| القدرة | مدير عام | مدير فرع | محاسب | كاشير | مندوب | عميل |
|---|---:|---:|---:|---:|---:|---:|
| كل الفروع | نعم | فرعه فقط | قراءة مالية عامة | فرعه | فرعه | فرعه |
| إنشاء طلب | نعم | نعم | لا | نعم | لا | لنفسه |
| تحديث KDS | نعم | نعم | لا | نعم | لا | لا |
| إثبات OTP | لا | لا | لا | لا | لمهامه فقط | لا |
| المخزون | نعم | فرعه | لا | لا | لا | لا |
| دفتر الأستاذ | نعم | فرعه | نعم | لا | لا | لا |
| الفاتورة | نعم | فرعه | فرعه | فرعه | مهمته | طلبه فقط |

## حالات الطلب

```text
PLACED → CONFIRMED → PREPARING → READY
                                  ├─ SERVED (محلي/سفري)
                                  └─ OUT_FOR_DELIVERY → DELIVERED (OTP)
```

الإلغاء ممكن قبل التحضير فقط. لا يُقفل التسليم إلا برمز صحيح؛ يحفظ النظام SHA-256 للرمز لا الرمز نفسه، ويمسحه بعد الاستخدام. الرمز يظهر مرة واحدة في نتيجة إنشاء الطلب، ويجب استبدال ذلك بإشعار قناة موثوقة في الإنتاج.

## المال والدقة

- كل المبالغ `integer halalas`، لا أرقام عشرية عائمة للمال.
- `total = subtotal - discount + deliveryFee + VAT`.
- القيد: مدين نقدية/ذمم بالإجمالي، دائن مبيعات وتوصيل وVAT. دالة مشتركة ترفض اختلاف الطرفين أو السطر المختلط.
- رقم الطلب عشوائي مقروء لتجنب تعارض التزامن في النسخة المرجعية. يجب استبداله بتسلسل EGS مقيد بقاعدة البيانات قبل الاعتماد الضريبي.

## الأمان

1. كلمات المرور bcrypt(12)، وحقل hash مستبعد افتراضياً من TypeORM ويضاف صراحة لتسجيل الدخول فقط.
2. JWT قصير العمر نسبياً، guards عالمية، وتحقق من الدور والفرع ومالك المورد.
3. DTO whitelist و`forbidNonWhitelisted`، UUID pipes، قيود للكميات والنصوص والإحداثيات.
4. Helmet وCORS محدد وthrottling خاص لتسجيل الدخول.
5. CSV escaping ومنع صيغ Excel، XML escaping، عدم حفظ أسرار في Git.
6. سجل تدقيق للطلبات والحالات والمنتجات والجرد والتسليم.

## قرارات وحدود معروفة

- SQL.js اختير محلياً ليتمكن المطور والاختبارات من العمل دون Docker؛ نفس الكيانات تعمل بـPostgreSQL عبر `DATABASE_URL`.
- Haversine حساب هندسي فوري وليس بديلاً عن PostGIS/مسارات المرور.
- Redis لا يُفرض على التطوير أحادي العملية؛ يفعّل تلقائياً عند `REDIS_URL` لبث Socket.IO بين النسخ.
- التسعير والرسوم والكوبون من الخادم، وقيم العميل في الواجهة تقديرية فقط.
- لا توجد ادعاءات بـ80ms أو100k ops/s أو99.9% availability دون قياس وبنية تشغيل مثبتة.
