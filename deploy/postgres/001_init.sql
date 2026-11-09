CREATE EXTENSION IF NOT EXISTS pgcrypto;
BEGIN;
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar UNIQUE NOT NULL, name varchar NOT NULL,
  address varchar NOT NULL, "vatNumber" varchar NOT NULL DEFAULT '310123456700003',
  latitude double precision NOT NULL, longitude double precision NOT NULL, active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar NOT NULL, email varchar UNIQUE NOT NULL,
  "passwordHash" varchar NOT NULL, role varchar NOT NULL, "branchId" uuid REFERENCES branches(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true, "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT users_role_check CHECK (role IN ('SUPER_ADMIN','BRANCH_MANAGER','ACCOUNTANT','CASHIER','COURIER','CUSTOMER'))
);
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "branchId" uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  category varchar NOT NULL, name varchar NOT NULL, description varchar NOT NULL DEFAULT '',
  "priceHalalas" integer NOT NULL CHECK ("priceHalalas" >= 0), "vatRate" integer NOT NULL DEFAULT 15,
  calories integer NOT NULL DEFAULT 0, station varchar NOT NULL DEFAULT 'المشويات', active boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "branchId" uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE, latitude double precision NOT NULL,
  longitude double precision NOT NULL, available boolean NOT NULL DEFAULT true,
  "commissionHalalas" integer NOT NULL DEFAULT 1500, "completedOrders" integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "orderNumber" varchar UNIQUE NOT NULL,
  "branchId" uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  "customerId" uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "courierId" uuid REFERENCES couriers(id) ON DELETE SET NULL, type varchar NOT NULL, status varchar NOT NULL DEFAULT 'PLACED',
  "paymentMethod" varchar NOT NULL, "paymentStatus" varchar NOT NULL DEFAULT 'PENDING',
  "subtotalHalalas" integer NOT NULL, "vatHalalas" integer NOT NULL DEFAULT 0,
  "deliveryFeeHalalas" integer NOT NULL DEFAULT 0, "discountHalalas" integer NOT NULL DEFAULT 0,
  "totalHalalas" integer NOT NULL, address varchar NOT NULL DEFAULT '', latitude double precision,
  longitude double precision, "tableNumber" varchar, notes varchar NOT NULL DEFAULT '', "deliveryOtpHash" varchar,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "deliveredAt" timestamp,
  CONSTRAINT orders_total_check CHECK ("totalHalalas" = "subtotalHalalas" - "discountHalalas" + "deliveryFeeHalalas" + "vatHalalas"),
  CONSTRAINT orders_status_check CHECK (status IN ('PLACED','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','DELIVERED','SERVED','CANCELLED'))
);
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "orderId" uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "productId" uuid, name varchar NOT NULL, quantity integer NOT NULL CHECK (quantity > 0),
  "unitPriceHalalas" integer NOT NULL, "totalHalalas" integer NOT NULL, notes varchar NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "orderId" uuid UNIQUE NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  "invoiceNumber" varchar UNIQUE NOT NULL, uuid uuid UNIQUE NOT NULL, "issueDate" timestamp NOT NULL,
  xml text NOT NULL, hash varchar NOT NULL, "previousHash" varchar NOT NULL, "qrBase64" text NOT NULL,
  "complianceStatus" varchar NOT NULL DEFAULT 'DEVELOPMENT_REQUIRES_ZATCA_ONBOARDING'
);
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "orderId" uuid, "branchId" uuid NOT NULL,
  "entryNumber" varchar NOT NULL, description varchar NOT NULL, "entryDate" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "entryId" uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  "accountCode" varchar NOT NULL, "accountName" varchar NOT NULL,
  "debitHalalas" integer NOT NULL DEFAULT 0, "creditHalalas" integer NOT NULL DEFAULT 0,
  CONSTRAINT journal_one_side CHECK (NOT ("debitHalalas" > 0 AND "creditHalalas" > 0)),
  CONSTRAINT journal_nonnegative CHECK ("debitHalalas" >= 0 AND "creditHalalas" >= 0)
);
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "branchId" uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name varchar NOT NULL, unit varchar NOT NULL, quantity double precision NOT NULL CHECK (quantity >= 0),
  "reorderLevel" double precision NOT NULL, active boolean NOT NULL DEFAULT true, "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "productId" uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "inventoryItemId" uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity double precision NOT NULL CHECK (quantity > 0), UNIQUE("productId", "inventoryItemId")
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "inventoryItemId" uuid NOT NULL, "orderId" uuid,
  delta double precision NOT NULL, reason varchar NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid, action varchar NOT NULL,
  entity varchar NOT NULL, "entityId" varchar, metadata text, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "branchId" uuid NOT NULL, "cashierId" uuid NOT NULL,
  "openingCashHalalas" integer NOT NULL, "closingCashHalalas" integer,
  "expectedCashHalalas" integer NOT NULL DEFAULT 0, state varchar NOT NULL DEFAULT 'OPEN',
  "openedAt" timestamp NOT NULL DEFAULT now(), "closedAt" timestamp
);
CREATE INDEX IF NOT EXISTS idx_orders_branch_status ON orders("branchId", status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_products_branch ON products("branchId");
CREATE INDEX IF NOT EXISTS idx_inventory_branch ON inventory_items("branchId");
CREATE INDEX IF NOT EXISTS idx_journal_branch_date ON journal_entries("branchId", "entryDate" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs("createdAt" DESC);
COMMIT;
