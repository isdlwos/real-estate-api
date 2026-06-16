import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {
    const opts: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('jwt.refreshSecret') as string,
      passReqToCallback: true,
      ignoreExpiration: false,
    };
    super(opts);
  }

  async validate(req: Request, payload: { sub: string }): Promise<User> {
    const rawToken = req.headers.authorization?.split(' ')[1];
    if (!rawToken) throw new UnauthorizedException();

    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, refreshTokenHash: true },
    });
    if (!user?.refreshTokenHash) throw new UnauthorizedException();

    const valid = await bcrypt.compare(rawToken, user.refreshTokenHash);
    if (!valid) throw new UnauthorizedException();

    return user;
  }
}
