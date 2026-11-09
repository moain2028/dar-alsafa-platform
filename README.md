# منظومة دار الصفاء

نواة تشغيلية عربية موحّدة للمطاعم والضيافة، مبنية من متطلبات وثيقة **DAR AL-SAFA V2.5 PRO**. تربط الطلب والمطبخ والتوصيل والمخزون والفاتورة والقيد المحاسبي في معاملة واحدة، مع واجهات ويب للإدارة ونقاط البيع والمطبخ والعميل والمندوب، وقاعدتي Flutter للجوال.

> **نطاق صادق:** هذه نسخة مرجعية قابلة للتشغيل والتطوير، وليست إطلاقاً تجارياً معتمداً أو شهادة مطابقة ZATCA. بوابات الدفع تعمل بمحاكاة، وربط ZATCA والخرائط والرسائل يحتاج حسابات وشهادات واعتماداً خارجياً. راجع `docs/REQUIREMENTS.md` و`docs/ZATCA.md` قبل النشر.

## ما تم تنفيذه

- **الإدارة وBI:** مبيعات اليوم والطلبات النشطة ومتوسط الطلب وVAT، رسم 7 أيام، الأصناف الأعلى مبيعاً، الفروع والتنبيهات.
- **POS:** محلي/سفري/توصيل، طاولات، كوبون `DAR10`، طرق دفع تجريبية، سلة وتسعير خادمي بالهللات وفاتورة فورية.
- **KDS:** مراحل الطلب وتذاكر المطبخ وتحديث لحظي عبر Socket.IO؛ Redis Pub/Sub اختياري للتوسع الأفقي.
- **العميل:** قائمة الفرع، توصيل وسفري، تتبع الطلب، فاتورة وQR قابل للطباعة وXML قابل للتنزيل.
- **المندوب:** إسناد أقرب مندوب متاح باستخدام Haversine، مسار الفرع والعميل، تحصيل COD، إثبات تسليم OTP وعمولات.
- **المخزون:** وصفات، خصم تلقائي داخل معاملة الطلب، منع الرصيد السالب، حدود إعادة طلب وجرد موثق بحركة مخزون.
- **المالية:** قيد مزدوج آلي متوازن لكل طلب، فصل المبيعات والتوصيل وVAT، دفتر أستاذ وتصدير CSV محمي من formula injection.
- **الأمان:** JWT، bcrypt بقوة 12، RBAC ونطاق الفرع والعميل/المندوب، Helmet، rate limiting، DTO whitelist، سجل تدقيق، وكلمة المرور مستبعدة من نتائج الاستعلام.
- **الجوال:** تطبيق عميل وتطبيق مندوب Flutter يتصلان بنفس API.

## التقنيات

| الطبقة | التنفيذ |
|---|---|
| API | NestJS 10، TypeScript strict، TypeORM، class-validator |
| الويب | Next.js 14.2، React 18، RTL متجاوب، Socket.IO client |
| البيانات | PostgreSQL للإنتاج؛ SQL.js محلياً وفي الاختبارات بلا خدمات خارجية |
| اللحظية | Socket.IO + Redis adapter عند ضبط `REDIS_URL` |
| الجوال | Flutter/Dart، عميلان مستقلان بقاعدة API واحدة |
| الفوترة | UBL XML تطويري، SHA-256 hash chain، TLV Base64 QR وصورة QR |

## التشغيل السريع

المتطلبات: Node.js 20.11+ وnpm 10+.

```bash
cp .env.example .env
# غيّر JWT_SECRET في .env إلى قيمة عشوائية طويلة
npm install
npm run dev
```

- الويب: `http://localhost:3000`
- API health: `http://localhost:3001/api/health`
- عند أول تشغيل تُنشأ قاعدة محلية وبيانات العرض تلقائياً. ملف القاعدة داخل `apps/api/data/` ومستبعد من Git.

### حسابات العرض

كلمة المرور الموحدة: `DarAlsafa!2026`

| الدور | البريد |
|---|---|
| مدير عام | `admin@daralsafa.local` |
| مدير فرع | `manager@daralsafa.local` |
| محاسب | `accountant@daralsafa.local` |
| كاشير | `cashier@daralsafa.local` |
| مندوب | `courier@daralsafa.local` |
| عميل | `customer@daralsafa.local` |

**قبل الإنتاج:** اجعل `SEED_DEMO=false`، واحذف مستخدمي العرض، واستخدم كلمة مرور قوية لكل مستخدم. لا توجد أسرار حقيقية في المستودع.

## الفحوص

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

تشمل الاختبارات:

