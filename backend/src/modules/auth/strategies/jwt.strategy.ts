import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../entities/user.entity.js';

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly em: EntityManager) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-jwt-secret-here',
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.em.findOne(User, { id: payload.sub });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
