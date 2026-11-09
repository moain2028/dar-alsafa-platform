import { Controller, Get, Header, Param, ParseUUIDPipe } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { OrdersService } from '../orders/orders.service';
import { Actor, CurrentUser } from '../auth/current-user.decorator';

@Controller('invoices')
export class InvoicesController {
  constructor(private orders: OrdersService) {}
  @Get(':orderId') async invoice(@Param('orderId', ParseUUIDPipe) id: string, @CurrentUser() actor: Actor) {
    const order = await this.orders.findOne(id, actor);
    if (!order.invoice) throw new Error('Invoice was not issued with the order');
    return { ...order.invoice, qrDataUrl: await QRCode.toDataURL(order.invoice.qrBase64, { width: 360, margin: 2 }) };
  }
  @Get(':orderId/xml') @Header('Content-Type', 'application/xml; charset=utf-8') async xml(@Param('orderId', ParseUUIDPipe) id: string, @CurrentUser() actor: Actor) {
    const order = await this.orders.findOne(id, actor);
    if (!order.invoice) throw new Error('Invoice was not issued with the order');
    return order.invoice.xml;
  }
}