- مطابقة مثال ZATCA الرسمي لترميز TLV بايتاً ببايت، بما فيه UTF-8 العربي.
- توازن القيد المزدوج ورفض القيود غير الصالحة وحساب المسافات.
- رحلة تكامل فعلية: دخول → إنشاء طلب → منع تجاوز RBAC → مراحل KDS → OTP → فاتورة/QR → دفتر أستاذ متوازن.

## Flutter

**برومبت تنفيذي جاهز للنسخ لبناء التطبيقين واختبارهما:** [`docs/FLUTTER_PRODUCTION_PROMPT.md`](docs/FLUTTER_PRODUCTION_PROMPT.md). يستهدف Flutter Stable 3.47.9 وDart 3.13.7 وفق بيانات الإصدار الرسمية بتاريخ 2026-11-09.

يوصى بـFlutter Stable 3.47.9 (غير مثبت في بيئة بناء هذا المستودع، لذلك لم يُختبر بناء التطبيقين هنا):

```bash
cd apps/customer_mobile
flutter pub get
flutter test
flutter run --dart-define=API_URL=http://10.0.2.2:3001/api

cd ../courier_mobile
flutter pub get
flutter test
flutter run --dart-define=API_URL=http://10.0.2.2:3001/api
```

استخدم عنوان LAN للجهاز بدلاً من `10.0.2.2` على هاتف حقيقي. للإنتاج أضف secure storage وFCM وروابط الخرائط وشهادات المتاجر.

## PostgreSQL وRedis

1. وفّر PostgreSQL 15+ وRedis 7+.
2. اضبط `DATABASE_URL=postgresql://user:password@host:5432/dar_alsafa` و`REDIS_URL=redis://host:6379`.
3. طبّق `deploy/postgres/001_init.sql` على قاعدة جديدة، ثم اجعل `DB_SYNCHRONIZE=false`.
4. اضبط `NODE_ENV=production` و`WEB_ORIGIN` و`NEXT_PUBLIC_API_URL` و`JWT_SECRET`.
5. نفّذ `npm ci && npm run build` ثم شغّل `npm run start -w @dar-alsafa/api` و`npm run start -w @dar-alsafa/web`.

يمكن استخدام `docker compose up --build` لتشغيل الحزمة التجريبية بـPostgreSQL وRedis. إعداد Compose يهيئ المخطط تلقائياً للتجربة فقط؛ اعتمد migrations في الإنتاج.

## بنية المشروع

```text
apps/
  api/               NestJS: auth, orders, invoices, finance, events, seed
  web/               Next.js: admin, POS, KDS, customer, courier, finance, inventory
  customer_mobile/   Flutter customer client
  courier_mobile/    Flutter courier client
docs/                architecture, requirements traceability, ZATCA, operations
deploy/              PostgreSQL schema and container files
```

## API الأساسي

كل المسارات تحت `API_PREFIX` (افتراضياً `/api`) وتحتاج Bearer token عدا `health` و`auth/login`.

- `POST /auth/login`، `GET /auth/me`
- `GET /branches`، `GET /products`، `PATCH /products/:id`
- `POST /orders`، `GET /orders`، `GET /orders/:id`، `PATCH /orders/:id/status`
- `POST /orders/:id/deliver` مع `{ "otp": "1234" }`
- `GET /invoices/:orderId`، `GET /invoices/:orderId/xml`
- `GET /dashboard`، `GET /inventory`، `PATCH /inventory/:id`
- `GET /finance/ledger`، `GET /finance/export.csv`
- `POST /shifts/open`، `POST /shifts/close`

## القيود المتبقية قبل الإنتاج

- التوقيع الرقمي وcanonicalization وCSID وclearance/reporting والتحقق بأدوات ZATCA غير منفذة؛ XML وQR الحاليان للتطوير.
- الدفع غير النقدي محاكاة ولا يمثل تحصيلاً حقيقياً. يلزم Moyasar/HyperPay وwebhooks موقعة وidempotency.
- حساب المسافة Haversine وليس زمن مسار مروري؛ يلزم Maps/PostGIS للتوسع، وإشعارات FCM/WhatsApp تحتاج مفاتيح المزود.
- الطباعة الحرارية وأدراج النقد والاتصال المشفر والمطابقات البنكية وإقفال الفترات وتصدير PDF/Excel ليست مكتملة.
- يجب إضافة migrations لاحقة لكل تغيير، نسخ احتياطي ومراقبة واختبارات حمل واختراق، ومراجعة قانونية وضريبية قبل الادعاء بالامتثال أو SLA 99.9%.
