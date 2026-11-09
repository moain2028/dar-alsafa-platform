import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Branch, Courier, InventoryItem, Product, Recipe, User } from '../entities';
import { OrderType, PaymentMethod, Role } from '../common/domain';
import { OrdersService } from '../orders/orders.service';
import { Actor } from '../auth/current-user.decorator';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);
  constructor(
    private config: ConfigService, private ordersService: OrdersService,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Branch) private branches: Repository<Branch>,
    @InjectRepository(Product) private products: Repository<Product>,
    @InjectRepository(Courier) private couriers: Repository<Courier>,
    @InjectRepository(InventoryItem) private inventory: Repository<InventoryItem>,
    @InjectRepository(Recipe) private recipes: Repository<Recipe>,
  ) {}
  async onApplicationBootstrap() { if (this.config.get('SEED_DEMO', 'true') === 'true') await this.run(); }
  async run() {
    if (await this.users.count()) return;
    const password = this.config.get('DEMO_PASSWORD', 'DarAlsafa!2026');
    const passwordHash = await bcrypt.hash(password, 12);
    const branchRows = await this.branches.save(this.branches.create([
      { code: 'RYD-01', name: 'دار الصفاء — العليا', address: 'الرياض، حي العليا، طريق التحلية', latitude: 24.7136, longitude: 46.6753, vatNumber: this.config.get('DEFAULT_VAT_NUMBER', '310123456700003') },
      { code: 'RYD-02', name: 'دار الصفاء — النرجس', address: 'الرياض، حي النرجس، طريق أبي بكر', latitude: 24.8465, longitude: 46.6978, vatNumber: this.config.get('DEFAULT_VAT_NUMBER', '310123456700003') },
      { code: 'JED-01', name: 'دار الصفاء — الروضة', address: 'جدة، حي الروضة، شارع الأمير سلطان', latitude: 21.5667, longitude: 39.1635, vatNumber: this.config.get('DEFAULT_VAT_NUMBER', '310123456700003') },
    ]));
    const [main] = branchRows;
    const userRows = await this.users.save(this.users.create([
      { name: 'بدر الجابري', email: 'admin@daralsafa.local', passwordHash, role: Role.SUPER_ADMIN, branchId: null },
      { name: 'سارة العتيبي', email: 'manager@daralsafa.local', passwordHash, role: Role.BRANCH_MANAGER, branchId: main.id },
      { name: 'محمد الحربي', email: 'accountant@daralsafa.local', passwordHash, role: Role.ACCOUNTANT, branchId: null },
      { name: 'نورة القحطاني', email: 'cashier@daralsafa.local', passwordHash, role: Role.CASHIER, branchId: main.id },
      { name: 'خالد المطيري', email: 'courier@daralsafa.local', passwordHash, role: Role.COURIER, branchId: main.id },
      { name: 'عميل دار الصفاء', email: 'customer@daralsafa.local', passwordHash, role: Role.CUSTOMER, branchId: main.id },
    ]));
    const [admin, , , , courierUser, customer] = userRows;
    await this.couriers.save(this.couriers.create([
      { userId: courierUser.id, branchId: main.id, latitude: 24.7201, longitude: 46.6812, commissionHalalas: 1500 },
    ]));
    const catalog = [
      { category: 'الحنيذ', name: 'حنيذ لحم بلدي', description: 'لحم ضأن مطهو ببطء مع أرز مبهر ومرق دار الصفاء', priceHalalas: 8900, calories: 780, station: 'المطاعم الساخنة' },
      { category: 'الحنيذ', name: 'حنيذ دجاج', description: 'نصف دجاجة مع أرز الحنيذ والمكسرات', priceHalalas: 4900, calories: 620, station: 'المطاعم الساخنة' },
      { category: 'الأطباق الشعبية', name: 'مندي لحم', description: 'لحم طري وأرز مندي بالبهارات المدخنة', priceHalalas: 7900, calories: 810, station: 'المطاعم الساخنة' },
      { category: 'الأطباق الشعبية', name: 'جريش دار الصفاء', description: 'جريش قمح مع لبن وبصل مكرمل', priceHalalas: 2900, calories: 430, station: 'المطابخ الشعبية' },
      { category: 'المقبلات', name: 'سلطة جرجير', description: 'جرجير طازج، رمان، جبنة فيتا وصلصة حمضيات', priceHalalas: 2400, calories: 180, station: 'المطبخ البارد' },
      { category: 'المشروبات', name: 'قهوة سعودية', description: 'دلة قهوة سعودية بالزعفران والهيل', priceHalalas: 2200, calories: 25, station: 'المشروبات' },
      { category: 'المشروبات', name: 'شاي مغربي', description: 'شاي أخضر بالنعناع الطازج', priceHalalas: 1800, calories: 45, station: 'المشروبات' },
      { category: 'الحلويات', name: 'كنافة دار الصفاء', description: 'كنافة بالجبن مع القطر والفستق', priceHalalas: 3200, calories: 510, station: 'الحلويات' },
    ];
    const productRows: Product[] = [];
    for (const [branchIndex, branch] of branchRows.entries()) {
      const rows = catalog.map((item, index) => this.products.create({ ...item, branchId: branch.id, priceHalalas: item.priceHalalas + branchIndex * 300, sortOrder: index }));
      productRows.push(...await this.products.save(rows));
    }
    const ingredientRows = await this.inventory.save(branchRows.flatMap(branch => [
      this.inventory.create({ branchId: branch.id, name: 'لحم ضأن', unit: 'كجم', quantity: 32, reorderLevel: 10 }),
      this.inventory.create({ branchId: branch.id, name: 'أرز بسمتي', unit: 'كجم', quantity: 75, reorderLevel: 20 }),
      this.inventory.create({ branchId: branch.id, name: 'دجاج طازج', unit: 'كجم', quantity: 28, reorderLevel: 12 }),
      this.inventory.create({ branchId: branch.id, name: 'بن مختص', unit: 'كجم', quantity: 6, reorderLevel: 8 }),
      this.inventory.create({ branchId: branch.id, name: 'حليب طازج', unit: 'لتر', quantity: 18, reorderLevel: 6 }),
    ]));
    const byBranch = new Map<string, InventoryItem[]>();
    ingredientRows.forEach(item => byBranch.set(item.branchId, [...(byBranch.get(item.branchId) || []), item]));
    const recipeRows: Recipe[] = [];
    for (const product of productRows) {
      const ingredients = byBranch.get(product.branchId)!;
      const add = (index: number, quantity: number) => recipeRows.push(this.recipes.create({ productId: product.id, inventoryItemId: ingredients[index].id, quantity }));
      if (product.name.includes('لحم')) { add(0, 0.35); add(1, 0.25); }
      else if (product.name.includes('دجاج')) { add(2, 0.5); add(1, 0.2); }
      else if (product.name.includes('قهوة')) add(3, 0.04);
      else if (product.name.includes('كنافة') || product.name.includes('جريش')) add(4, 0.15);
      else add(1, 0.05);
    }
    await this.recipes.save(recipeRows);
    const actor = (user: User): Actor => ({ id: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branchId });
    const mainProducts = productRows.filter(product => product.branchId === main.id);
    const order1 = await this.ordersService.create({ branchId: main.id, type: OrderType.DINE_IN, paymentMethod: PaymentMethod.CASH, tableNumber: '12', items: [{ productId: mainProducts[0].id, quantity: 1 }, { productId: mainProducts[5].id, quantity: 2 }] }, actor(customer));
    await this.ordersService.updateStatus(order1.id, { status: 'CONFIRMED' as any }, actor(admin));
    await this.ordersService.updateStatus(order1.id, { status: 'PREPARING' as any }, actor(admin));
    await this.ordersService.create({ branchId: main.id, type: OrderType.DELIVERY, paymentMethod: PaymentMethod.MADA, address: 'الرياض، العليا، شارع موسى بن نصير', latitude: 24.7064, longitude: 46.6839, notes: 'الاتصال عند الوصول', items: [{ productId: mainProducts[2].id, quantity: 1 }, { productId: mainProducts[7].id, quantity: 1 }] }, actor(customer));
    const order3 = await this.ordersService.create({ branchId: main.id, type: OrderType.TAKEAWAY, paymentMethod: PaymentMethod.APPLE_PAY, items: [{ productId: mainProducts[4].id, quantity: 2 }, { productId: mainProducts[6].id, quantity: 1 }] }, actor(customer));
    await this.ordersService.updateStatus(order3.id, { status: 'CONFIRMED' as any }, actor(admin));
    this.logger.log(`Seeded ${branchRows.length} branches, ${productRows.length} products and 3 live orders`);
  }
}
