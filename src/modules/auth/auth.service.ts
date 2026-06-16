import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create({ ...dto, role: Role.CLIENT });
    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    return { ...tokens, user: this.sanitize(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findOneByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    return { ...tokens, user: this.sanitize(user) };
  }

  async refresh(user: User) {
    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async forgotPassword(email: string): Promise<{ resetToken: string }> {
    const result = await this.usersService.setPasswordResetToken(email);
    // In production: send result.token by email instead of returning it
    // Always return 200 to avoid user enumeration — token is null-safe
    return { resetToken: result?.token ?? '' };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.usersService.resetPassword(token, newPassword);
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessOpts: JwtSignOptions = {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get('jwt.accessExpiresIn') ?? '15m',
    };

    const refreshOpts: JwtSignOptions = {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get('jwt.refreshExpiresIn') ?? '7d',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, accessOpts),
      this.jwtService.signAsync({ sub: user.id }, refreshOpts),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitize(user: User) {
    const {
      password: _p,
      refreshTokenHash: _r,
      ...safe
    } = user as User & {
      password: string;
      refreshTokenHash: string;
    };
    return safe;
  }
}
