import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Server, Socket } from 'socket.io';
import { Role } from '../common/domain';
import { Actor } from '../auth/current-user.decorator';

@WebSocketGateway({ namespace: '/events', cors: { origin: process.env.WEB_ORIGIN?.split(',') || true, credentials: true } })
export class EventsGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);
  constructor(private jwt: JwtService) {}
  async afterInit(server: Server) {
    if (!process.env.REDIS_URL) return;
    try {
      const pub = createClient({ url: process.env.REDIS_URL }), sub = pub.duplicate();
      await Promise.all([pub.connect(), sub.connect()]);
      server.adapter(createAdapter(pub, sub));
      this.logger.log('Socket.IO Redis adapter connected');
    } catch (error) { this.logger.error('Redis adapter could not be initialized', error as Error); }
  }
  async handleConnection(socket: Socket) {
    try {
      const actor = await this.jwt.verifyAsync<Actor>(socket.handshake.auth?.token);
      if (actor.branchId) socket.join(`branch:${actor.branchId}`);
      if ([Role.SUPER_ADMIN, Role.ACCOUNTANT].includes(actor.role)) socket.join('executives');
      socket.data.actor = actor;
      socket.emit('connected', { at: new Date().toISOString() });
    } catch { socket.disconnect(true); }
  }
  @OnEvent('order.changed')
  onOrderChanged(payload: { branchId: string; orderId: string; action: string }) {
    this.server.to(`branch:${payload.branchId}`).to('executives').emit('order.changed', payload);
  }
}
