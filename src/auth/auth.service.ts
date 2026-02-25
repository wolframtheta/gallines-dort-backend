import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/user.entity';
import { RefreshToken } from './refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) { }

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName ?? null,
    });
    await this.userRepo.save(user);

    return this.createTokenPair(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.createTokenPair(user);
  }

  async refresh(refreshToken: string) {
    const tokenEntity = await this.refreshTokenRepo.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });
    if (!tokenEntity || !tokenEntity.user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.refreshTokenRepo.remove(tokenEntity);
    return this.createTokenPair(tokenEntity.user);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.refreshTokenRepo.delete({ userId, token: refreshToken });
    } else {
      await this.refreshTokenRepo.delete({ userId });
    }
  }

  private async createTokenPair(user: User) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
    });
    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date('9999-12-31');
    await this.refreshTokenRepo.save({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: 9999999999, // never (effectively)
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  }
}
