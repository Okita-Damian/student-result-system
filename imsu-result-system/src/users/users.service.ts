import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateStudentLevelDto } from './dto/update-student-level.dto';
import { ListUsersDto } from './dto/list-users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    return user;
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    if (
      dto.fullName === undefined &&
      dto.currentPassword === undefined &&
      dto.newPassword === undefined
    ) {
      throw new BadRequestException('Provide at least one field to update.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account is inactive.');
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.fullName !== undefined) {
      const fullName = dto.fullName.trim();

      if (fullName.length < 2) {
        throw new BadRequestException(
          'Full name must contain at least 2 characters.',
        );
      }

      data.fullName = fullName;
    }

    if (dto.newPassword !== undefined) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Current password is required to change your password.',
        );
      }

      const passwordMatches = await bcrypt.compare(
        dto.currentPassword,
        user.passwordHash,
      );

      if (!passwordMatches) {
        throw new UnauthorizedException('Current password is incorrect.');
      }

      if (dto.currentPassword === dto.newPassword) {
        throw new BadRequestException(
          'The new password must differ from the current password.',
        );
      }

      data.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User account not found.');
      }

      throw error;
    }
  }

  async deleteMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    const uploadedSheets = await this.prisma.resultSheet.count({
      where: { uploadedById: userId },
    });

    if (uploadedSheets > 0) {
      throw new ConflictException(
        'Your account cannot be deleted while you have uploaded result sheets. Contact an administrator for assistance.',
      );
    }

    try {
      await this.prisma.user.delete({
        where: { id: userId },
      });

      return { message: 'Your account has been deleted successfully.' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Your account is associated with existing records and cannot be deleted.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User account not found.');
      }

      throw error;
    }
  }

  async getAllUsers(query: ListUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.UserWhereInput = query.role ? { role: query.role } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminDeleteUser(targetUserId: string, requestingUserId: string) {
    if (targetUserId === requestingUserId) {
      throw new BadRequestException(
        'Use DELETE /users/me to delete your own account.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    const uploadedSheets = await this.prisma.resultSheet.count({
      where: { uploadedById: targetUserId },
    });

    if (uploadedSheets > 0) {
      throw new ConflictException(
        'This user has uploaded result sheets. The account cannot be deleted while those records exist.',
      );
    }

    try {
      await this.prisma.user.delete({
        where: { id: targetUserId },
      });

      return {
        message: 'User account deleted successfully.',
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'This user is associated with records that prevent deletion.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User account not found.');
      }

      throw error;
    }
  }

  async updateStudentLevel(userId: string, dto: UpdateStudentLevelDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    if (user.role !== 'STUDENT') {
      throw new ForbiddenException(
        'Only students can select their academic level.',
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException('Your account is inactive.');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        'Verify your email before selecting your academic level.',
      );
    }

    const allowedLevels = [100, 200, 300, 400, 500, 600, 700];

    if (!allowedLevels.includes(dto.level)) {
      throw new BadRequestException('Invalid academic level.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { level: dto.level },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        level: true,
      },
    });
  }
}
