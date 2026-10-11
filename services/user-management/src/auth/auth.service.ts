import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../common/prisma.service';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(payload: RegisterDto): Promise<{ id: string; email: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await hash(payload.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: payload.email.toLowerCase(),
        passwordHash,
        profile: {
          create: {
            firstName: payload.firstName,
            lastName: payload.lastName,
          },
        },
        preference: {
          create: {},
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    return user;
  }

  async login(payload: LoginDto): Promise<{ accessToken: string; tokenType: 'Bearer' }> {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
      select: { id: true, email: true, passwordHash: true, isActive: true },
    });

    if (!user?.isActive) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isValidPassword = await compare(payload.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
    };
  }

  async requestPasswordReset(payload: RequestPasswordResetDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      return { message: 'If the account exists, a reset link has been issued.' };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expirationMinutes = Number(
      this.configService.get<string>('PASSWORD_RESET_TOKEN_EXPIRES_MINUTES', '15'),
    );

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000),
      },
    });

    // In production, send the raw token through email/SMS and do not return it.
    return { message: 'If the account exists, a reset link has been issued.' };
  }

  async confirmPasswordReset(payload: ConfirmPasswordResetDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(payload.token);

    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        usedAt: true,
        expiresAt: true,
      },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid reset token.');
    }

    if (tokenRecord.usedAt) {
      throw new BadRequestException('Reset token has already been used.');
    }

    if (tokenRecord.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Reset token has expired.');
    }

    const passwordHash = await hash(payload.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Password has been reset successfully.' };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
