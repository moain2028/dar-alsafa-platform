import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities';
import { LoginDto } from './login.dto';
import { Actor } from './current-user.decorator';

@Injectable()
export class AuthService {
  constructor(@InjectRepository(User) private users: Repository<User>, private jwt: JwtService) {}
  async login(dto: LoginDto) {
    const user = await this.users.createQueryBuilder('user').addSelect('user.passwordHash').where('user.email = :email', { email: dto.email.toLowerCase().trim() }).getOne();
    if (!user?.active || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    const payload: Actor = { id: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branchId };
    return { accessToken: await this.jwt.signAsync(payload), user: payload };
  }
  async me(actor: Actor) {
    const user = await this.users.findOne({ where: { id: actor.id }, relations: { branch: true } });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
