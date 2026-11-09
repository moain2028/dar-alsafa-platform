# Dar Al-Safa mobile apps

Two Flutter entry points share the production NestJS API:

- `apps/customer_mobile`: sign in, browse the live menu, build a cart, submit a delivery order and receive the one-time delivery code.
- `apps/courier_mobile`: sign in, view assigned tasks, branch/customer details and confirm delivery using the customer's OTP.

Run on an Android emulator with Flutter 3.22+:

```bash
cd apps/customer_mobile
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:3001/api

cd ../courier_mobile
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:3001/api
```

Use the machine's LAN address instead of `10.0.2.2` on a physical device. Demo credentials are documented in the root README. These applications are source-ready clients; store builds, push notifications, secure token storage, deep-link maps and payment SDKs require their respective production accounts and credentials. The current sandbox has no Flutter SDK, so their tests and builds must be run in a Flutter-equipped environment.
