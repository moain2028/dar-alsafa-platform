import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../common/domain';

export interface Actor { id: string; email: string; name: string; role: Role; branchId: string | null }
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor => ctx.switchToHttp().getRequest().user);
