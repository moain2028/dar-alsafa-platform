import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Actor, CurrentUser } from '../auth/current-user.decorator';
import { CreateOrderDto, DeliverOrderDto, UpdateOrderStatusDto } from './dto';

@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}
  @Post() create(@Body() dto: CreateOrderDto, @CurrentUser() actor: Actor) { return this.orders.create(dto, actor); }
  @Get() list(@CurrentUser() actor: Actor) { return this.orders.findAll(actor); }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: Actor) { return this.orders.findOne(id, actor); }
  @Patch(':id/status') status(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderStatusDto, @CurrentUser() actor: Actor) { return this.orders.updateStatus(id, dto, actor); }
  @Post(':id/deliver') deliver(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeliverOrderDto, @CurrentUser() actor: Actor) { return this.orders.deliver(id, dto.otp, actor); }
}
