# حالة الفوترة الإلكترونية وZATCA

## ما هو منفذ فعلاً

- توليد UUID لكل فاتورة، رقم فاتورة مرتبط بالطلب، تاريخ ووقت UTC.
- ملف UBL-like XML للتطوير يحوي المورد والضريبة والإجماليات والبنود وPIH.
- ربط الفاتورة السابقة بـ`previousHash` وحساب SHA-256 للـXML قبل التوقيع وتخزينه base64.
- QR بصيغة **Base64 TLV** للحقول 1–5: اسم البائع، الرقم الضريبي، الطابع الزمني، الإجمالي شامل VAT، وقيمة VAT.
- اختبار آلي يطابق المثال الرسمي المنشور من ZATCA، واختبار UTF-8 للعربية، وتوليد صورة QR وXML للتنزيل.

حالة كل فاتورة ظاهرة صراحة: `DEVELOPMENT_REQUIRES_SIGNED_XML_AND_ZATCA_ONBOARDING`.

## ما لا يجوز ادعاؤه

الملف الحالي **ليس فاتورة Phase 2 معتمدة**. وجود TLV QR أو XML لا يعني المطابقة. لا يوجد حالياً:

1. CSR وإصدار compliance/production CSID لكل EGS unit.
2. ECDSA secp256k1 وتوقيع canonicalized XML وتضمين الشهادة وختم ZATCA.
3. QR كامل الحقول 6–9 بالتوقيعات المطلوبة للفاتورة المبسطة.
4. UBL/KSA rules والعناوين والحقول الإلزامية وإشعارات credit/debit الكاملة.
5. clearance/reporting عبر Fatoora ومعالجة أخطاء وحالات API وإعادة المحاولة وidempotency.
6. التحقق بأدوات ZATCA SDK وشهادة onboarding وبيئة إنتاج.

الـhash الحالي بصمة تطويرية للـXML السابق للتوقيع، وليس بديلاً عن خوارزمية canonicalization والتوقيع الرسمية. تسلسل أرقام الفواتير يحتاج أيضاً ترققماً إلزامياً خاصاً بكل وحدة EGS قبل الإنتاج.

## خطة الاعتماد

1. سجّل الحل والوحدات في Developer Portal وأنشئ CSR وCSID لبيئة compliance أولاً.
2. طبّق UBL 2.1/KSA وcanonicalization والتوقيع وحقول QR 6–9 باستخدام مكتبة مُراجعة، ولا تخزن المفتاح الخاص في قاعدة البيانات أو Git؛ استخدم KMS/HSM.
3. نفّذ clearance للفواتير القياسية وreporting للمبسطة، وسجل request/response دون أسرار، مع قائمة انتظار durable وidempotency.
4. اختبر كل حالات standard/simplified وcredit/debit بواسطة SDK و compliance checks، ثم احصل على production CSID.
5. راجع متطلبات الموجة والسجل الضريبي والقطاع مع مختص ضريبي؛ المتطلبات والمواعيد تتغير.

## المصادر الرسمية التي بُني عليها التنفيذ

- ZATCA — **Guide to Developed FATOORA Compliant QR Code** (حقول TLV، UTF-8، Base64، المثال المستخدم في الاختبار):
  https://zatca.gov.sa/ar/E-Invoicing/SystemsDevelopers/Documents/QRCodeCreation.pdf
- ZATCA — **E-invoicing Detailed Technical Guidelines**:
  https://zatca.gov.sa/en/E-Invoicing/Introduction/Guidelines/Documents/E-invoicing-Detailed-Technical-Guideline.pdf
- ZATCA — **Electronic Invoice Security Features Implementation Standards**:
  https://zatca.gov.sa/ar/E-Invoicing/SystemsDevelopers/Documents/20230519_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards_vF.pdf
- ZATCA — **Developer Portal Manual**:
  https://zatca.gov.sa/en/E-Invoicing/Introduction/Guidelines/Documents/DEVELOPER-PORTAL-MANUAL.pdf
- ZATCA — **E-Invoicing portal and SDK references**:
  https://zatca.gov.sa/en/E-Invoicing/Pages/default.aspx

آخر مراجعة للمصادر أثناء التنفيذ: 2026-11-09. يجب التحقق من أحدث نسخة قبل أي طرح إنتاجي.
