import { Body, Controller, Get, Header, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { Actor, CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators';
import { Role } from '../common/domain';
import { UpdateInventoryDto, UpdateProductDto } from './dto';

@Controller()
export class OperationsController {
  constructor(private operations: OperationsService) {}
  @Get('products') products(@CurrentUser() actor: Actor, @Query('branchId') branchId?: string) { return this.operations.productList(actor, branchId); }
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER) @Patch('products/:id') product(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto, @CurrentUser() actor: Actor) { return this.operations.updateProduct(id, dto, actor); }
  @Get('branches') branches(@CurrentUser() actor: Actor) { return this.operations.branchList(actor); }
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER, Role.ACCOUNTANT, Role.CASHIER) @Get('dashboard') dashboard(@CurrentUser() actor: Actor) { return this.operations.dashboard(actor); }
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER) @Get('inventory') inventory(@CurrentUser() actor: Actor) { return this.operations.inventoryList(actor); }
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER) @Patch('inventory/:id') updateInventory(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInventoryDto, @CurrentUser() actor: Actor) { return this.operations.updateInventory(id, dto, actor); }
  @Roles(Role.SUPER_ADMIN, Role.ACCOUNTANT, Role.BRANCH_MANAGER) @Get('finance/ledger') ledger(@CurrentUser() actor: Actor) { return this.operations.ledger(actor); }
  @Roles(Role.SUPER_ADMIN, Role.ACCOUNTANT) @Get('finance/export.csv') @Header('Content-Type', 'text/csv; charset=utf-8') @Header('Content-Disposition', 'attachment; filename="dar-alsafa-ledger.csv"') csv(@CurrentUser() actor: Actor) { return this.operations.ledgerCsv(actor); }
  @Roles(Role.SUPER_ADMIN) @Get('audit') audit() { return this.operations.auditList(); }
  @Roles(Role.CASHIER, Role.BRANCH_MANAGER) @Post('shifts/open') openShift(@CurrentUser() actor: Actor, @Body('openingCashHalalas', ParseIntPipe) amount: number) { return this.operations.openShift(actor, amount); }
  @Roles(Role.CASHIER, Role.BRANCH_MANAGER) @Post('shifts/close') closeShift(@CurrentUser() actor: Actor, @Body('closingCashHalalas', ParseIntPipe) amount: number) { return this.operations.closeShift(actor, amount); }
}
