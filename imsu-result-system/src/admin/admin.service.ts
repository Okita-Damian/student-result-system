import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, UserRole } from 'src/generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin-dto';

@Injectable()
export class AdminsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAdmin(dto: CreateAdminDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException(
        'An account with this email address already exists.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const admin = await this.prisma.user.create({
        data: {
          fullName: dto.fullName.trim(),
          email,
          passwordHash,
          role: UserRole.ADMIN,
          isActive: true,
          emailVerifiedAt: new Date(),
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      });

      return {
        message: 'Administrator created successfully.',
        admin,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email address already exists.',
        );
      }

      throw error;
    }
  }
}
