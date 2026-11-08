import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;
  private readonly verificationTtlMinutes: number;
  private readonly passwordResetTtlMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.verificationTtlMinutes = Number(
      this.configService.get('EMAIL_VERIFICATION_TOKEN_TTL_MINUTES', '30'),
    );

    if (
      !Number.isInteger(this.verificationTtlMinutes) ||
      this.verificationTtlMinutes < 1
    ) {
      throw new Error(
        'EMAIL_VERIFICATION_TOKEN_TTL_MINUTES must be a positive integer.',
      );
    }

    const passwordResetTtlMinutes = Number(
      this.configService.get('PASSWORD_RESET_TOKEN_TTL_MINUTES', '15'),
    );

    if (
      !Number.isInteger(passwordResetTtlMinutes) ||
      passwordResetTtlMinutes < 1
    ) {
      throw new Error(
        'PASSWORD_RESET_TOKEN_TTL_MINUTES must be a positive integer.',
      );
    }

    this.passwordResetTtlMinutes = passwordResetTtlMinutes;
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();

    // 1. Validate that the selected department exists and is active.
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
      select: {
        id: true,
        name: true,
        isActive: true,
        faculty: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!department || !department.isActive) {
      throw new BadRequestException(
        'The selected department does not exist or is inactive.',
      );
    }

    // 2. Check whether the email is already registered.
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists.');
    }

    // 3. Hash the password before saving it.
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    // 4. Generate a secure email-verification token.
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date(
      Date.now() + this.verificationTtlMinutes * 60 * 1000,
    );

    let user: {
      id: string;
      fullName: string;
      email: string;
      role: string;
      isActive: boolean;
      departmentId: string | null;
      createdAt: Date;
    };

    try {
      // 5. Create the account and associate it with the department.
      user = await this.prisma.user.create({
        data: {
          fullName,
          email,
          passwordHash,
          departmentId: department.id,

          // Never accept the user's role from the request.
          emailVerificationTokenHash: tokenHash,
          emailVerificationTokenExpiresAt: expiresAt,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          departmentId: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'The selected department is no longer available.',
        );
      }

      throw new InternalServerErrorException('Unable to create the account.');
    }

    // 6. Send the verification email.
    await this.emailService.sendVerificationEmail(
      user.email,
      user.fullName,
      rawToken,
    );

    return {
      message:
        'Registration successful. Check your email for the verification link.',
      user: {
        ...user,
        faculty: department.faculty,
      },
    };
  }

  async verifyEmail(token: string) {
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      throw new BadRequestException(
        'The verification link is invalid or has expired.',
      );
    }

    const tokenHash = this.hashToken(token);
    const now = new Date();

    const user = await this.prisma.user.findUnique({
      where: {
        emailVerificationTokenHash: tokenHash,
      },
      select: {
        id: true,
        emailVerifiedAt: true,
        emailVerificationTokenExpiresAt: true,
      },
    });

    if (
      !user ||
      user.emailVerifiedAt ||
      !user.emailVerificationTokenExpiresAt ||
      user.emailVerificationTokenExpiresAt <= now
    ) {
      throw new BadRequestException(
        'The verification link is invalid or has expired.',
      );
    }

    // Conditional update prevents a token from being used twice,
    // including when two verification requests arrive together.
    const result = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        emailVerifiedAt: null,
        emailVerificationTokenHash: tokenHash,
        emailVerificationTokenExpiresAt: { gt: now },
      },
      data: {
        emailVerifiedAt: now,
        emailVerificationTokenHash: null,
        emailVerificationTokenExpiresAt: null,
      },
    });

    if (result.count !== 1) {
      throw new BadRequestException(
        'The verification link is invalid or has expired.',
      );
    }

    return {
      message:
        'Email verified successfully. You can now log in if your account is active.',
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async resendVerification(emailAddress: string) {
    const email = emailAddress.trim().toLowerCase();

    const genericResponse = {
      message:
        'If an unverified account exists for this email, a verification link will be sent.',
    };

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        emailVerifiedAt: true,
      },
    });

    // Do not reveal whether an account exists or is already verified.
    if (!user || user.emailVerifiedAt) {
      return genericResponse;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date(
      Date.now() + this.verificationTtlMinutes * 60 * 1000,
    );

    // Replace the previous token and prevent concurrent resends
    // from overwriting a token after another request has verified it.
    const result = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        emailVerifiedAt: null,
      },
      data: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationTokenExpiresAt: expiresAt,
      },
    });

    if (result.count !== 1) {
      return genericResponse;
    }

    await this.emailService.sendVerificationEmail(
      user.email,
      user.fullName,
      rawToken,
    );

    return genericResponse;
  }

  async forgotPassword(emailAddress: string) {
    const email = emailAddress.trim().toLowerCase();

    const response = {
      message:
        'If an eligible account exists for this email, password-reset instructions will be sent.',
    };

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    // Do not reveal whether an account exists, is verified, or is active.
    if (!user || !user.isActive || !user.emailVerifiedAt) {
      return response;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date(
      Date.now() + this.passwordResetTtlMinutes * 60 * 1000,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: expiresAt,
      },
    });

    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.fullName,
        rawToken,
      );
    } catch {
      // Avoid exposing account existence through email delivery failures.
      // The EmailService already logs a generic delivery failure.
      // Remove this token if it is still the current token.
      await this.prisma.user.updateMany({
        where: {
          id: user.id,
          passwordResetTokenHash: tokenHash,
        },
        data: {
          passwordResetTokenHash: null,
          passwordResetTokenExpiresAt: null,
        },
      });

      return response;
    }

    return response;
  }

  async resetPassword(token: string, newPassword: string) {
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      throw new BadRequestException(
        'The password-reset link is invalid or has expired.',
      );
    }

    const tokenHash = this.hashToken(token);
    const now = new Date();

    const user = await this.prisma.user.findUnique({
      where: {
        passwordResetTokenHash: tokenHash,
      },
      select: {
        id: true,
        passwordResetTokenExpiresAt: true,
      },
    });

    if (
      !user ||
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt <= now
    ) {
      throw new BadRequestException(
        'The password-reset link is invalid or has expired.',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);

    // Consume the token and change the password in one transaction.
    // Only one concurrent request can consume the same token.
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.user.updateMany({
        where: {
          id: user.id,
          passwordResetTokenHash: tokenHash,
          passwordResetTokenExpiresAt: { gt: now },
        },
        data: {
          passwordResetTokenHash: null,
          passwordResetTokenExpiresAt: null,
        },
      });

      if (consumed.count !== 1) {
        throw new BadRequestException(
          'The password-reset link is invalid or has expired.',
        );
      }

      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    });

    return {
      message:
        'Password reset successfully. Please log in with your new password.',
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    // 1. Find the account by normalized email.
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    // 2. Use the same response for an unknown email or wrong password.
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Require email verification.
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    // 4. Reject disabled accounts.
    if (!user.isActive) {
      throw new UnauthorizedException('Your account is inactive');
    }

    // 5. Issue an access token compatible with JwtAuthGuard.
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenType: 'access',
    });

    // 6. Return safe user information, never the password hash.
    return {
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }
}
