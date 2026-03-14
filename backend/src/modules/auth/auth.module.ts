import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { User } from './entities/user.entity.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { GoogleStrategy } from './strategies/google.strategy.js';

@Module({
  imports: [
    MikroOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') || 'your-jwt-secret-here',
        signOptions: {
          expiresIn:
            (configService.get<string>('JWT_ACCESS_EXPIRY') || '15m') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
